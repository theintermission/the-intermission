/**
 * The Briefing PDF Template — v2
 * ──────────────────────────────
 * This is the ACTUAL PRODUCT. Spend more time here than on any other file.
 *
 * v2 changes (Kindle feedback):
 *  - Pure white paper — warm/sepia tints render as dirty gray on e-ink
 *  - Larger type throughout (body 13pt, was 11pt)
 *  - Continuous flow: content runs page to page with deliberate partitions
 *    between sections instead of one-section-per-page (which stranded
 *    half-empty pages)
 *  - Two-column grid for The World and Your Interests — varied rhythm,
 *    denser pages
 *  - Dynamic page numbers (react-pdf render prop) since flow length varies
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from "@react-pdf/renderer";
import type { BriefingSections } from "../types";

export type CoverIllustration = {
  dataUri: string;
  caption: string;
  aspectRatio: number; // height / width
};

// ─── Font registration ─────────────────────────────────────────────────────
// Fonts are bundled via @fontsource packages (npm) — no network dependency
// at render time, works identically locally and in CI.

const F = "node_modules/@fontsource/fraunces/files";
const G = "node_modules/@fontsource/eb-garamond/files";

Font.register({
  family: "Fraunces",
  fonts: [
    { src: `${F}/fraunces-latin-300-normal.woff`, fontWeight: 300 },
    { src: `${F}/fraunces-latin-400-normal.woff`, fontWeight: 400 },
    { src: `${F}/fraunces-latin-400-italic.woff`, fontWeight: 400, fontStyle: "italic" },
    { src: `${F}/fraunces-latin-600-normal.woff`, fontWeight: 600 },
    { src: `${F}/fraunces-latin-700-normal.woff`, fontWeight: 700 },
    { src: `${F}/fraunces-latin-700-italic.woff`, fontWeight: 700, fontStyle: "italic" },
  ],
});

Font.register({
  family: "EB Garamond",
  fonts: [
    { src: `${G}/eb-garamond-latin-400-normal.woff`, fontWeight: 400 },
    { src: `${G}/eb-garamond-latin-400-italic.woff`, fontWeight: 400, fontStyle: "italic" },
    { src: `${G}/eb-garamond-latin-600-normal.woff`, fontWeight: 600 },
  ],
});

// Disable hyphenation — react-pdf's default breaks words badly ("Atl-antic").
// Left-aligned editorial text reads better with a ragged edge than bad breaks.
Font.registerHyphenationCallback((word) => [word]);

// Kindle Paperwhite screen ≈ 4.12in x 5.49in → 297 x 396 pt.
// Sizing the page to the device means no shrink-to-fit: type renders
// at its true size. (Effective text size is ~40% LARGER than the old
// 6x9in page squeezed onto the same screen.)
const PAGE_SIZE: [number, number] = [297, 396];

// ─── Style system ──────────────────────────────────────────────────────────
// Pure white + near-black for maximum e-ink contrast. Grays only for
// hierarchy, never for "warmth" (warmth doesn't survive grayscale).

const PAPER = "#ffffff";
const INK = "#111111";
const INK_SOFT = "#2e2e2e";
const INK_MUTED = "#6b6b6b";
const RULE = "#cccccc";

const styles = StyleSheet.create({
  page: {
    backgroundColor: PAPER,
    paddingTop: 34,
    paddingBottom: 34,
    paddingHorizontal: 28,
    fontFamily: "EB Garamond",
    fontSize: 11.5,
    lineHeight: 1.6,
    color: INK,
  },
  runningHead: {
    position: "absolute",
    top: 12,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    fontFamily: "Fraunces",
    fontSize: 7,
    color: INK_MUTED,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  pageNumber: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    textAlign: "center",
    fontFamily: "Fraunces",
    fontSize: 8,
    color: INK_MUTED,
  },

  // ─ Cover ─
  coverWrap: {
    flex: 1,
    justifyContent: "space-between",
    paddingTop: 2,
    paddingBottom: 2,
  },
  coverEyebrow: {
    fontFamily: "Fraunces",
    fontSize: 8,
    color: INK_MUTED,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 14,
  },
  coverMasthead: {
    fontFamily: "Fraunces",
    fontWeight: 700,
    fontSize: 38,
    color: INK,
    textAlign: "center",
    letterSpacing: -1,
    lineHeight: 1.05,
  },
  coverRule: {
    width: 44,
    height: 1.2,
    backgroundColor: INK,
    marginHorizontal: "auto",
    marginVertical: 16,
  },
  coverDate: {
    fontFamily: "Fraunces",
    fontStyle: "italic",
    fontSize: 11.5,
    color: INK_SOFT,
    textAlign: "center",
  },
  coverIssue: {
    fontFamily: "Fraunces",
    fontSize: 8,
    color: INK_MUTED,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    textAlign: "center",
    marginTop: 5,
  },
  coverFooter: {
    fontFamily: "Fraunces",
    fontStyle: "italic",
    fontSize: 9,
    color: INK_MUTED,
    textAlign: "center",
  },

  // ─ Section headers ─
  sectionMarker: {
    fontFamily: "Fraunces",
    fontSize: 8,
    color: INK_MUTED,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  sectionTitle: {
    fontFamily: "Fraunces",
    fontWeight: 600,
    fontSize: 16.5,
    color: INK,
    letterSpacing: -0.2,
  },
  sectionRule: {
    height: 1,
    backgroundColor: RULE,
    marginTop: 7,
    marginBottom: 11,
  },

  // ─ Partition between sections (the deliberate divider) ─
  partition: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  partitionLine: {
    height: 1,
    backgroundColor: RULE,
    flex: 1,
  },
  partitionMark: {
    fontFamily: "Fraunces",
    fontSize: 9,
    color: INK_MUTED,
    marginHorizontal: 10,
    letterSpacing: 3,
  },

  // ─ The Briefing (opener) ─
  briefingOpener: {
    fontFamily: "EB Garamond",
    fontSize: 12.5,
    lineHeight: 1.65,
    color: INK,
  },

  // ─ Full-width items (inbox) ─
  itemWrap: { marginBottom: 11 },
  itemSource: {
    fontFamily: "Fraunces",
    fontStyle: "italic",
    fontSize: 8,
    color: INK_MUTED,
    marginBottom: 3,
  },
  itemBody: {
    fontFamily: "EB Garamond",
    fontSize: 11.5,
    lineHeight: 1.55,
    color: INK_SOFT,
  },

  // ─ Two-column grid (world & interests) ─
  columnsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  columnItem: {
    width: "47.5%",
    marginBottom: 12,
  },
  columnHeadline: {
    fontFamily: "Fraunces",
    fontWeight: 600,
    fontSize: 11,
    color: INK,
    marginBottom: 3,
    lineHeight: 1.25,
  },
  columnBody: {
    fontFamily: "EB Garamond",
    fontSize: 10.5,
    lineHeight: 1.5,
    color: INK_SOFT,
  },

  // ─ Long read ─
  longReadTitle: {
    fontFamily: "Fraunces",
    fontWeight: 700,
    fontSize: 19,
    color: INK,
    letterSpacing: -0.4,
    lineHeight: 1.12,
    marginBottom: 7,
  },
  longReadBody: {
    fontFamily: "EB Garamond",
    fontSize: 12,
    lineHeight: 1.65,
    color: INK,
  },
  dropCap: {
    fontFamily: "Fraunces",
    fontWeight: 700,
    fontSize: 32,
    lineHeight: 1,
    color: INK,
  },

  // ─ The Interlude (quiet section) ─
  interludeWrap: {
    marginTop: 6,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  interludeBody: {
    fontFamily: "EB Garamond",
    fontStyle: "italic",
    fontSize: 12.5,
    lineHeight: 1.8,
    color: INK_SOFT,
    textAlign: "center",
  },
  interludeAttribution: {
    fontFamily: "Fraunces",
    fontSize: 8,
    color: INK_MUTED,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    textAlign: "center",
    marginTop: 10,
  },

  // ─ Tomorrow ─
  tomorrowBody: {
    fontFamily: "EB Garamond",
    fontStyle: "italic",
    fontSize: 11,
    lineHeight: 1.55,
    color: INK_SOFT,
  },
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatLongDate(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// ─── The Briefing Document ─────────────────────────────────────────────────

export type BriefingDocumentProps = {
  title: string;
  issueDate: string; // YYYY-MM-DD
  issueNumber: number;
  sections: BriefingSections;
  brand?: string; // default "The Intermission"
  illustration?: CoverIllustration;
};

export function BriefingDocument({
  title,
  issueDate,
  issueNumber,
  sections,
  brand = "The Intermission",
  illustration,
}: BriefingDocumentProps) {
  const dateLong = formatLongDate(issueDate);
  const firstChar = sections.longRead.body.charAt(0);
  const restOfLongRead = sections.longRead.body.slice(1);

  return (
    <Document title={title} author={brand}>
      {/* ─── COVER (its own page, unnumbered) ───────────────── */}
      <Page size={PAGE_SIZE} style={styles.page}>
        <View style={styles.coverWrap}>
          <View>
            <Text style={styles.coverEyebrow}>A Daily Briefing</Text>
            <Masthead brand={brand} />
            <View style={styles.coverRule} />
            <Text style={styles.coverDate}>{dateLong}</Text>
            <Text style={styles.coverIssue}>No. {issueNumber.toString().padStart(3, "0")}</Text>
          </View>

          {illustration && <Frontispiece illustration={illustration} />}

          <Text style={styles.coverFooter}>
            A moment of calm in a busy world.
          </Text>
        </View>
      </Page>

      {/* ─── CONTENT (one continuous flow — react-pdf paginates) ── */}
      <Page size={PAGE_SIZE} style={styles.page} wrap>
        <RunningHead brand={brand} date={dateLong} />
        <PageNumber />

        {/* The Briefing */}
        <View wrap={false}>
          <Text style={styles.sectionMarker}>The Briefing</Text>
          <Text style={styles.sectionTitle}>Today, in brief.</Text>
          <View style={styles.sectionRule} />
        </View>
        <Text style={styles.briefingOpener}>{sections.briefing}</Text>

        {/* From Your Inbox — full-width items */}
        {sections.inbox.length > 0 && (
          <>
            <View wrap={false}>
              <Partition />
              <Text style={styles.sectionMarker}>From Your Inbox</Text>
              <Text style={styles.sectionTitle}>
                {sections.inbox.length} note{sections.inbox.length === 1 ? "" : "s"} worth your
                attention
              </Text>
              <View style={styles.sectionRule} />
              {/* First item bound to header so the header never strands */}
              <View style={styles.itemWrap}>
                <Text style={styles.itemSource}>{sections.inbox[0].source}</Text>
                <Text style={styles.itemBody}>{sections.inbox[0].summary}</Text>
              </View>
            </View>
            {sections.inbox.slice(1).map((item, i) => (
              <View key={i} style={styles.itemWrap} wrap={false}>
                <Text style={styles.itemSource}>{item.source}</Text>
                <Text style={styles.itemBody}>{item.summary}</Text>
              </View>
            ))}
          </>
        )}

        {/* The World — two-column grid */}
        {sections.world.length > 0 && (
          <>
            <View wrap={false}>
              <Partition />
              <Text style={styles.sectionMarker}>The World</Text>
              <Text style={styles.sectionTitle}>What happened.</Text>
              <View style={styles.sectionRule} />
              {/* First row bound to header so the header never strands */}
              <View style={styles.columnsWrap}>
                {sections.world.slice(0, 2).map((item, i) => (
                  <View key={i} style={styles.columnItem}>
                    <Text style={styles.columnHeadline}>{item.headline}</Text>
                    <Text style={styles.itemSource}>{hostnameOf(item.sourceUrl)}</Text>
                    <Text style={styles.columnBody}>{item.summary}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.columnsWrap}>
              {sections.world.slice(2).map((item, i) => (
                <View key={i} style={styles.columnItem} wrap={false}>
                  <Text style={styles.columnHeadline}>{item.headline}</Text>
                  <Text style={styles.itemSource}>{hostnameOf(item.sourceUrl)}</Text>
                  <Text style={styles.columnBody}>{item.summary}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* The Interlude — a pause between the wider world and your corners */}
        {sections.quietSection?.body ? (
          <View wrap={false}>
            <Partition />
            <View style={styles.interludeWrap}>
              <Text style={styles.interludeBody}>{sections.quietSection.body}</Text>
              {sections.quietSection.attribution && (
                <Text style={styles.interludeAttribution}>
                  — {sections.quietSection.attribution}
                </Text>
              )}
            </View>
          </View>
        ) : null}

        {/* Your Interests — two-column grid */}
        {sections.interests.length > 0 && (
          <>
            <View wrap={false}>
              <Partition />
              <Text style={styles.sectionMarker}>Your Interests</Text>
              <Text style={styles.sectionTitle}>From the corners you follow.</Text>
              <View style={styles.sectionRule} />
              <View style={styles.columnsWrap}>
                {sections.interests.slice(0, 2).map((item, i) => (
                  <View key={i} style={styles.columnItem}>
                    <Text style={styles.columnHeadline}>{item.headline}</Text>
                    <Text style={styles.itemSource}>{hostnameOf(item.sourceUrl)}</Text>
                    <Text style={styles.columnBody}>{item.summary}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.columnsWrap}>
              {sections.interests.slice(2).map((item, i) => (
                <View key={i} style={styles.columnItem} wrap={false}>
                  <Text style={styles.columnHeadline}>{item.headline}</Text>
                  <Text style={styles.itemSource}>{hostnameOf(item.sourceUrl)}</Text>
                  <Text style={styles.columnBody}>{item.summary}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* The Long Read — flows on with its own header block */}
        <View wrap={false} minPresenceAhead={60}>
          <Partition />
          <Text style={styles.sectionMarker}>The Long Read</Text>
          <Text style={styles.longReadTitle}>{sections.longRead.title}</Text>
          <Text style={styles.itemSource}>{hostnameOf(sections.longRead.sourceUrl)}</Text>
          <View style={styles.sectionRule} />
        </View>
        <Text style={styles.longReadBody}>
          <Text style={styles.dropCap}>{firstChar}</Text>
          {restOfLongRead}
        </Text>

        {/* Worth Reading in Full — verbatim posts */}
        {sections.verbatim && sections.verbatim.length > 0
          ? sections.verbatim.map((post, idx) => (
              <View key={idx}>
                <View wrap={false} minPresenceAhead={80}>
                  <Partition />
                  <Text style={styles.sectionMarker}>Worth Reading in Full</Text>
                  <Text style={styles.longReadTitle}>{post.title}</Text>
                  <Text style={styles.itemSource}>
                    {post.author ? `${post.author} · ${hostnameOf(post.url)}` : hostnameOf(post.url)}
                  </Text>
                  <View style={styles.sectionRule} />
                </View>
                {post.paragraphs.map((p, i) => (
                  <Text key={i} style={[styles.longReadBody, { marginBottom: 8 }]}>
                    {p}
                  </Text>
                ))}
              </View>
            ))
          : null}

        {/* Tomorrow */}
        {sections.tomorrow ? (
          <View wrap={false}>
            <Partition />
            <Text style={styles.sectionMarker}>Tomorrow</Text>
            <View style={styles.sectionRule} />
            <Text style={styles.tomorrowBody}>{sections.tomorrow}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

/** The deliberate divider between sections — a quiet dinkus. */
function Partition() {
  return (
    <View style={styles.partition} wrap={false}>
      <Text style={styles.partitionMark}>·   ·   ·</Text>
    </View>
  );
}

/**
 * Masthead treatment. Brand names beginning with "The " get the classic
 * stacked newspaper treatment: a small italic "The" above the main word.
 * Single-word brands render at full size on one line.
 */
function Masthead({ brand }: { brand: string }) {
  if (brand.startsWith("The ")) {
    const main = brand.slice(4);
    return (
      <View>
        <Text
          style={{
            fontFamily: "Fraunces",
            fontStyle: "italic",
            fontSize: 15,
            color: INK,
            textAlign: "center",
            marginBottom: 1,
          }}
        >
          The
        </Text>
        <Text style={[styles.coverMasthead, { fontSize: main.length > 10 ? 30 : 38 }]}>
          {main}
        </Text>
      </View>
    );
  }
  return <Text style={styles.coverMasthead}>{brand}</Text>;
}

/**
 * The daily frontispiece — a public-domain drawing or print from the Met,
 * centered on the cover with a museum-style caption.
 */
function Frontispiece({ illustration }: { illustration: CoverIllustration }) {
  const maxW = 190;
  const maxH = 108;
  let w = maxW;
  let h = w * illustration.aspectRatio;
  if (h > maxH) {
    h = maxH;
    w = h / illustration.aspectRatio;
  }

  return (
    <View style={{ alignItems: "center" }}>
      <Image src={illustration.dataUri} style={{ width: w, height: h }} />
      <Text
        style={{
          fontFamily: "EB Garamond",
          fontStyle: "italic",
          fontSize: 7.5,
          color: INK_MUTED,
          textAlign: "center",
          marginTop: 6,
          maxWidth: 210,
        }}
      >
        {illustration.caption}
      </Text>
    </View>
  );
}

function RunningHead({ brand, date }: { brand: string; date: string }) {
  return (
    <View style={styles.runningHead} fixed>
      <Text>{brand}</Text>
      <Text>{date}</Text>
    </View>
  );
}

/** Dynamic page number — content flow length varies day to day. */
function PageNumber() {
  return (
    <Text
      style={styles.pageNumber}
      fixed
      render={({ pageNumber }) => `· ${pageNumber - 1} ·`}
    />
  );
}
