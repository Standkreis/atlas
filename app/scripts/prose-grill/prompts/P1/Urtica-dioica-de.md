# prompts/P1/Urtica-dioica-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 1200. The answer is the JSON object the model would return, nothing else, written to `answers/P1/Urtica-dioica-de.json`.

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
Art: Urtica dioica (Große Brennnessel).
Region des Lesers: Mainz-Bingen.

FAKTEN:
F1 [GBIF] Wissenschaftlicher Name Urtica dioica; Rang Art; Klasse Magnoliopsida, Ordnung Rosales; Gruppe: Pflanze.
F2 [Wikidata] Deutscher Name: Große Brennnessel.
F3 [Wikidata] Englischer Name: Stinging Nettle.
F4 [IUCN Red List] Status: LC (nicht gefährdet).
F5 [GIFT (Weigelt et al.)] Höhe: bis 3 m.
F6 [GIFT (Weigelt et al.)] Lebensform: Staude.
F7 [GIFT (Weigelt et al.)] Blütezeit: Mai–Okt.
F8 [GIFT (Weigelt et al.)] Bestäubung: Wind.
F9 [GloBI] frisst: Colpocephalum indi (Colpocephalum indi), Splendoroffula tauracobia (Splendoroffula tauracobia), Eomenopon ryani (Eomenopon ryani), Myrsidea breviventris (Myrsidea breviventris), Eomenopon sintillatae (Eomenopon sintillatae).
F10 [GloBI] wird gefressen von: Tagpfauenauge (Aglais io), Kleiner Fuchs (Aglais urticae), Eupteryx cyclops (Eupteryx cyclops), Eupteryx urticae (Eupteryx urticae), Eupteryx aurata (Eupteryx aurata), Eupteryx calcarata (Eupteryx calcarata), Macropsis scutellatus (Macropsis scutellatus), Aphrodes makarovi (Aphrodes makarovi), Agallia consobrina (Agallia consobrina), Colladonus mendicus (Colladonus mendicus), Metcalfa pruinosa (Metcalfa pruinosa), Orientus ishidae (Orientus ishidae) und 4 weitere.
F11 [GloBI] Wirt von: Tagpfauenauge (Aglais io), Landkärtchen (Araschnia levana), Kleiner Fuchs (Aglais urticae), Puccinia caricina (Puccinia caricina), Ramularia urticae (Ramularia urticae), Leptosphaeria acuta (Leptosphaeria acuta), Puccinia urticata (Puccinia urticata), Puccinia urticae (Puccinia urticae), Erysiphe urticae (Erysiphe urticae), Septoria urticae (Septoria urticae), Leptosphaeria conoidea (Leptosphaeria conoidea), Didymella eupyrena (Didymella eupyrena) und 13 weitere.
F12 [GBIF occurrences] Region Mainz-Bingen: 259 Meldungen in zehn Jahren; Hauptzeit „Apr–Jul“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 14, Apr 31, Mai 100, Jun 28, Jul 37, Aug 15, Sep 18, Okt 25, Nov 9, Dez 3.
F13 [GBIF occurrences] Region Schagen: 101 Meldungen in zehn Jahren; Hauptzeit „Ganzes Jahr“; Monatsprofil in % des stärksten Monats: Jan 22, Feb 49, Mär 43, Apr 49, Mai 62, Jun 100, Jul 59, Aug 56, Sep 95, Okt 62, Nov 46, Dez 60.
F14 [GBIF occurrences] Region Südwestpfalz: 52 Meldungen in zehn Jahren; Hauptzeit „Feb · Apr–Sep“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 72, Mär 0, Apr 56, Mai 100, Jun 70, Jul 89, Aug 36, Sep 54, Okt 0, Nov 0, Dez 0.
