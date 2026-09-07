# prompts/P2/Melanargia-galathea-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 1200. The answer is the JSON object the model would return, nothing else, written to `answers/P2/Melanargia-galathea-de.json`.

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
Art: Melanargia galathea (Schachbrett).
Region des Lesers: Mainz-Bingen.

FAKTEN:
F1 [GBIF occurrences] Region Mainz-Bingen: 644 Meldungen in zehn Jahren; Hauptzeit „Jun–Jul“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 0, Apr 0, Mai 2, Jun 100, Jul 63, Aug 1, Sep 0, Okt 0, Nov 0, Dez 0.
F2 [GloBI] bestäubt: Kartäusernelke (Dianthus carthusianorum) — 58 GloBI-Belege.
F3 [GloBI] bestäubt: Tauben-Skabiose (Scabiosa columbaria) — 47 GloBI-Belege.
F4 [GloBI] bestäubt: Acker-Witwenblume (Knautia arvensis) — 40 GloBI-Belege.
F5 [GloBI] bestäubt: Mittlerer Klee (Trifolium medium) — 26 GloBI-Belege.
F6 [GloBI] bestäubt: Wiesenklee (Trifolium pratense) — 19 GloBI-Belege.
F7 [GloBI] bestäubt: Echte Betonie (Betonica officinalis) — 19 GloBI-Belege.
F8 [GloBI] bestäubt: Magerwiesen-Margerite (Leucanthemum vulgare) — 17 GloBI-Belege.
F9 [GloBI] besucht Blüten von: Acker-Witwenblume (Knautia arvensis) — 23 GloBI-Belege.
