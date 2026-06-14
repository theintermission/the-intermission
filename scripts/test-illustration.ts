/**
 * Test: run a local image through the exact sharp pipeline used by
 * fetchDailyIllustration, then render the full briefing with it.
 * (The Met API itself can't be reached from this sandbox.)
 */
import fs from "node:fs";
import sharp from "sharp";

async function main() {
  const raw = fs.readFileSync("/tmp/test-drawing.jpg");

  // Identical processing to src/sources/illustration.ts
  const processed = await sharp(raw)
    .resize({ width: 900, withoutEnlargement: true })
    .grayscale()
    .normalize()
    .png()
    .toBuffer();

  const meta = await sharp(processed).metadata();
  const aspectRatio = meta.height! / meta.width!;

  const illustration = {
    dataUri: `data:image/png;base64,${processed.toString("base64")}`,
    caption: "Landscape with a Great Oak — after the manner of Constable, ca. 1820",
    aspectRatio,
  };

  fs.writeFileSync("/tmp/illustration.json", JSON.stringify(illustration));
  console.log(`Processed: ${meta.width}x${meta.height}, ratio ${aspectRatio.toFixed(2)}`);
}
main();
