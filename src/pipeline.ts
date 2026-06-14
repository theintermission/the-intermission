/**
 * The daily pipeline.
 * ───────────────────
 * Run manually:        npm run briefing
 * Run without sending: npm run briefing:dry   (writes PDF to ./output instead)
 *
 * In CI, GitHub Actions runs this every morning (see .github/workflows/daily.yml).
 *
 * This replaces the entire Inngest orchestration from the consumer app with
 * one linear script — appropriate for a single user.
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { config } from "../intermission.config";
import { fetchRssFeed } from "./sources/rss";
import { fetchRecentEmails, extractSenderName } from "./sources/gmail";
import { summarizeItem } from "./ai/summarize";
import { synthesizeBriefing } from "./ai/synthesize";
import { pickInterlude } from "./interlude-picker";
import { SeenArticles } from "./seen-articles";
import { fetchVerbatimPost } from "./sources/verbatim";
import type { VerbatimSection } from "./types";
import { renderBriefingPdf } from "./pdf/render";
import { sendBriefingToKindle } from "./email/send";
import { fetchDailyIllustration, type DailyIllustration } from "./sources/illustration";
import { buildEpub } from "./epub/build";
import { buildCoverImage } from "./epub/cover";

const DRY_RUN = process.argv.includes("--dry");

async function main() {
  const t0 = Date.now();
  const issueDate = new Date().toLocaleDateString("en-CA", { timeZone: config.timezone });
  const issueNumber = daysBetween(config.startDate, issueDate) + 1;

  log(`The Intermission — issue #${issueNumber} for ${issueDate}${DRY_RUN ? " (dry run)" : ""}`);

  // Load the memory of articles already featured in past issues, so nothing
  // repeats — even when a slow feed keeps showing the same post for days.
  const seen = new SeenArticles();
  log(`Dedupe: ${seen.size} articles remembered from past issues`);

  // ─── 1. Fetch personal feeds ─────────────────────────────────────────
  log(`Fetching ${config.feeds.length} personal feeds…`);
  const interestItems: Array<{ headline: string; summary: string; sourceUrl: string; tags: string[] }> = [];
  for (const feed of config.feeds) {
    try {
      const items = await fetchRssFeed(feed.url, { maxItems: 3, sinceHours: 36 });
      const fresh = items.filter((i) => !seen.has(i.url));
      const skipped = items.length - fresh.length;
      log(`  ${feed.name}: ${fresh.length} new${skipped > 0 ? ` (${skipped} already seen)` : ""}`);
      for (const item of fresh) {
        const sum = await summarizeItem({ headline: item.title, body: item.content, sourceName: feed.name });
        interestItems.push({ headline: item.title, summary: sum.summary, sourceUrl: item.url, tags: sum.tags });
        seen.add(item.url);
      }
    } catch (e) {
      warn(`  ${feed.name} failed: ${(e as Error).message}`);
    }
  }

  // ─── 2. Fetch news feeds ─────────────────────────────────────────────
  log(`Fetching ${config.newsFeeds.length} news feeds…`);
  const newsItems: Array<{ headline: string; summary: string; sourceUrl: string; tags: string[] }> = [];
  for (const feed of config.newsFeeds) {
    try {
      const items = await fetchRssFeed(feed.url, { maxItems: 5, sinceHours: 36 });
      const fresh = items.filter((i) => !seen.has(i.url));
      const skipped = items.length - fresh.length;
      log(`  ${feed.name}: ${fresh.length} new${skipped > 0 ? ` (${skipped} already seen)` : ""}`);
      for (const item of fresh) {
        const sum = await summarizeItem({ headline: item.title, body: item.content, sourceName: feed.name });
        newsItems.push({ headline: item.title, summary: sum.summary, sourceUrl: item.url, tags: sum.tags });
        seen.add(item.url);
      }
    } catch (e) {
      warn(`  ${feed.name} failed: ${(e as Error).message}`);
    }
  }

  // ─── 3. Fetch Gmail (optional) ───────────────────────────────────────
  const inboxItems: Array<{ source: string; summary: string; tags: string[] }> = [];
  if (config.gmail.enabled) {
    log("Fetching Gmail…");
    try {
      const messages = await fetchRecentEmails({
        maxItems: config.gmail.maxItems,
        sinceHours: config.gmail.sinceHours,
      });
      log(`  ${messages.length} messages`);
      for (const msg of messages) {
        const sum = await summarizeItem({
          headline: msg.subject,
          body: msg.body || msg.snippet,
          sourceName: msg.sender,
        });
        inboxItems.push({ source: extractSenderName(msg.sender), summary: sum.summary, tags: sum.tags });
      }
    } catch (e) {
      warn(`  Gmail failed: ${(e as Error).message} — continuing without inbox`);
    }
  }

  const totalItems = interestItems.length + newsItems.length + inboxItems.length;
  if (totalItems === 0) {
    throw new Error("No content fetched from any source. Check your feeds and network.");
  }

  // ─── 4. Fetch the daily frontispiece (optional, non-fatal) ──────────
  let illustration: DailyIllustration | undefined;
  if (config.illustration.enabled) {
    log("Fetching daily illustration from the Met…");
    try {
      illustration = await fetchDailyIllustration(issueDate);
      log(`  "${illustration.caption}"`);
    } catch (e) {
      warn(`  Illustration failed: ${(e as Error).message} — continuing without`);
    }
  }

  // ─── 5. Synthesize ───────────────────────────────────────────────────
  log(`Synthesizing from ${totalItems} items…`);
  const synthesized = await synthesizeBriefing({
    userTags: config.interestTags,
    briefingLength: config.length,
    includeQuietSection: config.includeQuietSection,
    date: issueDate,
    inboxItems,
    newsItems,
    interestItems,
  });
  log(`  "${synthesized.title}" — ${synthesized.inputTokens} in / ${synthesized.outputTokens} out tokens`);

  // Replace the AI-generated Interlude with a verbatim public-domain passage
  // drawn at random from the bundled deck (avoids recent repeats). This
  // guarantees real text and real attribution rather than a model pastiche.
  if (config.includeQuietSection) {
    const passage = pickInterlude();
    synthesized.sections.quietSection = {
      kind: passage.kind === "prose" ? "reflection" : passage.kind === "philosophy" ? "reflection" : "quote",
      body: passage.body,
      attribution: passage.attribution,
    };
    log(`  Interlude: ${passage.attribution}`);
  }

  // Verbatim feeds — pull full posts published in the last 24h (non-fatal).
  if (config.verbatimFeeds && config.verbatimFeeds.length > 0) {
    log(`Checking ${config.verbatimFeeds.length} verbatim feed(s)…`);
    const verbatim: VerbatimSection[] = [];
    for (const feed of config.verbatimFeeds) {
      try {
        const post = await fetchVerbatimPost(feed.url, feed.name, { freshnessHours: 24 });
        if (post) {
          verbatim.push({
            feedName: post.feedName,
            title: post.title,
            url: post.url,
            author: post.author,
            paragraphs: post.paragraphs,
            possiblyTruncated: post.possiblyTruncated,
          });
          log(`  ${feed.name}: "${post.title}" (${post.paragraphs.length} paragraphs)`);
        } else {
          log(`  ${feed.name}: nothing in the last 24h`);
        }
      } catch (e) {
        warn(`  ${feed.name} verbatim fetch failed: ${(e as Error).message}`);
      }
    }
    if (verbatim.length > 0) synthesized.sections.verbatim = verbatim;
  }

  // ─── 6. Render ───────────────────────────────────────────────────────
  const dateLong = new Date(issueDate + "T00:00:00Z").toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });

  let fileBuffer: Buffer;
  let extension: string;

  if (config.format === "epub") {
    log("Composing cover…");
    const coverPng = await buildCoverImage({
      dateLong,
      issueNumber,
      illustration,
    });
    log("Building EPUB…");
    fileBuffer = await buildEpub({
      title: synthesized.title,
      issueDate,
      dateLong,
      issueNumber,
      sections: synthesized.sections,
      coverPng,
      frontispiecePng: illustration
        ? Buffer.from(illustration.dataUri.split(",")[1], "base64")
        : undefined,
      frontispieceCaption: illustration?.caption,
    });
    extension = "epub";
  } else {
    log("Rendering PDF…");
    fileBuffer = await renderBriefingPdf({
      title: synthesized.title,
      issueDate,
      issueNumber,
      sections: synthesized.sections,
      illustration,
    });
    extension = "pdf";
  }
  log(`  ${(fileBuffer.length / 1024).toFixed(0)} KB`);

  // ─── 7. Deliver or save ──────────────────────────────────────────────
  const filename = `The Intermission — ${issueDate}.${extension}`;
  if (DRY_RUN) {
    const outDir = path.join(process.cwd(), "output");
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, filename);
    fs.writeFileSync(outPath, fileBuffer);
    log(`Saved to ${outPath}`);
    log("(dry run — not recording articles as seen, so a real run still includes them)");
  } else {
    log(`Sending to ${config.kindleEmail}…`);
    await sendBriefingToKindle({ kindleEmail: config.kindleEmail, pdfBuffer: fileBuffer, filename });
    log("Delivered.");
    // Only now, after successful delivery, commit these articles to memory.
    seen.save();
    log(`Dedupe: ${seen.size} articles now remembered`);
  }

  log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

function daysBetween(fromYmd: string, toYmd: string): number {
  const from = new Date(fromYmd + "T00:00:00Z").getTime();
  const to = new Date(toYmd + "T00:00:00Z").getTime();
  return Math.max(0, Math.round((to - from) / 86_400_000));
}

function log(msg: string) {
  console.log(`[intermission] ${msg}`);
}
function warn(msg: string) {
  console.warn(`[intermission] ⚠ ${msg}`);
}

main().catch((err) => {
  console.error("[intermission] ✗ Pipeline failed:", err);
  process.exit(1);
});
