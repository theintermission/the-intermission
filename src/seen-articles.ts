import fs from "node:fs";
import path from "node:path";

/**
 * Seen-article store.
 * ───────────────────
 * Remembers every article URL that has appeared in a past issue, so the
 * same piece never features twice — even when a slow-updating feed keeps
 * showing it in its RSS for days.
 *
 * Stored as a JSON file (.seen-articles.json) in the project root, committed
 * by the GitHub Action after each run so the memory persists across days.
 * (See the workflow note in the README about committing this file.)
 *
 * URLs are normalised before comparison so trivial differences — trailing
 * slashes, UTM tracking parameters, http vs https — don't cause the same
 * article to slip through as "new".
 *
 * Design notes:
 *  - "Forever" retention: we keep all seen URLs. The file grows slowly
 *    (a few dozen URLs a day, each ~60 bytes) — years of use is well under
 *    a megabyte, so there's no practical need to prune. A cap is provided
 *    anyway as a safety valve.
 *  - If the file can't be read/written (read-only env), dedupe degrades
 *    gracefully to "no memory" rather than crashing the run.
 */

const SEEN_FILE = path.join(process.cwd(), ".seen-articles.json");
const MAX_REMEMBERED = 5000; // safety cap; ample for years of daily issues

export class SeenArticles {
  private seen: Set<string>;

  constructor() {
    this.seen = new Set(readSeen());
  }

  /** Has this article URL been featured before? */
  has(url: string): boolean {
    return this.seen.has(normalizeUrl(url));
  }

  /** Mark an article URL as featured. */
  add(url: string): void {
    this.seen.add(normalizeUrl(url));
  }

  /** Persist to disk. Call once at the end of a successful run. */
  save(): void {
    // Keep the most recent MAX_REMEMBERED if we ever exceed the cap.
    let list = [...this.seen];
    if (list.length > MAX_REMEMBERED) {
      list = list.slice(list.length - MAX_REMEMBERED);
    }
    writeSeen(list);
  }

  get size(): number {
    return this.seen.size;
  }
}

/**
 * Normalise a URL for stable comparison:
 *  - lowercase host
 *  - strip tracking query params (utm_*, ref, source, etc.)
 *  - drop trailing slash and fragment
 *  - treat http/https as equivalent
 */
export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    u.protocol = "https:";
    u.hash = "";
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
    const stripPrefixes = ["utm_", "ref", "source", "fbclid", "gclid", "mc_"];
    const keep: Array<[string, string]> = [];
    u.searchParams.forEach((value, key) => {
      const k = key.toLowerCase();
      if (!stripPrefixes.some((p) => k === p || k.startsWith(p))) {
        keep.push([key, value]);
      }
    });
    u.search = "";
    keep.sort(([a], [b]) => a.localeCompare(b));
    for (const [k, v] of keep) u.searchParams.append(k, v);
    let out = u.toString();
    out = out.replace(/\/$/, ""); // drop trailing slash
    return out;
  } catch {
    // Not a parseable URL — fall back to a trimmed lowercase string
    return raw.trim().toLowerCase().replace(/\/$/, "");
  }
}

function readSeen(): string[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(SEEN_FILE, "utf8"));
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeSeen(list: string[]): void {
  try {
    fs.writeFileSync(SEEN_FILE, JSON.stringify(list, null, 0));
  } catch {
    // Read-only environment — skip persistence this run.
  }
}
