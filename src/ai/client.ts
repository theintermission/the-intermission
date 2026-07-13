import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is not set");
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Model selection.
// Update these strings if Anthropic releases newer models.
// Haiku is for cheap per-item summaries; Sonnet for the final synthesis.
export const MODELS = {
  SUMMARIZE: "claude-sonnet-5",
  SYNTHESIZE: "claude-sonnet-5",
} as const;
