import JSZip from "jszip";
import type { BriefingSections } from "../types";

/**
 * EPUB builder.
 * ─────────────
 * Assembles a valid EPUB3 (with NCX fallback for older readers) from the
 * day's briefing. Sent to a Kindle, Amazon converts it to its native
 * format on arrival: the cover becomes the library thumbnail, sections
 * become navigable chapters, and the reader controls font size.
 *
 * CSS is kept deliberately conversion-safe — Kindle's EPUB ingestion
 * supports a limited subset (no columns, no floats worth trusting).
 * The editorial voice is carried by structure and restraint instead.
 */

export type EpubInput = {
  brand?: string;
  title: string; // editor's issue title, e.g. "The Wednesday Issue"
  issueDate: string; // YYYY-MM-DD
  dateLong: string; // "Wednesday, 10 June 2026"
  issueNumber: number;
  sections: BriefingSections;
  coverPng: Buffer;
  /** Optional inline frontispiece (same drawing as cover) for the title page */
  frontispiecePng?: Buffer;
  frontispieceCaption?: string;
};

export async function buildEpub(input: EpubInput): Promise<Buffer> {
  const brand = input.brand ?? "The Intermission";
  const zip = new JSZip();
  const uid = `urn:intermission:${input.issueDate}`;

  // 1. mimetype — must be FIRST and STORED (uncompressed), per spec
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  // 2. container.xml
  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
  );

  // 3. Chapters
  const chapters: Array<{ id: string; file: string; title: string; xhtml: string }> = [];

  chapters.push({
    id: "titlepage",
    file: "text/titlepage.xhtml",
    title: brand,
    xhtml: titlePage(brand, input),
  });

  chapters.push({
    id: "briefing",
    file: "text/briefing.xhtml",
    title: "The Briefing",
    xhtml: chapter(
      "The Briefing",
      "Today, in brief.",
      `<p class="opener">${esc(input.sections.briefing)}</p>`,
    ),
  });

  if (input.sections.inbox.length > 0) {
    chapters.push({
      id: "inbox",
      file: "text/inbox.xhtml",
      title: "From Your Inbox",
      xhtml: chapter(
        "From Your Inbox",
        `${input.sections.inbox.length} note${input.sections.inbox.length === 1 ? "" : "s"} worth your attention`,
        input.sections.inbox
          .map(
            (i) => `<p class="source">${esc(i.source)}</p>
<p>${esc(i.summary)}</p>`,
          )
          .join('\n<hr class="sep"/>\n'),
      ),
    });
  }

  if (input.sections.world.length > 0) {
    chapters.push({
      id: "world",
      file: "text/world.xhtml",
      title: "The World",
      xhtml: chapter(
        "The World",
        "What happened.",
        input.sections.world.map(brief).join("\n"),
      ),
    });
  }

  // The Interlude sits between The World and Your Interests — a deliberate
  // pause between the wider world and your own corners.
  if (input.sections.quietSection?.body) {
    chapters.push({
      id: "interlude",
      file: "text/interlude.xhtml",
      title: "The Interlude",
      xhtml: chapter(
        "The Interlude",
        "",
        `<div class="interlude">
<p class="interlude-body">${esc(input.sections.quietSection.body)}</p>
${input.sections.quietSection.attribution ? `<p class="attribution">— ${esc(input.sections.quietSection.attribution)}</p>` : ""}
</div>`,
      ),
    });
  }

  if (input.sections.interests.length > 0) {
    chapters.push({
      id: "interests",
      file: "text/interests.xhtml",
      title: "Your Interests",
      xhtml: chapter(
        "Your Interests",
        "From the corners you follow.",
        input.sections.interests.map(brief).join("\n"),
      ),
    });
  }

  chapters.push({
    id: "longread",
    file: "text/longread.xhtml",
    title: "The Long Read",
    xhtml: chapter(
      "The Long Read",
      input.sections.longRead.title,
      `<p class="source">${esc(hostnameOf(input.sections.longRead.sourceUrl))}</p>
${input.sections.longRead.body
  .split(/\n\n+/)
  .map((p, i) => (i === 0 ? `<p class="first">${esc(p)}</p>` : `<p>${esc(p)}</p>`))
  .join("\n")}`,
    ),
  });

  // Verbatim — full posts read in their entirety, after The Long Read.
  if (input.sections.verbatim && input.sections.verbatim.length > 0) {
    input.sections.verbatim.forEach((post, idx) => {
      const bodyParas = post.paragraphs
        .map((p) => `<p>${esc(p)}</p>`)
        .join("\n");
      const byline = post.author ? `${post.author} · ${hostnameOf(post.url)}` : hostnameOf(post.url);
      const truncNote = post.possiblyTruncated
        ? `<p class="source">(This feed provided a summary rather than the full text.)</p>`
        : "";
      chapters.push({
        id: `verbatim${idx}`,
        file: `text/verbatim${idx}.xhtml`,
        title: post.feedName,
        xhtml: chapter(
          "Worth Reading in Full",
          post.title,
          `<p class="source">${esc(byline)}</p>
${truncNote}
${bodyParas}`,
        ),
      });
    });
  }

  if (input.sections.tomorrow) {
    chapters.push({
      id: "tomorrow",
      file: "text/tomorrow.xhtml",
      title: "Tomorrow",
      xhtml: chapter("Tomorrow", "", `<p class="tomorrow">${esc(input.sections.tomorrow)}</p>`),
    });
  }

  for (const ch of chapters) {
    zip.file(`OEBPS/${ch.file}`, ch.xhtml);
  }

  // 4. Assets
  zip.file("OEBPS/cover.png", input.coverPng);
  if (input.frontispiecePng) {
    zip.file("OEBPS/frontispiece.png", input.frontispiecePng);
  }
  zip.file("OEBPS/styles.css", STYLES);

  // 5. Navigation (EPUB3 nav + NCX fallback)
  zip.file("OEBPS/nav.xhtml", navXhtml(brand, chapters));
  zip.file("OEBPS/toc.ncx", tocNcx(uid, brand, input.dateLong, chapters));

  // 6. Package document
  zip.file("OEBPS/content.opf", contentOpf(uid, brand, input, chapters));

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  }) as Promise<Buffer>;
}

