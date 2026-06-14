/** Test: build an EPUB from the same sample data, with composed cover. */
import fs from "node:fs";
import sharp from "sharp";
import { buildEpub } from "../src/epub/build";
import { buildCoverImage } from "../src/epub/cover";

async function main() {
  // Reuse the processed test illustration
  const ill = JSON.parse(fs.readFileSync("/tmp/illustration.json", "utf8"));

  const coverPng = await buildCoverImage({
    dateLong: "Wednesday, 10 June 2026",
    issueNumber: 1,
    illustration: { ...ill, objectUrl: "" },
  });
  fs.writeFileSync("/tmp/cover-test.png", coverPng);
  const meta = await sharp(coverPng).metadata();
  console.log(`cover: ${meta.width}x${meta.height}`);

  const sections = JSON.parse(fs.readFileSync("/tmp/sections.json", "utf8"));

  const epub = await buildEpub({
    title: "The Wednesday Issue",
    issueDate: "2026-06-10",
    dateLong: "Wednesday, 10 June 2026",
    issueNumber: 1,
    sections,
    coverPng,
    frontispiecePng: Buffer.from(ill.dataUri.split(",")[1], "base64"),
    frontispieceCaption: ill.caption,
  });

  fs.writeFileSync("output/sample.epub", epub);
  console.log(`epub: ${(epub.length / 1024).toFixed(0)} KB`);
}
main();
