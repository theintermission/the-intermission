import Parser from "rss-parser";

export type RssItem = {
  title: string;
  url: string;
  content: string;
  publishedAt?: Date;
};

const parser = new Parser({
  timeout: 15_000,
  headers: { "User-Agent": "IntermissionBot/0.1 (+https://theintermission.app/bot)" },
});

/**
 * Fetch and parse an RSS or Atom feed.
 * Returns the most recent N items, optionally filtered to a time window.
 */
export async function fetchRssFeed(
  feedUrl: string,
  options: { maxItems?: number; sinceHours?: number } = {},
): Promise<RssItem[]> {
  const { maxItems = 5, sinceHours = 36 } = options;

  const feed = await parser.parseURL(feedUrl);
  const cutoff = Date.now() - sinceHours * 60 * 60 * 1000;

  return feed.items
    .map((item) => {
      const publishedAt = item.isoDate ? new Date(item.isoDate) : undefined;
      return {
        title: item.title ?? "(untitled)",
        url: item.link ?? "",
        content: item.contentSnippet ?? item.content ?? item.summary ?? "",
        publishedAt,
      } satisfies RssItem;
    })
    .filter((i) => i.url)
    .filter((i) => !i.publishedAt || i.publishedAt.getTime() >= cutoff)
    .slice(0, maxItems);
}
