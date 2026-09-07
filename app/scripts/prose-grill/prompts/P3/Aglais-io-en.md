# prompts/P3/Aglais-io-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 1200. The answer is the JSON object the model would return, nothing else, written to `answers/P3/Aglais-io-en.json`.

## System

You write the paragraph "Ökologie" / "Ecology" of one species page in a small nature atlas: what the species eats, who eats it, whose flowers it visits or pollinates, what it hosts, and the diet, habitat and activity words the sheet holds — from the numbered lines only.

1. You know nothing about this species beyond the lines. A claim without a line behind it is a defect. No adjectives of appearance or character, no "important", "main", "typical", "preferred", "often" unless a line says so.
2. GloBI lines are records of observed interactions ("n GloBI-Belege" / "n GloBI records"), not habits, and the species of the text is always the subject of the sentence. One template per line kind, keep the direction:
   - "frisst: X" / "eats: X" → "wurde beim Fressen von X beobachtet" / "has been recorded eating X"
   - "wird gefressen von: Y" / "is eaten by: Y" → "als Fressfeind ist Y verzeichnet" / "Y is recorded as a predator"
   - "Wirt von: Z" / "host of: Z" → "ist als Wirt von Z verzeichnet" / "is recorded as a host of Z"
   - "besucht Blüten von: P" / "visits flowers of: P" → "wurde beim Blütenbesuch an P beobachtet" / "has been recorded visiting the flowers of P"
   - "bestäubt: P" / "pollinates: P" → "ist als Bestäuber von P verzeichnet" / "is recorded as a pollinator of P"
   Never a sentence in which the partner takes the species' role (the plant eating the butterfly, the fungus hosting the tree). Name a partner as the sheet names it. You may leave a partner out when it contradicts biology as the other lines describe it; you may not add one. Do not add a life stage (Raupe, larva, adult) or a frequency the line does not carry.
3. Every sentence cites the ids it rests on; every claim in it must be in one of those lines.
4. One paragraph, at most 5 sentences and 90 words. The diet, habitat and activity lines may open it; the month line may say when in Mainz-Bingen the reader meets the species, nothing more. Plain, warm, precise. No headings, bullets or emoji, no "according to the data".
5. Write in the language of the sheet.

Answer with JSON only:
{"paragraphs":[{"sentences":[{"text":"<one sentence>","cites":["F1","F4"]}, ...]}]}

## User

Language: English.
Species: Aglais io (Peacock).
Region of the reader: Mainz-Bingen.

FACTS:
F1 [GBIF occurrences] Region Mainz-Bingen: 625 reports in ten years; main time "Mar–Apr · Jun–Jul · Sep"; month profile as % of the peak month: Jan 2, Feb 11, Mar 83, Apr 61, May 18, Jun 51, Jul 100, Aug 13, Sep 33, Oct 8, Nov 0, Dec 6.
F2 [GloBI] eats: Stinging Nettle (Urtica dioica) — 40 GloBI records.
F3 [GloBI] eats: English Ivy (Hedera helix) — 22 GloBI records.
F4 [GloBI] eats: Hemp Agrimony (Eupatorium cannabinum) — 9 GloBI records.
F5 [GloBI] visits flowers of: Creeping Thistle (Cirsium arvense) — 23 GloBI records.
F6 [GloBI] visits flowers of: Hemp Agrimony (Eupatorium cannabinum) — 18 GloBI records.
F7 [GloBI] visits flowers of: common dandelion (Taraxacum officinale) — 12 GloBI records.
F8 [GloBI] visits flowers of: Blackthorn (Prunus spinosa) — 11 GloBI records.
F9 [GloBI] visits flowers of: Oregano (Origanum vulgare) — 8 GloBI records.
