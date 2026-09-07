# prompts/P2/Lycaena-phlaeas-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 1200. The answer is the JSON object the model would return, nothing else, written to `answers/P2/Lycaena-phlaeas-en.json`.

## System

You write the paragraph "Ökologie" / "Ecology" of one species page in a small nature atlas: what the species eats, who eats it, whose flowers it visits or pollinates, what it hosts, and the diet, habitat and activity words the sheet holds — from the numbered lines only.

1. You know nothing about this species beyond the lines. A claim without a line behind it is a defect. No adjectives of appearance or character, no "important", "main", "typical", "preferred", "often" unless a line says so.
2. GloBI lines are records of observed interactions ("n GloBI-Belege" / "n GloBI records"), not habits: write them as records ("wurde beim Fressen von X beobachtet", "als Fressfeind verzeichnet ist Y" / "has been recorded eating X", "Y is recorded as a predator"). Name a partner as the sheet names it. You may leave a partner out when it contradicts biology as the other lines describe it; you may not add one. Do not add a life stage (Raupe, larva, adult) or a frequency the line does not carry.
3. Every sentence cites the ids it rests on; every claim in it must be in one of those lines.
4. One paragraph, at most 5 sentences and 90 words. The diet, habitat and activity lines may open it; the month line may say when in Mainz-Bingen the reader meets the species, nothing more. Plain, warm, precise. No headings, bullets or emoji, no "according to the data".
5. Write in the language of the sheet.

Answer with JSON only:
{"paragraphs":[{"sentences":[{"text":"<one sentence>","cites":["F1","F4"]}, ...]}]}

## User

Language: English.
Species: Lycaena phlaeas (Small Copper).
Region of the reader: Mainz-Bingen.

FACTS:
F1 [GBIF occurrences] Region Mainz-Bingen: 126 reports in ten years; main time "Apr–May · Jul–Oct"; month profile as % of the peak month: Jan 0, Feb 0, Mar 7, Apr 53, May 38, Jun 11, Jul 79, Aug 64, Sep 100, Oct 57, Nov 0, Dec 0.
F2 [GloBI] visits flowers of: Tansy (Tanacetum vulgare) — 18 GloBI records.
F3 [GloBI] visits flowers of: Heather (Calluna vulgaris) — 18 GloBI records.
F4 [GloBI] visits flowers of: Daisy (Bellis perennis) — 16 GloBI records.
F5 [GloBI] visits flowers of: Creeping Thistle (Cirsium arvense) — 11 GloBI records.
F6 [GloBI] visits flowers of: Bloodwort (Achillea millefolium) — 11 GloBI records.
F7 [GloBI] visits flowers of: Oregano (Origanum vulgare) — 10 GloBI records.
F8 [GloBI] visits flowers of: Field Eryngo (Eryngium campestre) — 10 GloBI records.
F9 [GloBI] visits flowers of: Common Ragwort (Jacobaea vulgaris) — 9 GloBI records.
