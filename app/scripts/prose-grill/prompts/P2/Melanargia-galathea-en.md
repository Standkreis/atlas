# prompts/P2/Melanargia-galathea-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 1200. The answer is the JSON object the model would return, nothing else, written to `answers/P2/Melanargia-galathea-en.json`.

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
Species: Melanargia galathea (Marbled White).
Region of the reader: Mainz-Bingen.

FACTS:
F1 [GBIF occurrences] Region Mainz-Bingen: 644 reports in ten years; main time "Jun–Jul"; month profile as % of the peak month: Jan 0, Feb 0, Mar 0, Apr 0, May 2, Jun 100, Jul 63, Aug 1, Sep 0, Oct 0, Nov 0, Dec 0.
F2 [GloBI] pollinates: Carthusian Pink (Dianthus carthusianorum) — 58 GloBI records.
F3 [GloBI] pollinates: Small Scabious (Scabiosa columbaria) — 47 GloBI records.
F4 [GloBI] pollinates: field scabious (Knautia arvensis) — 40 GloBI records.
F5 [GloBI] pollinates: zigzag clover (Trifolium medium) — 26 GloBI records.
F6 [GloBI] pollinates: Red Clover (Trifolium pratense) — 19 GloBI records.
F7 [GloBI] pollinates: Betony (Betonica officinalis) — 19 GloBI records.
F8 [GloBI] pollinates: Oxeye Daisy (Leucanthemum vulgare) — 17 GloBI records.
F9 [GloBI] visits flowers of: field scabious (Knautia arvensis) — 23 GloBI records.
