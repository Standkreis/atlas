# prompts/P1/Lycaena-phlaeas-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 1200. The answer is the JSON object the model would return, nothing else, written to `answers/P1/Lycaena-phlaeas-de.json`.

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
Art: Lycaena phlaeas (Kleiner Feuerfalter).
Region des Lesers: Mainz-Bingen.

FAKTEN:
F1 [GBIF] Wissenschaftlicher Name Lycaena phlaeas; Rang Art; Klasse Insecta, Ordnung Lepidoptera; Gruppe: Insekt oder Spinne.
F2 [Wikidata] Deutscher Name: Kleiner Feuerfalter.
F3 [Wikidata] Englischer Name: Small Copper.
F4 [GloBI] frisst: Oregano (Origanum vulgare), Wiesen-Sauerampfer (Rumex acetosa), Rainfarn (Tanacetum vulgare), Stumpfblättriger Ampfer (Rumex obtusifolius), Gemeine Schafgarbe (Achillea millefolium).
F5 [GloBI] wird gefressen von: Veränderliche Krabbenspinne (Misumena vatia).
F6 [GloBI] bestäubt: Echter Buchweizen (Fagopyrum esculentum).
F7 [GloBI] besucht Blüten von: Senecio jacobaea (Senecio jacobaea), Rainfarn (Tanacetum vulgare), Besenheide (Calluna vulgaris), Gänseblümchen (Bellis perennis), Acker-Kratzdistel (Cirsium arvense), Gemeine Schafgarbe (Achillea millefolium), Oregano (Origanum vulgare), Feld-Mannstreu (Eryngium campestre), Jakobs-Greiskraut (Jacobaea vulgaris), Gewöhnlicher Teufelsabbiss (Succisa pratensis), Knolliger Hahnenfuß (Ranunculus bulbosus), Magerwiesen-Margerite (Leucanthemum vulgare) und 31 weitere.
F8 [GBIF occurrences] Region Mainz-Bingen: 126 Meldungen in zehn Jahren; Hauptzeit „Apr–Mai · Jul–Okt“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 7, Apr 53, Mai 38, Jun 11, Jul 79, Aug 64, Sep 100, Okt 57, Nov 0, Dez 0.
F9 [GBIF occurrences] Region Kyoto: 45 Meldungen in zehn Jahren; Hauptzeit „Apr · Jun–Aug“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 0, Apr 45, Mai 25, Jun 100, Jul 49, Aug 51, Sep 9, Okt 17, Nov 22, Dez 0.
F10 [GBIF occurrences] Region Schagen: 878 Meldungen in zehn Jahren; Hauptzeit „Apr–Mai · Jul–Sep“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 1, Apr 53, Mai 100, Jun 24, Jul 68, Aug 40, Sep 85, Okt 22, Nov 6, Dez 0.
F11 [GBIF occurrences] Region Südwestpfalz: 1288 Meldungen in zehn Jahren; Hauptzeit „Jul–Okt“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 1, Apr 19, Mai 24, Jun 16, Jul 47, Aug 37, Sep 100, Okt 62, Nov 8, Dez 0.
