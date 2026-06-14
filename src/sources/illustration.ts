import sharp from "sharp";

/**
 * Daily frontispiece illustration.
 * ────────────────────────────────
 * Source: The Metropolitan Museum of Art Open Access collection.
 *  - CC0 (public domain) — free to use, no attribution legally required
 *    (we caption it anyway, because it's the right thing to do)
 *  - Free API, no key, no signup: https://metmuseum.github.io
 *  - We search the Drawings and Prints department (id 9) — engravings,
 *    etchings, pencil and ink studies. Mostly monochrome. Perfect for e-ink.
 *
 * Selection is deterministic per date: the same day always picks the same
 * artwork (useful for reproducible re-runs), and themes rotate through the
 * week so Monday isn't always a landscape.
 *
 * The image is converted to grayscale and gently normalized for Kindle.
 */

export type DailyIllustration = {
  /** PNG as a data URI, ready for react-pdf <Image> */
  dataUri: string;
  /** e.g. "Study of Trees — John Constable, ca. 1821" */
  caption: string;
  /** Met object URL, kept for logging/curiosity */
  objectUrl: string;
  /** Aspect ratio (height / width) so the template can size it */
  aspectRatio: number;
};

const MET_API = "https://collectionapi.metmuseum.org/public/collection/v1";
const DRAWINGS_AND_PRINTS = 9;

/** Themes rotate by day so the frontispiece has variety across a week. */
const THEMES = [
  "landscape",
  "botanical",
  "architecture",
  "sea",
  "tree",
  "bird",
  "bridge",
  "garden",
  "mountain",
  "river",
  "study",
  "horse",
  "village",
  "harbor",
];

export async function fetchDailyIllustration(dateYmd: string): Promise<DailyIllustration> {
  const seed = hashString(dateYmd);
  const theme = THEMES[seed % THEMES.length];

  // 1. Search the Drawings and Prints department for today's theme
  const searchUrl = `${MET_API}/search?departmentId=${DRAWINGS_AND_PRINTS}&hasImages=true&q=${encodeURIComponent(theme)}`;
  const search = (await fetchJson(searchUrl)) as { total: number; objectIDs: number[] | null };
  if (!search.objectIDs || search.objectIDs.length === 0) {
    throw new Error(`Met search returned no results for theme "${theme}"`);
  }

  // 2. Walk candidates (starting from a date-seeded offset) until we find a
  //    public-domain object with an image. Usually succeeds first try.
  const candidates = search.objectIDs;
  const maxAttempts = Math.min(8, candidates.length);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const idx = (seed + attempt * 7919) % candidates.length; // 7919 = prime stride
    const objectId = candidates[idx];
    try {
      const obj = (await fetchJson(`${MET_API}/objects/${objectId}`)) as {
        isPublicDomain: boolean;
        primaryImageSmall: string;
        title: string;
        artistDisplayName: string;
        objectDate: string;
        objectURL: string;
      };

      if (!obj.isPublicDomain || !obj.primaryImageSmall) {
        continue;
      }

      // 3. Download and process for e-ink
      const imgResponse = await fetchWithTimeout(obj.primaryImageSmall);
      if (!imgResponse.ok) continue;
      const raw = Buffer.from(await imgResponse.arrayBuffer());

      const processed = await sharp(raw)
        .resize({ width: 900, withoutEnlargement: true })
        .grayscale()
        .normalize() // stretch contrast — pencil drawings often scan light
        .png()
        .toBuffer();

      const meta = await sharp(processed).metadata();
      const aspectRatio = meta.height && meta.width ? meta.height / meta.width : 0.75;

      // Skip extreme aspect ratios that would wreck the cover layout
      if (aspectRatio > 1.6 || aspectRatio < 0.35) continue;

      const caption = buildCaption(obj.title, obj.artistDisplayName, obj.objectDate);

      return {
        dataUri: `data:image/png;base64,${processed.toString("base64")}`,
        caption,
        objectUrl: obj.objectURL,
        aspectRatio,
      };
    } catch (e) {
      lastError = e as Error;
      continue;
    }
  }

  throw lastError ?? new Error("No suitable public-domain illustration found today");
}

function buildCaption(title: string, artist: string, date: string): string {
  const parts = [title || "Untitled"];
  const attribution = [artist, date].filter(Boolean).join(", ");
  if (attribution) parts.push(attribution);
  return parts.join(" — ");
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

async function fetchWithTimeout(url: string, ms = 15_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "IntermissionBot/0.1 (personal daily briefing)" },
    });
  } finally {
    clearTimeout(timer);
  }
}
