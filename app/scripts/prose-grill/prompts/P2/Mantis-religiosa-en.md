# prompts/P2/Mantis-religiosa-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 1200. The answer is the JSON object the model would return, nothing else, written to `answers/P2/Mantis-religiosa-en.json`.

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
Species: Mantis religiosa (European mantis).
Region of the reader: Mainz-Bingen.

FACTS:
F1 [GBIF occurrences] Region Mainz-Bingen: 630 reports in ten years; main time "Aug–Sep"; month profile as % of the peak month: Jan 2, Feb 1, Mar 1, Apr 1, May 1, Jun 4, Jul 20, Aug 76, Sep 100, Oct 21, Nov 3, Dec 1.
F2 [GloBI] eats: Western honey bee (Apis mellifera) — 10 GloBI records.
F3 [GloBI] eats: Common Wasp (Vespula vulgaris) — 4 GloBI records.
F4 [GloBI] eats: Great Green Bush-cricket (Tettigonia viridissima) — 2 GloBI records.
F5 [GloBI] eats: Blue-winged Grasshopper (Oedipoda caerulescens) — 2 GloBI records.
F6 [GloBI] eats: Common Wall Lizard (Podarcis muralis) — 2 GloBI records.
F7 [GloBI] is eaten by: Asian hornet (Vespa velutina) — 5 GloBI records.
F8 [GloBI] is eaten by: House sparrow (Passer domesticus) — 2 GloBI records.
