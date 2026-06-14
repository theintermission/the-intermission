import Parser from "rss-parser";
import { convert } from "html-to-text";

/**
 * Verbatim feed fetcher.
 * ──────────────────────
 * For feeds you want to read IN FULL (not summarised) — e.g. a favourite
 * Substack. Unlike the summarising path, this pulls the entire post body.
 *
 * Rule: only include a post if its most recent entry was published within
 * the freshness window (default 24h). If the latest post is older, the
 * feed contributes nothing that day — keeping the section timely.
 *
 * Substack (and most full-text feeds) put the complete post HTML in the
 * `content:encoded` element. We read that, then convert the HTML into clean
 * paragraph text suitable for an e-reader. If only a summary is available,
 * we fall back to it but flag that the post may be truncated.
 */

export type VerbatimPost = {
  feedName: string;
  title: string;
  url: string;
  author?: string;
  publishedAt: Date;
  /** Clean plain-text paragraphs of the full post */
  paragraphs: string[];
  /** True if we only had a summary, not the full body */
  possiblyTruncated: boolean;
};

// Extend the parser to expose the full-content fields explicitly.
type FullItem = {
  title?: string;
  link?: string;
  isoDate?: string;
  creator?: string;
  "content:encoded"?: string;
  content?: string;
  contentSnippet?: string;
};

const parser: Parser<unknown, FullItem> = new Parser({
  timeout: 20_000,
  headers: { "User-Agent": "IntermissionBot/0.1 (+https://theintermission.app/bot)" },
  customFields: {
    item: [["content:encoded", "content:encoded"]],
  },
});

export async function fetchVerbatimPost(
  feedUrl: string,
  feedName: string,
  options: { freshnessHours?: number } = {},
): Promise<VerbatimPost | null> {
  const feed = await parser.parseURL(feedUrl);
  return extractLatestPost(feed.items as FullItem[], feedName, options);
}

/** Testable core: takes already-parsed items, applies freshness + cleaning. */
export function extractLatestPost(
  items: FullItem[],
  feedName: string,
  options: { freshnessHours?: number } = {},
): VerbatimPost | null {
  const { freshnessHours = 24 } = options;

  const feed = { items };
  if (!feed.items || feed.items.length === 0) return null;

  // Find the most recent item by date
  const sorted = [...feed.items]
    .filter((i) => i.isoDate)
    .sort((a, b) => new Date(b.isoDate!).getTime() - new Date(a.isoDate!).getTime());

  const latest = sorted[0] ?? feed.items[0];
  if (!latest) return null;

  const publishedAt = latest.isoDate ? new Date(latest.isoDate) : undefined;
  if (!publishedAt) return null;

  // Freshness gate: only include if within the window
  const cutoff = Date.now() - freshnessHours * 60 * 60 * 1000;
  if (publishedAt.getTime() < cutoff) return null;

  // Prefer the full encoded content; fall back to summary
  const rawHtml = latest["content:encoded"] || latest.content || "";
  const possiblyTruncated = !latest["content:encoded"];

  const text = convert(rawHtml, {
    wordwrap: false,
    selectors: [
      // Drop images, subscribe widgets, and share buttons — noise on e-ink
      { selector: "img", format: "skip" },
      { selector: "a", options: { ignoreHref: true } },
      // Substack wraps subscription prompts in these; skip the common ones
      { selector: ".subscription-widget-wrap", format: "skip" },
      { selector: ".button-wrapper", format: "skip" },
      { selector: "hr", format: "skip" },
    ],
  });

  // Split into clean paragraphs: collapse whitespace, drop empties and
  // obvious boilerplate lines.
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 0)
    .filter((p) => !isBoilerplate(p));

  if (paragraphs.length === 0) return null;

  return {
    feedName,
    title: latest.title ?? "(untitled)",
    url: latest.link ?? "",
    author: latest.creator,
    publishedAt,
    paragraphs,
    possiblyTruncated,
  };
}

// Common Substack/newsletter footer lines worth dropping from a clean read.
function isBoilerplate(p: string): boolean {
  const low = p.toLowerCase();
  return (
    low.includes("thanks for reading") ||
    low.includes("subscribe") && p.length < 120 ||
    low.includes("share this post") ||
    low.startsWith("leave a comment") ||
    low.includes("upgrade to paid") ||
    low === "share"
  );
}
