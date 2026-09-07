# prompts/P1/Zoropsis-spinimana-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 1200. The answer is the JSON object the model would return, nothing else, written to `answers/P1/Zoropsis-spinimana-de.json`.

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
Art: Zoropsis spinimana (Nosferatu-Spinne).
Region des Lesers: Mainz-Bingen.

FAKTEN:
F1 [GBIF] Wissenschaftlicher Name Zoropsis spinimana; Rang Art; Klasse Arachnida, Ordnung Araneae; Gruppe: Insekt oder Spinne.
F2 [Wikidata] Deutscher Name: Nosferatu-Spinne.
F3 [Wikidata] Englischer Name: Zoropsid spider.
F4 [GBIF occurrences] Region Mainz-Bingen: 1077 Meldungen in zehn Jahren; Hauptzeit „Aug–Nov“; Monatsprofil in % des stärksten Monats: Jan 12, Feb 16, Mär 16, Apr 14, Mai 6, Jun 4, Jul 12, Aug 28, Sep 100, Okt 45, Nov 34, Dez 17.
F5 [GBIF occurrences] Region Südwestpfalz: 35 Meldungen in zehn Jahren; Hauptzeit „Okt–Dez“; Monatsprofil in % des stärksten Monats: Jan 3, Feb 10, Mär 18, Apr 2, Mai 1, Jun 3, Jul 1, Aug 5, Sep 15, Okt 26, Nov 39, Dez 100.
