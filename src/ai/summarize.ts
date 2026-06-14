import { anthropic, MODELS } from "./client";

/**
 * Stage A: Per-item summarization (Haiku).
 *
 * Takes a raw article/email body and produces a short, calm summary.
 * This is the cheap stage — runs many times per pipeline.
 * For shared news, the result is cached in shared_news_items and
 * reused across all users.
 */

export type SummaryInput = {
  headline: string;
  body: string;
  sourceName?: string;
};

export type SummaryOutput = {
  summary: string;
  tags: string[];
  inputTokens: number;
  outputTokens: number;
};

const SYSTEM_PROMPT = `You are a calm, thoughtful summarizer for a daily reading digest.

Your task: produce a short summary of the article below.

Rules:
- 60–100 words
- Calm, factual, no breathless language
- No clickbait. No "you won't believe..."
- Plain prose, no bullet points or markdown
- Past tense for events
- Lead with the substance, not who said it
- Avoid duplicating the headline
- If the piece is opinion, signal that ("The author argues...")

Also produce 2–4 lowercase one-word topic tags (e.g. "climate", "tech", "ukraine").

Respond as JSON only, no preamble:
{
  "summary": "string",
  "tags": ["string", "string"]
}`;

export async function summarizeItem(input: SummaryInput): Promise<SummaryOutput> {
  const userMessage = [
    input.sourceName ? `Source: ${input.sourceName}` : null,
    `Headline: ${input.headline}`,
    "",
    "Article:",
    input.body.slice(0, 8000), // hard cap to keep token costs predictable
  ]
    .filter(Boolean)
    .join("\n");

  const response = await anthropic.messages.create({
    model: MODELS.SUMMARIZE,
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("");

  let parsed: { summary: string; tags: string[] };
  try {
    // Strip code fences if model wrapped output
    const cleaned = text.replace(/```json|```/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch (e) {
    // Fallback: treat whole response as summary
    parsed = { summary: text.trim(), tags: [] };
  }

  return {
    summary: parsed.summary,
    tags: parsed.tags ?? [],
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}
