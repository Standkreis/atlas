# prompts/P2/Bombus-terrestris-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 1200. The answer is the JSON object the model would return, nothing else, written to `answers/P2/Bombus-terrestris-de.json`.

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

Sprache: Deutsch (kein Du; neutral oder ohne Anrede).
Art: Bombus terrestris (Dunkle Erdhummel).
Region des Lesers: Mainz-Bingen.

FAKTEN:
F1 [GBIF occurrences] Region Mainz-Bingen: 728 Meldungen in zehn Jahren; Hauptzeit „Feb–Sep“; Monatsprofil in % des stärksten Monats: Jan 2, Feb 29, Mär 77, Apr 63, Mai 31, Jun 99, Jul 100, Aug 65, Sep 47, Okt 20, Nov 4, Dez 0.
F2 [GloBI] besucht Blüten von: Skabiosen-Flockenblume (Centaurea scabiosa) — 224 GloBI-Belege.
F3 [GloBI] besucht Blüten von: Acker-Kratzdistel (Cirsium arvense) — 189 GloBI-Belege.
F4 [GloBI] besucht Blüten von: Weißklee (Trifolium repens) — 138 GloBI-Belege.
F5 [GloBI] besucht Blüten von: Besenheide (Calluna vulgaris) — 132 GloBI-Belege.
F6 [GloBI] besucht Blüten von: Oregano (Origanum vulgare) — 110 GloBI-Belege.
F7 [GloBI] besucht Blüten von: Acker-Witwenblume (Knautia arvensis) — 89 GloBI-Belege.
F8 [GloBI] besucht Blüten von: Drüsiges Springkraut (Impatiens glandulifera) — 84 GloBI-Belege.
F9 [GloBI] besucht Blüten von: Gewöhnlicher Löwenzahn (Taraxacum officinale) — 80 GloBI-Belege.
