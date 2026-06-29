/**
 * The Intermission — your personal configuration.
 * ─────────────────────────────────────
 * This file replaces the entire multi-user database. Edit it, commit it,
 * and tomorrow's briefing reflects it.
 *
 * (Secrets do NOT go here — they live in .env locally and GitHub Secrets
 * in CI. This file is safe to commit.)
 */

export type IntermissionConfig = {
  /** Your @kindle.com address. Find it at amazon.co.uk → Manage Your Content and Devices → Preferences → Personal Document Settings */
  kindleEmail: string;

  /** IANA timezone — used for the issue date and date formatting */
  timezone: string;

  /** Used to compute the issue number (days since this date) */
  startDate: string; // YYYY-MM-DD

  /** Briefing length */
  length: "short" | "standard" | "long";

  /**
   * Delivery format.
   * - "epub" (recommended): reflowable, cover thumbnail in your Kindle
   *   library, chapter navigation, on-device font size control
   * - "pdf": fixed magazine layout, exact typography, no reflowing
   */
  format: "epub" | "pdf";

  /** Include the Quiet Section (poem/quote/reflection)? */
  includeQuietSection: boolean;

  /** Your interests — steers what the synthesis prioritizes */
  interestTags: string[];

  /** RSS / Substack / blog feeds — your personal reading list */
  feeds: Array<{ name: string; url: string }>;

  /** News feeds — same mechanism, but routed to "The World" section */
  newsFeeds: Array<{ name: string; url: string }>;

  /**
   * Verbatim feeds — read IN FULL, not summarised. If a feed's most recent
   * post is within the last 24 hours, the whole post is included in a
   * "Worth Reading in Full" section after The Long Read. If the latest post
   * is older than that, the feed contributes nothing that day.
   * Best for a small number of favourite long-form newsletters.
   */
  verbatimFeeds: Array<{ name: string; url: string }>;

  /** Gmail ingestion — set enabled: false to skip entirely */
  gmail: {
    enabled: boolean;
    /** How many recent emails to consider */
    maxItems: number;
    /** Hours back to look */
    sinceHours: number;
  };

  /** Daily cover illustration from the Met Museum's public-domain collection */
  illustration: {
    enabled: boolean;
  };
};

export const config: IntermissionConfig = {
  kindleEmail: "jimmy.felstead_2p7ixI@kindle.com", // ← CHANGE ME

  timezone: "Europe/London",

  startDate: "2026-06-10",

  length: "standard",

  format: "epub",

  includeQuietSection: true,

  interestTags: ["technology", "startups", "ai", "design"],

  feeds: [
    // Your personal reading list. A few starters — edit freely:
    { name: "Google Research", url: "https://research.google/blog/rss/" },
    { name: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
    { name: "Wired", url: "https://www.wired.com/feed/rss" },
    { name: "Nautilus", url: "https://nautil.us/feed/"},
    { name: "Neuroscience News", url: "http://neurosciencenews.com/feed/"},
  ],

  newsFeeds: [
    { name: "BBC News", url: "https://feeds.bbci.co.uk/news/rss.xml" },
    { name: "The Independent", url: "https://www.independent.co.uk/news/uk/rss" },
    { name: "Sky News", url: "https://feeds.skynews.com/feeds/rss/home.xml" },
    { name: "Guardian UK", url: "https://www.theguardian.com/uk/rss" },
  ],

  verbatimFeeds: [
    { name: "Big Technology", url: "https://www.bigtechnology.com/feed" },
    { name: "Nesslabs", url: "https://nesslabs.com/feed" },
    { name: "Sunday Wisdom", url: "https://coffeeandjunk.substack.com/feed" },
  ],

  gmail: {
    enabled: false, // flip to true after running: npm run gmail:auth
    maxItems: 8,
    sinceHours: 36,
  },

  illustration: {
    enabled: true, // a daily drawing from the Met on the cover
  },
};