// ─── Pieces ────────────────────────────────────────────────────────────────

function brief(item: { headline: string; summary: string; sourceUrl: string }): string {
  return `<h3 class="brief-headline">${esc(item.headline)}</h3>
<p class="source">${esc(hostnameOf(item.sourceUrl))}</p>
<p>${esc(item.summary)}</p>`;
}

function titlePage(brand: string, input: EpubInput): string {
  const main = brand.startsWith("The ") ? brand.slice(4) : brand;
  return xhtml(
    brand,
    `<div class="titlepage">
  <p class="eyebrow">A Daily Briefing</p>
  ${brand.startsWith("The ") ? `<p class="the">The</p>` : ""}
  <h1 class="masthead">${esc(main)}</h1>
  <hr class="title-rule"/>
  <p class="date">${esc(input.dateLong)}</p>
  <p class="issue">No. ${input.issueNumber.toString().padStart(3, "0")}</p>
  ${
    input.frontispiecePng
      ? `<div class="frontispiece"><img src="../frontispiece.png" alt="Daily frontispiece"/>
  ${input.frontispieceCaption ? `<p class="caption">${esc(input.frontispieceCaption)}</p>` : ""}</div>`
      : ""
  }
  <p class="tagline">A moment of calm in a busy world.</p>
</div>`,
  );
}

function chapter(marker: string, title: string, body: string): string {
  return xhtml(
    title || marker,
    `<p class="marker">${esc(marker)}</p>
${title ? `<h2 class="section-title">${esc(title)}</h2>` : ""}
<hr class="rule"/>
${body}`,
  );
}

function xhtml(title: string, body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>${esc(title)}</title>
  <link rel="stylesheet" type="text/css" href="../styles.css"/>
</head>
<body>
${body}
</body>
</html>`;
}

function navXhtml(brand: string, chapters: Array<{ file: string; title: string }>): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>${esc(brand)}</title></head>
<body>
<nav epub:type="toc" id="toc">
  <h1>Contents</h1>
  <ol>
${chapters.map((c) => `    <li><a href="${c.file}">${esc(c.title)}</a></li>`).join("\n")}
  </ol>
</nav>
</body>
</html>`;
}

