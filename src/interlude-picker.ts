import fs from "node:fs";
import path from "node:path";
import { INTERLUDE_PASSAGES, type InterludePassage } from "./interludes";

/**
 * Picks one Interlude passage at random, avoiding the most recently used
 * ones so you don't see repeats day to day.
 *
 * "Recently used" is tracked in a tiny JSON file (.interlude-history.json)
 * in the project root. It stores a rolling list of the last N passage
 * indices. If the file can't be read or written (e.g. read-only CI), the
 * picker still works — it just falls back to pure random for that run.
 *
 * The avoidance window scales with the deck: we steer clear of roughly the
 * last third of passages seen, so a bigger collection means longer gaps
 * between repeats automatically.
 */

const HISTORY_FILE = path.join(process.cwd(), ".interlude-history.json");

export function pickInterlude(): InterludePassage {
  const total = INTERLUDE_PASSAGES.length;
  const avoidCount = Math.min(Math.floor(total / 3), total - 1);

  const recent = readHistory();
  const recentSet = new Set(recent.slice(-avoidCount));

  // Candidate pool = everything not seen recently
  let candidates: number[] = [];
  for (let i = 0; i < total; i++) {
    if (!recentSet.has(i)) candidates.push(i);
  }
  // Safety: if somehow everything is excluded, fall back to all
  if (candidates.length === 0) candidates = INTERLUDE_PASSAGES.map((_, i) => i);

  const choice = candidates[Math.floor(Math.random() * candidates.length)];

  writeHistory([...recent, choice].slice(-Math.max(avoidCount, 1)));

  return INTERLUDE_PASSAGES[choice];
}

function readHistory(): number[] {
  try {
    const raw = fs.readFileSync(HISTORY_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

function writeHistory(list: number[]): void {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(list));
  } catch {
    // Read-only environment — fine, we just skip persistence this run.
  }
}
