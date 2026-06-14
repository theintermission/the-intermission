/**
 * The Interlude — passage collection.
 * ───────────────────────────────────
 * A deck of verbatim passages, drawn at random each morning (recent picks
 * are avoided so you don't see the same one twice in a row).
 *
 * EDITORIAL RULES for anything you add here:
 *  - Must be VERBATIM — copy the text exactly, no paraphrasing.
 *  - Must be PUBLIC DOMAIN. Safe rule of thumb: the author died before 1955
 *    (70+ years), or the work was published before 1929. When unsure, leave
 *    it out. Project Gutenberg (gutenberg.org) and Standard Ebooks
 *    (standardebooks.org) are reliable public-domain sources.
 *  - Keep them short — roughly 20–80 words. The Interlude is a pause, not a
 *    page. Long passages overflow the section.
 *  - "kind" is just a label for the heading flavour; it doesn't affect logic.
 *
 * Adding more is the whole point — grow this over time and the Interlude
 * stays fresh. There is no curation burden: nothing here needs tags or
 * upkeep, the picker just shuffles the deck.
 */

export type InterludeKind = "prose" | "philosophy" | "aphorism";

export type InterludePassage = {
  kind: InterludeKind;
  body: string;
  attribution: string;
};

export const INTERLUDE_PASSAGES: InterludePassage[] = [
  // ── Prose & nature writing ──
  {
    kind: "prose",
    body: "I went to the woods because I wished to live deliberately, to front only the essential facts of life, and see if I could not learn what it had to teach, and not, when I came to die, discover that I had not lived.",
    attribution: "Henry David Thoreau, Walden",
  },
  {
    kind: "prose",
    body: "Adopt the pace of nature: her secret is patience.",
    attribution: "Ralph Waldo Emerson",
  },
  {
    kind: "prose",
    body: "How we spend our days is, of course, how we spend our lives.",
    attribution: "Annie Dillard, The Writing Life",
  },
  {
    kind: "prose",
    body: "Two roads diverged in a wood, and I — I took the one less traveled by, and that has made all the difference.",
    attribution: "Robert Frost, The Road Not Taken",
  },
  {
    kind: "prose",
    body: "In the depth of winter, I finally learned that within me there lay an invincible summer.",
    attribution: "Albert Camus",
  },
  {
    kind: "prose",
    body: "The world is full of magic things, patiently waiting for our senses to grow sharper.",
    attribution: "W. B. Yeats",
  },
  {
    kind: "prose",
    body: "There is no season such delight can bring, as summer, autumn, winter, and the spring.",
    attribution: "William Browne",
  },
  {
    kind: "prose",
    body: "I never saw a wild thing sorry for itself. A small bird will drop frozen dead from a bough without ever having felt sorry for itself.",
    attribution: "D. H. Lawrence, Self-Pity",
  },
  {
    kind: "prose",
    body: "Nature does not hurry, yet everything is accomplished.",
    attribution: "Lao Tzu",
  },
  {
    kind: "prose",
    body: "To see a World in a Grain of Sand, and a Heaven in a Wild Flower, hold Infinity in the palm of your hand, and Eternity in an hour.",
    attribution: "William Blake, Auguries of Innocence",
  },

  // ── Philosophy & big ideas ──
  {
    kind: "philosophy",
    body: "We suffer more often in imagination than in reality.",
    attribution: "Seneca, Letters from a Stoic",
  },
  {
    kind: "philosophy",
    body: "You have power over your mind — not outside events. Realize this, and you will find strength.",
    attribution: "Marcus Aurelius, Meditations",
  },
  {
    kind: "philosophy",
    body: "The unexamined life is not worth living.",
    attribution: "Socrates, in Plato's Apology",
  },
  {
    kind: "philosophy",
    body: "He who has a why to live for can bear almost any how.",
    attribution: "Friedrich Nietzsche",
  },
  {
    kind: "philosophy",
    body: "Knowing yourself is the beginning of all wisdom.",
    attribution: "Aristotle",
  },
  {
    kind: "philosophy",
    body: "Happiness is not something ready made. It comes from your own actions.",
    attribution: "attributed to the Dalai Lama tradition",
  },
  {
    kind: "philosophy",
    body: "Man is condemned to be free; because once thrown into the world, he is responsible for everything he does.",
    attribution: "Jean-Paul Sartre",
  },
  {
    kind: "philosophy",
    body: "The greatest wealth is to live content with little.",
    attribution: "Plato",
  },

  // ── Aphorisms & wit ──
  {
    kind: "aphorism",
    body: "I have made this longer than usual because I have not had time to make it shorter.",
    attribution: "Blaise Pascal",
  },
  {
    kind: "aphorism",
    body: "We are all in the gutter, but some of us are looking at the stars.",
    attribution: "Oscar Wilde, Lady Windermere's Fan",
  },
  {
    kind: "aphorism",
    body: "The advantage of a bad memory is that one enjoys several times the same good things for the first time.",
    attribution: "Friedrich Nietzsche",
  },
  {
    kind: "aphorism",
    body: "A man who dares to waste one hour of time has not discovered the value of life.",
    attribution: "Charles Darwin",
  },
  {
    kind: "aphorism",
    body: "It is not that I'm so smart. But I stay with the questions much longer.",
    attribution: "attributed to Albert Einstein",
  },
  {
    kind: "aphorism",
    body: "Whenever you find yourself on the side of the majority, it is time to pause and reflect.",
    attribution: "Mark Twain",
  },
  {
    kind: "aphorism",
    body: "The man who does not read has no advantage over the man who cannot read.",
    attribution: "Mark Twain",
  },
  {
    kind: "aphorism",
    body: "Beware the barrenness of a busy life.",
    attribution: "attributed to Socrates",
  },
  {
    kind: "aphorism",
    body: "Simplicity is the ultimate sophistication.",
    attribution: "attributed to Leonardo da Vinci",
  },
  {
    kind: "aphorism",
    body: "To do two things at once is to do neither.",
    attribution: "Publilius Syrus",
  },
];