function tocNcx(
  uid: string,
  brand: string,
  dateLong: string,
  chapters: Array<{ id: string; file: string; title: string }>,
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${uid}"/>
    <meta name="dtb:depth" content="1"/>
  </head>
  <docTitle><text>${esc(brand)} — ${esc(dateLong)}</text></docTitle>
  <navMap>
${chapters
  .map(
    (c, i) => `    <navPoint id="${c.id}" playOrder="${i + 1}">
      <navLabel><text>${esc(c.title)}</text></navLabel>
      <content src="${c.file}"/>
    </navPoint>`,
  )
  .join("\n")}
  </navMap>
</ncx>`;
}

function contentOpf(
  uid: string,
  brand: string,
  input: EpubInput,
  chapters: Array<{ id: string; file: string }>,
): string {
  const modified = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">${uid}</dc:identifier>
    <dc:title>${esc(brand)} — ${esc(input.dateLong)}</dc:title>
    <dc:creator>${esc(brand)}</dc:creator>
    <dc:language>en-GB</dc:language>
    <dc:date>${input.issueDate}</dc:date>
    <meta property="dcterms:modified">${modified}</meta>
    <meta name="cover" content="cover-image"/>
  </metadata>
  <manifest>
    <item id="cover-image" href="cover.png" media-type="image/png" properties="cover-image"/>
    ${input.frontispiecePng ? `<item id="frontispiece" href="frontispiece.png" media-type="image/png"/>` : ""}
    <item id="css" href="styles.css" media-type="text/css"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
${chapters.map((c) => `    <item id="${c.id}" href="${c.file}" media-type="application/xhtml+xml"/>`).join("\n")}
  </manifest>
  <spine toc="ncx">
${chapters.map((c) => `    <itemref idref="${c.id}"/>`).join("\n")}
  </spine>
</package>`;
}

// Conversion-safe stylesheet. Kindle's EPUB ingestion supports a narrow
// CSS subset — ems, margins, text-align, font-style/weight, small-caps.
const STYLES = `
body { margin: 1em; font-family: serif; }

/* Title page */
.titlepage { text-align: center; margin-top: 1em; }
.eyebrow { font-size: 0.75em; letter-spacing: 0.3em; text-transform: uppercase; color: #555; }
.the { font-style: italic; font-size: 1.3em; margin: 0.8em 0 0 0; }
.masthead { font-size: 2.4em; font-weight: bold; margin: 0.05em 0 0.3em 0; letter-spacing: -0.02em; }
.title-rule { width: 18%; border: none; border-top: 2px solid #111; margin: 0 auto 0.9em auto; }
.date { font-style: italic; font-size: 1.05em; margin: 0; }
.issue { font-size: 0.7em; letter-spacing: 0.25em; color: #555; margin-top: 0.35em; }
.frontispiece { margin: 1em 0 0.3em 0; }
/* Cap by HEIGHT so tall/portrait drawings can't push the tagline onto a
   second page. max-height in vh limits the image to a fraction of the
   screen regardless of the drawing's shape; width stays auto so it never
   distorts. The two caps together keep the whole title page on one screen. */
.frontispiece img { max-height: 42vh; max-width: 80%; width: auto; height: auto; object-fit: contain; }
.caption { font-style: italic; font-size: 0.7em; color: #555; margin-top: 0.4em; }
.tagline { font-style: italic; color: #555; margin-top: 1em; }

/* Sections */
.marker { font-size: 0.72em; letter-spacing: 0.25em; text-transform: uppercase; color: #555; margin-bottom: 0.2em; }
.section-title { font-size: 1.5em; font-weight: bold; margin: 0 0 0.3em 0; }
.rule { border: none; border-top: 1px solid #bbb; margin: 0.6em 0 1em 0; }
.sep { border: none; border-top: 1px solid #ddd; width: 30%; margin: 1.2em auto; }

.opener { font-size: 1.08em; line-height: 1.65; }
.source { font-style: italic; font-size: 0.8em; color: #555; margin: 0 0 0.25em 0; }
.brief-headline { font-size: 1.08em; font-weight: bold; margin: 1.2em 0 0.15em 0; }
p { line-height: 1.55; margin: 0.4em 0 0.8em 0; }
.first { margin-top: 0.2em; }

/* The Interlude */
.interlude { text-align: center; margin: 3em 1.5em; }
.interlude-body { font-style: italic; line-height: 1.8; }
.attribution { font-size: 0.75em; letter-spacing: 0.2em; text-transform: uppercase; color: #555; margin-top: 1em; }

.tomorrow { font-style: italic; }
`;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
