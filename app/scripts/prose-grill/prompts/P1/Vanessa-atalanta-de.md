# prompts/P1/Vanessa-atalanta-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 1200. The answer is the JSON object the model would return, nothing else, written to `answers/P1/Vanessa-atalanta-de.json`.

## System

You write the "Steckbrief" text of one species page in a small nature atlas for people who walk in their own Landkreis.

The closed world:
1. You know nothing about this species beyond the numbered fact lines you are given. Not its colour, shape, pattern, size, sound, behaviour, habitat, history or reputation. If no line says it, it is not true for this text, even when you are sure of it.
2. Every sentence cites the ids of the lines it rests on, and every claim in the sentence must be found in one of those lines. A claim without a line behind it is a defect.
3. No adjectives of appearance or character ("striking", "shy", "small", "black", "typical", "well known", "common"). No inference: a diet word "omnivore" does not become "feeds on worms and berries"; a partner list does not become "important food plant"; a month profile becomes "most reports in …" and says nothing about breeding, hibernation, flight periods or migration unless a line does.
4. GloBI lines are records of observed interactions, not habits. Write them as records: "wurde beim Fressen von X beobachtet", "als Fressfeind verzeichnet ist Y" / "has been recorded eating X", "Y is recorded as a predator". Name at most four partners per sentence, prefer partners with a common name, name a partner as the sheet names it, and leave out a partner that contradicts biology as the other lines describe it. Do not add a life stage (Raupe, larva, adult) or a frequency the line does not carry.
5. Numbers keep their unit as given; round for the reader, never convert.
6. When the sheet is thin, the text is short. Two sentences are a complete text. One paragraph is a complete text. Never fill.
7. At most two paragraphs, together at most 140 words. First: what a walker meets — group, size, status, when in Mainz-Bingen (the month line of Mainz-Bingen; other regions only if it is missing). Second: how it lives — food, partners, reproduction, lifespan. Plain, warm, precise. No headings, bullets or emoji, no "according to the data". Do not repeat the species name in every sentence.
8. Write in the language of the sheet. Names stay as the sheet gives them; do not translate a partner name.

Answer with JSON only:
{"paragraphs":[{"sentences":[{"text":"<one sentence>","cites":["F3","F7"]}, ...]}, {"sentences":[...]}]}

## User

Sprache: Deutsch (kein Du; neutral oder ohne Anrede).
Art: Vanessa atalanta (Admiral).
Region des Lesers: Mainz-Bingen.

FAKTEN:
F1 [GBIF] Wissenschaftlicher Name Vanessa atalanta; Rang Art; Klasse Insecta, Ordnung Lepidoptera; Gruppe: Insekt oder Spinne.
F2 [Wikidata] Deutscher Name: Admiral.
F3 [Wikidata] Englischer Name: Red Admiral.
F4 [IUCN Red List] Status: LC (nicht gefährdet).
F5 [GloBI] frisst: Gemeiner Efeu (Hedera helix), Rote Spornblume (Centranthus ruber), Große Brennnessel (Urtica dioica), Wiesenklee (Trifolium pratense), Gänseblümchen (Bellis perennis), Kulturapfel (Malus domestica), Möhre (Daucus carota), Gewöhnlicher Wasserdost (Eupatorium cannabinum), Gewöhnlicher Löwenzahn (Taraxacum officinale), Sumpf-Kratzdistel (Cirsium palustre), Luzerne (Medicago sativa), Schmuckkörbchen (Cosmos bipinnatus) und 2 weitere.
F6 [GloBI] wird gefressen von: Hornisse (Vespa crabro), Bienenfresser (Merops apiaster).
F7 [GloBI] bestäubt: Feld-Mannstreu (Eryngium campestre).
F8 [GloBI] besucht Blüten von: Gemeiner Flieder (Syringa vulgaris), Gewöhnlicher Wasserdost (Eupatorium cannabinum), Acker-Kratzdistel (Cirsium arvense), Gewöhnlicher Löwenzahn (Taraxacum officinale), Gemeiner Efeu (Hedera helix), Lorbeerkirsche (Prunus laurocerasus), Knoblauchsrauke (Alliaria petiolata), Wiesenklee (Trifolium pratense), Rote Spornblume (Centranthus ruber), Möhre (Daucus carota), Eingriffeliger Weißdorn (Crataegus monogyna), Magerwiesen-Margerite (Leucanthemum vulgare) und 33 weitere.
F9 [GBIF occurrences] Region Mainz-Bingen: 594 Meldungen in zehn Jahren; Hauptzeit „Feb–Apr · Jun–Okt“; Monatsprofil in % des stärksten Monats: Jan 1, Feb 31, Mär 44, Apr 28, Mai 12, Jun 50, Jul 100, Aug 98, Sep 74, Okt 69, Nov 21, Dez 6.
F10 [GBIF occurrences] Region Schagen: 1672 Meldungen in zehn Jahren; Hauptzeit „Mai–Okt“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 4, Apr 19, Mai 35, Jun 70, Jul 100, Aug 71, Sep 58, Okt 29, Nov 13, Dez 0.
F11 [GBIF occurrences] Region Südwestpfalz: 634 Meldungen in zehn Jahren; Hauptzeit „Feb–Mär · Sep–Okt“; Monatsprofil in % des stärksten Monats: Jan 1, Feb 100, Mär 62, Apr 16, Mai 2, Jun 18, Jul 24, Aug 23, Sep 48, Okt 41, Nov 22, Dez 7.
