# prompts/P1/Bombus-pascuorum-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 1200. The answer is the JSON object the model would return, nothing else, written to `answers/P1/Bombus-pascuorum-de.json`.

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
Art: Bombus pascuorum (Ackerhummel).
Region des Lesers: Mainz-Bingen.

FAKTEN:
F1 [GBIF] Wissenschaftlicher Name Bombus pascuorum; Rang Art; Klasse Insecta, Ordnung Hymenoptera; Gruppe: Insekt oder Spinne.
F2 [Wikidata] Deutscher Name: Ackerhummel.
F3 [Wikidata] Englischer Name: Common Carder Bee.
F4 [IUCN Red List] Status: LC (nicht gefährdet).
F5 [GloBI] frisst: Wiesenklee (Trifolium pratense), Oregano (Origanum vulgare), Gewöhnlicher Natternkopf (Echium vulgare), Weißklee (Trifolium repens), Purpurrote Taubnessel (Lamium purpureum), Gewöhnlicher Teufelsabbiss (Succisa pratensis), Weiße Taubnessel (Lamium album), Rispen-Flockenblume (Centaurea stoebe), Echter Beinwell (Symphytum officinale), Gundermann (Glechoma hederacea), Acker-Witwenblume (Knautia arvensis), Moschus-Malve (Malva moschata) und 12 weitere.
F6 [GloBI] wird gefressen von: Veränderliche Krabbenspinne (Misumena vatia).
F7 [GloBI] besucht Blüten von: Sumpf-Kratzdistel (Cirsium palustre), Gewöhnlicher Teufelsabbiss (Succisa pratensis), Skabiosen-Flockenblume (Centaurea scabiosa), Wiesen-Platterbse (Lathyrus pratensis), Acker-Kratzdistel (Cirsium arvense), Zaun-Wicke (Vicia sepium), Acker-Witwenblume (Knautia arvensis), Roter Fingerhut (Digitalis purpurea), Kriechender Günsel (Ajuga reptans), Gundermann (Glechoma hederacea), Wiesen-Storchschnabel (Geranium pratense), Purpurrote Taubnessel (Lamium purpureum) und 84 weitere.
F8 [GBIF occurrences] Region Mainz-Bingen: 572 Meldungen in zehn Jahren; Hauptzeit „Apr–Sep“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 12, Apr 39, Mai 33, Jun 72, Jul 71, Aug 100, Sep 47, Okt 18, Nov 0, Dez 0.
F9 [GBIF occurrences] Region Schagen: 500 Meldungen in zehn Jahren; Hauptzeit „Apr–Sep“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 11, Apr 100, Mai 59, Jun 93, Jul 96, Aug 83, Sep 56, Okt 18, Nov 0, Dez 0.
F10 [GBIF occurrences] Region Südwestpfalz: 144 Meldungen in zehn Jahren; Hauptzeit „Apr · Jun · Aug“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 24, Apr 100, Mai 23, Jun 53, Jul 10, Aug 32, Sep 16, Okt 12, Nov 0, Dez 0.
