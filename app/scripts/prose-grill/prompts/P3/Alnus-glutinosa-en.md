# prompts/P3/Alnus-glutinosa-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 1200. The answer is the JSON object the model would return, nothing else, written to `answers/P3/Alnus-glutinosa-en.json`.

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
Species: Alnus glutinosa (Black Alder).
Region of the reader: Mainz-Bingen.

FACTS:
F1 [GIFT (Weigelt et al.)] Pollination: wind.
F2 [GBIF occurrences] Region Mainz-Bingen: 27 reports in ten years; main time "Ganzes Jahr"; month profile as % of the peak month: Jan 59, Feb 28, Mar 16, Apr 13, May 31, Jun 38, Jul 28, Aug 47, Sep 41, Oct 38, Nov 31, Dec 100.
F3 [GloBI] is eaten by: European goldfinch (Carduelis carduelis) — 5 GloBI records.
F4 [GloBI] is eaten by: Musk beetle (Aromia moschata) — 2 GloBI records.
F5 [GloBI] host of: Turkeytail (Trametes versicolor) — 9 GloBI records.
F6 [GloBI] host of: Tinder Bracket (Fomes fomentarius) — 6 GloBI records.
F7 [GloBI] host of: Dotted border (Agriopis marginaria) — 5 GloBI records.
F8 [GloBI] host of: Red-Belted Bracket (Fomitopsis pinicola) — 5 GloBI records.
F9 [GloBI] host of: Lime Hawk-Moth (Mimas tiliae) — 2 GloBI records.
F10 [GloBI] host of: Candlesnuff Fungus (Xylaria hypoxylon) — 2 GloBI records.
