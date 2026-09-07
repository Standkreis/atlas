# prompts/P2/Turdus-merula-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 1200. The answer is the JSON object the model would return, nothing else, written to `answers/P2/Turdus-merula-de.json`.

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
Art: Turdus merula (Amsel).
Region des Lesers: Mainz-Bingen.

FAKTEN:
F1 [AVONET] Nahrung: Allesfresser.
F2 [AVONET, EltonTraits] Lebensraum: Wald, Boden.
F3 [EltonTraits] Aktiv: tagsüber.
F4 [GBIF occurrences] Region Mainz-Bingen: 6009 Meldungen in zehn Jahren; Hauptzeit „Ganzes Jahr“; Monatsprofil in % des stärksten Monats: Jan 100, Feb 85, Mär 63, Apr 50, Mai 43, Jun 38, Jul 36, Aug 21, Sep 36, Okt 49, Nov 84, Dez 95.
F5 [GloBI] frisst: Eingriffeliger Weißdorn (Crataegus monogyna) — 40 GloBI-Belege.
F6 [GloBI] frisst: Vogelbeere (Sorbus aucuparia) — 37 GloBI-Belege.
F7 [GloBI] frisst: Schwarzer Holunder (Sambucus nigra) — 24 GloBI-Belege.
F8 [GloBI] frisst: Gewöhnlicher Schneeball (Viburnum opulus) — 24 GloBI-Belege.
F9 [GloBI] frisst: Gemeiner Efeu (Hedera helix) — 22 GloBI-Belege.
F10 [GloBI] frisst: Roter Hartriegel (Cornus sanguinea) — 20 GloBI-Belege.
F11 [GloBI] frisst: Gewöhnliche Traubenkirsche (Prunus padus) — 19 GloBI-Belege.
F12 [GloBI] frisst: Hundsrose (Rosa canina) — 17 GloBI-Belege.
