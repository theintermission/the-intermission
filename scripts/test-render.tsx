// Test: render a realistic sample briefing PDF using the real template
import fs from "node:fs";
import { renderBriefingPdf } from "../src/pdf/render";
import type { CoverIllustration } from "../src/pdf/template";
const illustration: CoverIllustration = JSON.parse(fs.readFileSync("/tmp/illustration.json", "utf8"));

const sections = {
  briefing: "A quieter Wednesday after a turbulent start to the week. The Bank of England held rates steady for a fourth consecutive meeting, signalling patience as inflation drifts toward target. Across the Atlantic, the chip wars escalated again, with new export controls drawing sharp responses from industry. Closer to your interests: two thoughtful essays on the craft of building small software businesses arrived this morning, and Quanta has a remarkable piece on the mathematics of folding. A calm day to read deeply rather than widely.",
  inbox: [
    { source: "The Browser", summary: "Five recommended pieces today, the standout being a long history of the humble shipping container and how standardisation quietly rebuilt the world economy. Also notable: an essay on why medieval scribes doodled in margins." },
    { source: "Stripe Atlas Digest", summary: "This month's edition focuses on pricing experiments for early-stage SaaS. The key argument: founders consistently underprice by anchoring to competitors rather than value delivered, and annual plans convert better when framed as months-free rather than percentage discounts." }
  ],
  world: [
    { headline: "Bank of England holds rates for fourth consecutive meeting", summary: "The MPC voted 7-2 to hold, citing gradual disinflation and a cooling labour market. Markets now price the first cut for September.", sourceUrl: "https://www.bbc.co.uk/news/example" },
    { headline: "New semiconductor export controls announced", summary: "Fresh restrictions target advanced lithography components. Industry groups warned of supply chain fragmentation; officials framed the move as narrow and security-focused.", sourceUrl: "https://www.theguardian.com/example" },
    { headline: "Lagos floods recede as relief efforts continue", summary: "Water levels fell across the eastern districts after a week of flooding. Attention turns to drainage investment, with the governor announcing an independent review.", sourceUrl: "https://www.bbc.co.uk/news/example2" }
  ],
  interests: [
    { headline: "The mathematics of folding: from origami to proteins", summary: "How a centuries-old art became serious computational geometry, with applications from satellite solar arrays to protein misfolding. Profiles three mathematicians who treat creases as equations.", sourceUrl: "https://www.quantamagazine.org/example" },
    { headline: "Small software, lasting businesses", summary: "The most durable software companies of the next decade will be deliberately small: high-margin, niche-focused, tiny teams with AI leverage. Draws parallels to the microbrewery movement.", sourceUrl: "https://example.substack.com/p/small-software" }
  ],
  longRead: {
    title: "The Container That Rebuilt the World",
    body: "In April 1956, a converted oil tanker called the Ideal X left Newark carrying fifty-eight aluminium boxes. Almost nobody noticed. The boxes were the idea of a trucking magnate named Malcom McLean, who had grown tired of watching longshoremen unload his lorries crate by crate.\n\nWhat McLean understood, and what took the rest of the world two decades to accept, was that the cost of shipping was not really about ships. It was about the chaos at the water's edge: the armies of workers, the pilferage, the weeks a vessel spent idle in port while cargo trickled on and off in nets and slings.\n\nThe container solved this by being boring. A standard box, lifted by a standard crane, locked to a standard chassis. Boredom, it turned out, was revolutionary. Within a generation, port cities that had thrived for centuries withered, while obscure deepwater harbours became the new cathedrals of trade.\n\nThe deeper lesson is one about standards. Every interface we agree on — the shipping container, the screw thread, the HTTP request — quietly redistributes power and reshapes geography. We tend to celebrate inventions that do something new. The container did nothing new. It simply made an old thing so uniform that the world reorganised itself around the uniformity.\n\nIt is worth asking, as new standards emerge in artificial intelligence and energy, which port cities of our own era are about to find themselves on the wrong side of a boring box.",
    sourceUrl: "https://thebrowser.com/example"
  },
  quietSection: {
    kind: "quote" as const,
    body: "There is a pleasure in the pathless woods, there is a rapture on the lonely shore, there is society where none intrudes, by the deep sea, and music in its roar; I love not man the less, but Nature more.",
    attribution: "Lord Byron"
  },
  tomorrow: "The June inflation print arrives at 7am, and your Substack queue has two unread essays on typography."
};

async function main() {
  const pdf = await renderBriefingPdf({
    title: "The Wednesday Issue",
    issueDate: "2026-06-10",
    issueNumber: 1,
    sections,
    illustration,
  });
  fs.writeFileSync("output/sample.pdf", pdf);
  console.log(`Rendered ${(pdf.length / 1024).toFixed(0)} KB`);
}
main();
