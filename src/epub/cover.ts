import path from "node:path";
import sharp from "sharp";

// Point fontconfig at our bundled brand fonts BEFORE sharp initializes its
// SVG renderer. Production (GitHub Actions) and dev both pick these up.
if (!process.env.FONTCONFIG_PATH) {
  process.env.FONTCONFIG_PATH = path.join(process.cwd(), "assets");
}
import type { DailyIllustration } from "../sources/illustration";

/**
 * Composes the EPUB cover image — this is what appears as the book
 * thumbnail in the Kindle library. White ground, stacked masthead,
 * date, and the daily Met drawing.
 *
 * Built as an SVG (text + embedded fonts + embedded illustration)
 * rasterized by sharp. Brand fonts are embedded as data URIs so the
 * cover renders identically on any machine; if the renderer can't
 * load them it falls back to a system serif.
 *
 * Kindle cover spec: 1.6:1 portrait, ≥1000px on the short side.
 */

const COVER_W = 1200;
const COVER_H = 1920;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function buildCoverImage(opts: {
  brand?: string;
  dateLong: string; // "Wednesday, 10 June 2026"
  issueNumber: number;
  illustration?: DailyIllustration;
}): Promise<Buffer> {
  const { brand = "The Intermission", dateLong, issueNumber, illustration } = opts;
  const main = brand.startsWith("The ") ? brand.slice(4) : brand;
  const hasThe = brand.startsWith("The ");

  // Illustration band: center it in the lower-middle of the cover
  let illusTag = "";
  if (illustration) {
    const maxW = 880;
    const maxH = 700;
    let w = maxW;
    let h = w * illustration.aspectRatio;
    if (h > maxH) {
      h = maxH;
      w = h / illustration.aspectRatio;
    }
    const x = (COVER_W - w) / 2;
    const y = 880;
    illusTag = `<image x="${x}" y="${y}" width="${w}" height="${h}" href="${illustration.dataUri}" />
      <text x="${COVER_W / 2}" y="${y + h + 56}" class="caption">${esc(truncate(illustration.caption, 72))}</text>`;
  }

  const svg = `<svg width="${COVER_W}" height="${COVER_H}" viewBox="0 0 ${COVER_W} ${COVER_H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <style>
      .eyebrow { font-family: "Fraunces", Georgia, serif; font-weight: bold; font-size: 34px; letter-spacing: 12px; fill: #6b6b6b; text-anchor: middle; }
      .the { font-family: "Fraunces", Georgia, serif; font-style: italic; font-size: 76px; fill: #111; text-anchor: middle; }
      .masthead { font-family: "Fraunces", Georgia, serif; font-weight: bold; font-size: ${main.length > 10 ? 148 : 188}px; letter-spacing: -4px; fill: #111; text-anchor: middle; }
      .date { font-family: "Fraunces", Georgia, serif; font-style: italic; font-size: 52px; fill: #2e2e2e; text-anchor: middle; }
      .issue { font-family: "Fraunces", Georgia, serif; font-weight: bold; font-size: 32px; letter-spacing: 8px; fill: #6b6b6b; text-anchor: middle; }
      .caption { font-family: "EB Garamond", Georgia, serif; font-style: italic; font-size: 30px; fill: #6b6b6b; text-anchor: middle; }
      .tagline { font-family: "Fraunces", Georgia, serif; font-style: italic; font-size: 38px; fill: #6b6b6b; text-anchor: middle; }
    </style>
  </defs>

  <rect width="${COVER_W}" height="${COVER_H}" fill="#ffffff" />

  <text x="${COVER_W / 2}" y="170" class="eyebrow">A DAILY BRIEFING</text>
  ${hasThe ? `<text x="${COVER_W / 2}" y="330" class="the">The</text>` : ""}
  <text x="${COVER_W / 2}" y="${hasThe ? 500 : 420}" class="masthead">${esc(main)}</text>

  <rect x="${COVER_W / 2 - 70}" y="585" width="140" height="4" fill="#111" />

  <text x="${COVER_W / 2}" y="700" class="date">${esc(dateLong)}</text>
  <text x="${COVER_W / 2}" y="772" class="issue">NO. ${issueNumber.toString().padStart(3, "0")}</text>

  ${illusTag}

  <text x="${COVER_W / 2}" y="${COVER_H - 100}" class="tagline">A moment of calm in a busy world.</text>
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…";
}
