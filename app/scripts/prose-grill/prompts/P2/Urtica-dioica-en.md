# prompts/P2/Urtica-dioica-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 1200. The answer is the JSON object the model would return, nothing else, written to `answers/P2/Urtica-dioica-en.json`.

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
Species: Urtica dioica (Stinging Nettle).
Region of the reader: Mainz-Bingen.

FACTS:
F1 [GIFT (Weigelt et al.)] Pollination: wind.
F2 [GBIF occurrences] Region Mainz-Bingen: 259 reports in ten years; main time "Apr–Jul"; month profile as % of the peak month: Jan 0, Feb 0, Mar 14, Apr 31, May 100, Jun 28, Jul 37, Aug 15, Sep 18, Oct 25, Nov 9, Dec 3.
F3 [GloBI] is eaten by: Peacock (Aglais io) — 3 GloBI records.
F4 [GloBI] is eaten by: Small tortoiseshell (Aglais urticae) — 2 GloBI records.
F5 [GloBI] host of: Peacock (Aglais io) — 3 GloBI records.
F6 [GloBI] host of: Map (Araschnia levana) — 2 GloBI records.
F7 [GloBI] host of: Small tortoiseshell (Aglais urticae) — 2 GloBI records.
