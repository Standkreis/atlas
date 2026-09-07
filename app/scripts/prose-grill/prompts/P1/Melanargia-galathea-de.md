# prompts/P1/Melanargia-galathea-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 1200. The answer is the JSON object the model would return, nothing else, written to `answers/P1/Melanargia-galathea-de.json`.

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
Art: Melanargia galathea (Schachbrett).
Region des Lesers: Mainz-Bingen.

FAKTEN:
F1 [GBIF] Wissenschaftlicher Name Melanargia galathea; Rang Art; Klasse Insecta, Ordnung Lepidoptera; Gruppe: Insekt oder Spinne.
F2 [Wikidata] Deutscher Name: Schachbrett.
F3 [Wikidata] Englischer Name: Marbled White.
F4 [GloBI] frisst: Wiesenklee (Trifolium pratense), Acker-Witwenblume (Knautia arvensis), Festuca rubra (Festuca rubra).
F5 [GloBI] wird gefressen von: Mauereidechse (Podarcis muralis), Flower Spider (Thomisus onustus).
F6 [GloBI] bestäubt: Kartäusernelke (Dianthus carthusianorum), Tauben-Skabiose (Scabiosa columbaria), Acker-Witwenblume (Knautia arvensis), Mittlerer Klee (Trifolium medium), Wiesenklee (Trifolium pratense), Echte Betonie (Betonica officinalis), Magerwiesen-Margerite (Leucanthemum vulgare), Wiesen-Flockenblume (Centaurea jacea), Feld-Klee (Trifolium campestre), Vogel-Wicke (Vicia cracca), Gewöhnlicher Hornklee (Lotus corniculatus), Crown Vetch (Coronilla varia) und 7 weitere.
F7 [GloBI] besucht Blüten von: Acker-Witwenblume (Knautia arvensis), Wiesenklee (Trifolium pratense), Wiesen-Flockenblume (Centaurea jacea), Skabiosen-Flockenblume (Centaurea scabiosa), Magerwiesen-Margerite (Leucanthemum vulgare), Acker-Kratzdistel (Cirsium arvense), Gewöhnliche Kratzdistel (Cirsium vulgare), Oregano (Origanum vulgare), Rote Spornblume (Centranthus ruber), Wilde Karde (Dipsacus fullonum), Rispen-Flockenblume (Centaurea stoebe), Tauben-Skabiose (Scabiosa columbaria) und 8 weitere.
F8 [GBIF occurrences] Region Mainz-Bingen: 644 Meldungen in zehn Jahren; Hauptzeit „Jun–Jul“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 0, Apr 0, Mai 2, Jun 100, Jul 63, Aug 1, Sep 0, Okt 0, Nov 0, Dez 0.
F9 [GBIF occurrences] Region Südwestpfalz: 409 Meldungen in zehn Jahren; Hauptzeit „Jun–Jul“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 0, Apr 0, Mai 0, Jun 43, Jul 100, Aug 4, Sep 0, Okt 0, Nov 0, Dez 0.
