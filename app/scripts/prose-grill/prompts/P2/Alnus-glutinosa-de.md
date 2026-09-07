# prompts/P2/Alnus-glutinosa-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 1200. The answer is the JSON object the model would return, nothing else, written to `answers/P2/Alnus-glutinosa-de.json`.

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
Art: Alnus glutinosa (Schwarz-Erle).
Region des Lesers: Mainz-Bingen.

FAKTEN:
F1 [GIFT (Weigelt et al.)] Bestäubung: Wind.
F2 [GBIF occurrences] Region Mainz-Bingen: 27 Meldungen in zehn Jahren; Hauptzeit „Ganzes Jahr“; Monatsprofil in % des stärksten Monats: Jan 59, Feb 28, Mär 16, Apr 13, Mai 31, Jun 38, Jul 28, Aug 47, Sep 41, Okt 38, Nov 31, Dez 100.
F3 [GloBI] wird gefressen von: Stieglitz (Carduelis carduelis) — 5 GloBI-Belege.
F4 [GloBI] wird gefressen von: Moschusbock (Aromia moschata) — 2 GloBI-Belege.
F5 [GloBI] Wirt von: Schmetterlings-Tramete (Trametes versicolor) — 9 GloBI-Belege.
F6 [GloBI] Wirt von: Zunderschwamm (Fomes fomentarius) — 6 GloBI-Belege.
F7 [GloBI] Wirt von: Graugelber Breitflügelspanner (Agriopis marginaria) — 5 GloBI-Belege.
F8 [GloBI] Wirt von: Rotrandiger Baumschwamm (Fomitopsis pinicola) — 5 GloBI-Belege.
F9 [GloBI] Wirt von: Lindenschwärmer (Mimas tiliae) — 2 GloBI-Belege.
F10 [GloBI] Wirt von: Geweihförmige Holzkeule (Xylaria hypoxylon) — 2 GloBI-Belege.
