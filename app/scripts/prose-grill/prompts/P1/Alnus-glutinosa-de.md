# prompts/P1/Alnus-glutinosa-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 1200. The answer is the JSON object the model would return, nothing else, written to `answers/P1/Alnus-glutinosa-de.json`.

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
Art: Alnus glutinosa (Schwarz-Erle).
Region des Lesers: Mainz-Bingen.

FAKTEN:
F1 [GBIF] Wissenschaftlicher Name Alnus glutinosa; Rang Art; Klasse Magnoliopsida, Ordnung Fagales; Gruppe: Pflanze.
F2 [Wikidata] Deutscher Name: Schwarz-Erle.
F3 [Wikidata] Englischer Name: Black Alder.
F4 [IUCN Red List] Status: LC (nicht gefährdet).
F5 [GIFT (Weigelt et al.)] Höhe: bis 25 m.
F6 [GIFT (Weigelt et al.)] Lebensform: Baum oder Strauch.
F7 [GIFT (Weigelt et al.)] Blütezeit: Apr.
F8 [GIFT (Weigelt et al.)] Bestäubung: Wind.
F9 [GloBI] wird gefressen von: Stieglitz (Carduelis carduelis), Moschusbock (Aromia moschata).
F10 [GloBI] Wirt von: Schmetterlings-Tramete (Trametes versicolor), Zunderschwamm (Fomes fomentarius), Graugelber Breitflügelspanner (Agriopis marginaria), Rotrandiger Baumschwamm (Fomitopsis pinicola), Lindenschwärmer (Mimas tiliae), Geweihförmige Holzkeule (Xylaria hypoxylon).
F11 [GBIF occurrences] Region Mainz-Bingen: 27 Meldungen in zehn Jahren; Hauptzeit „Ganzes Jahr“; Monatsprofil in % des stärksten Monats: Jan 59, Feb 28, Mär 16, Apr 13, Mai 31, Jun 38, Jul 28, Aug 47, Sep 41, Okt 38, Nov 31, Dez 100.
F12 [GBIF occurrences] Region Schagen: 79 Meldungen in zehn Jahren; Hauptzeit „Jan–Mär · Mai–Nov“; Monatsprofil in % des stärksten Monats: Jan 41, Feb 92, Mär 84, Apr 6, Mai 41, Jun 92, Jul 39, Aug 100, Sep 90, Okt 65, Nov 37, Dez 0.
