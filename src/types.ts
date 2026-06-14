/**
 * Shared types. In the Phase 2 consumer app these live in the DB schema;
 * here they're standalone.
 */

export type VerbatimSection = {
  feedName: string;
  title: string;
  url: string;
  author?: string;
  paragraphs: string[];
  possiblyTruncated: boolean;
};

export type BriefingSections = {
  briefing: string;
  inbox: Array<{ source: string; summary: string }>;
  world: Array<{ headline: string; summary: string; sourceUrl: string }>;
  interests: Array<{ headline: string; summary: string; sourceUrl: string }>;
  longRead: { title: string; body: string; sourceUrl: string };
  quietSection: { kind: "poem" | "quote" | "reflection"; body: string; attribution?: string };
  tomorrow?: string;
  verbatim?: VerbatimSection[];
};
