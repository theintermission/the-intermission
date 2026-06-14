import { anthropic, MODELS } from "./client";
import type { BriefingSections } from "../types";

/**
 * Stage B: Final per-user synthesis (Sonnet).
 *
 * Takes pre-summarized items from Stage A + user preferences and produces
 * the final structured briefing as JSON. This is the expensive stage but
 * runs only ONCE per user per day.
 */

export type SynthesizeInput = {
  userTags: string[];
  briefingLength: "short" | "standard" | "long";
  includeQuietSection: boolean;
  date: string; // YYYY-MM-DD for context
  inboxItems: Array<{ source: string; summary: string; tags: string[] }>;
  newsItems: Array<{
    headline: string;
    summary: string;
    sourceUrl: string;
    tags: string[];
  }>;
  interestItems: Array<{
    headline: string;
    summary: string;
    sourceUrl: string;
    tags: string[];
  }>;
};

export type SynthesizeOutput = {
  title: string;
  sections: BriefingSections;
  inputTokens: number;
  outputTokens: number;
};

function lengthGuidance(length: "short" | "standard" | "long"): string {
  switch (length) {
    case "short":
      return "Target ~1,500 words. Briefing opener ~120 words. Long Read body ~400 words.";
    case "long":
      return "Target ~4,000 words. Briefing opener ~280 words. Long Read body ~900 words.";
    default:
      return "Target ~2,800 words. Briefing opener ~200 words. Long Read body ~650 words.";
  }
}

const SYSTEM_PROMPT = `You are the editor of a daily reading digest called The Intermission — a calm, considered briefing delivered to e-readers each morning. Your readers are thoughtful people who have stepped back from doomscrolling.

Your editorial voice:
- Calm, never urgent
- Substance over speculation
- Plain English, no jargon, no buzzwords
- No marketing language ("game-changer", "revolutionary", "breaking")
- First-person plural sparingly ("we") — feels like a trusted weekly columnist
- Treat the reader as intelligent

Your job: take pre-summarized items from various sources, choose what matters, and shape them into the structured sections of today's issue.

You MUST respond with valid JSON matching this exact shape:

{
  "title": "string — a brief evocative title for this issue, e.g. 'The Tuesday Issue' or 'A Quiet Week Resumes'",
  "sections": {
    "briefing": "string — one flowing paragraph giving the reader the day in broad strokes. Connect threads. No bullets.",
    "inbox": [{ "source": "string", "summary": "string" }],
    "world": [{ "headline": "string", "summary": "string", "sourceUrl": "string" }],
    "interests": [{ "headline": "string", "summary": "string", "sourceUrl": "string" }],
    "longRead": {
      "title": "string",
      "body": "string — the featured piece, written as flowing prose with paragraphs separated by \\n\\n",
      "sourceUrl": "string"
    },
    "quietSection": {
      "kind": "poem" | "quote" | "reflection",
      "body": "string",
      "attribution": "string (optional)"
    },
    "tomorrow": "string (optional) — one sentence on what's ahead"
  }
}

Editorial rules:
- Pick the 3–5 most worth reading items for "world" — don't include everything
- "world" and "interests" summaries are brisk briefs: 40–60 words each. They render in narrow magazine columns — longer text breaks the layout. Depth belongs in the Long Read.
- "inbox" summaries: 40–70 words each.
- "interests" items should match the reader's tags more closely than the world section
- "longRead" should be ONE piece, chosen for being the most worth sitting with. Rewrite the source summary into a 400–900 word flowing essay (per length guidance). It's fine to take an editorial angle.
- "quietSection" must be a poem, a literary quote, or a short reflection. NEVER a news item. This is the soul of the issue. Choose something seasonally and tonally appropriate. If you can't think of one, use a brief reflection on the day's theme.
- If a section has no good content, return an empty array for it (don't pad).
- Never invent facts. Use only what the summaries provide.`;

export async function synthesizeBriefing(input: SynthesizeInput): Promise<SynthesizeOutput> {
  const userMessage = `Today is ${input.date}.

Reader's interest tags: ${input.userTags.length > 0 ? input.userTags.join(", ") : "(none specified)"}.

Length: ${lengthGuidance(input.briefingLength)}

Quiet Section: ${input.includeQuietSection ? "include" : "skip (omit from output)"}

— INBOX ITEMS (${input.inboxItems.length}) —
${input.inboxItems.map((i, idx) => `[${idx + 1}] ${i.source}\n${i.summary}\nTags: ${i.tags.join(", ")}`).join("\n\n")}

— NEWS ITEMS (${input.newsItems.length}) —
${input.newsItems.map((i, idx) => `[${idx + 1}] ${i.headline}\n${i.sourceUrl}\n${i.summary}\nTags: ${i.tags.join(", ")}`).join("\n\n")}

— INTEREST ITEMS (${input.interestItems.length}) —
${input.interestItems.map((i, idx) => `[${idx + 1}] ${i.headline}\n${i.sourceUrl}\n${i.summary}\nTags: ${i.tags.join(", ")}`).join("\n\n")}

Now produce today's issue as JSON.`;

  const response = await anthropic.messages.create({
    model: MODELS.SYNTHESIZE,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("");

  const cleaned = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned) as {
    title: string;
    sections: BriefingSections;
  };

  return {
    title: parsed.title,
    sections: parsed.sections,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}
