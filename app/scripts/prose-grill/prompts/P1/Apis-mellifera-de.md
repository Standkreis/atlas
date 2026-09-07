# prompts/P1/Apis-mellifera-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 1200. The answer is the JSON object the model would return, nothing else, written to `answers/P1/Apis-mellifera-de.json`.

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
Art: Apis mellifera (Westliche Honigbiene).
Region des Lesers: Mainz-Bingen.

FAKTEN:
F1 [GBIF] Wissenschaftlicher Name Apis mellifera; Rang Art; Klasse Insecta, Ordnung Hymenoptera; Gruppe: Insekt oder Spinne.
F2 [Wikidata] Deutscher Name: Westliche Honigbiene.
F3 [Wikidata] Englischer Name: Western honey bee.
F4 [IUCN Red List] Status: DD (ungenügende Daten).
F5 [GloBI] frisst: Gewöhnliche Kratzdistel (Cirsium vulgare), Schmuckkörbchen (Cosmos bipinnatus), Borretsch (Borago officinalis), Gewöhnlicher Löwenzahn (Taraxacum officinale), Rainfarn-Phazelie (Phacelia tanacetifolia), Gemeine Schafgarbe (Achillea millefolium), Zottige Wicke (Vicia villosa), Kornblume (Centaurea cyanus), Weißer Steinklee (Melilotus albus), Oregano (Origanum vulgare), Gemeiner Efeu (Hedera helix), Gewöhnlicher Hornklee (Lotus corniculatus) und 66 weitere.
F6 [GloBI] wird gefressen von: Asiatische Hornisse (Vespa velutina), Veränderliche Krabbenspinne (Misumena vatia), Südliche Glanz-Krabbenspinne (Synema globosum), Bienenwolf (Philanthus triangulum), Flower Spider (Thomisus onustus), Hornisse (Vespa crabro), Deutsche Wespe (Vespula germanica), Gartenkreuzspinne (Araneus diadematus), Europäische Gottesanbeterin (Mantis religiosa), Eichblatt-Radspinne (Aculepeira ceropegia), Gemeine Wespe (Vespula vulgaris), Bienenfresser (Merops apiaster).
F7 [GloBI] besucht Blüten von: Rainfarn-Phazelie (Phacelia tanacetifolia), Loesels Rauke (Sisymbrium loeselii), Geruchlose Kamille (Tripleurospermum inodorum), Zweiblättriger Blaustern (Scilla bifolia), Pyrenäen-Storchschnabel (Geranium pyrenaicum), Schwarzer Holunder (Sambucus nigra), Färberwaid (Isatis tinctoria), Crown Vetch (Coronilla varia), Mehlige Königskerze (Verbascum lychnitis), Zwerg-Holunder (Sambucus ebulus), Aufrechter Ziest (Stachys recta), Orientalisches Zackenschötchen (Bunias orientalis) und 5 weitere.
F8 [GBIF occurrences] Region Mainz-Bingen: 593 Meldungen in zehn Jahren; Hauptzeit „Feb–Okt“; Monatsprofil in % des stärksten Monats: Jan 4, Feb 41, Mär 54, Apr 37, Mai 30, Jun 100, Jul 75, Aug 100, Sep 66, Okt 31, Nov 11, Dez 4.
F9 [GBIF occurrences] Region Kyoto: 17 Meldungen in zehn Jahren; Hauptzeit „Jun–Jul“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 11, Mär 0, Apr 7, Mai 19, Jun 100, Jul 46, Aug 0, Sep 0, Okt 0, Nov 0, Dez 13.
F10 [GBIF occurrences] Region Schagen: 412 Meldungen in zehn Jahren; Hauptzeit „Apr–Aug“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 9, Mär 19, Apr 100, Mai 33, Jun 61, Jul 50, Aug 35, Sep 24, Okt 8, Nov 2, Dez 0.
F11 [GBIF occurrences] Region Südwestpfalz: 97 Meldungen in zehn Jahren; Hauptzeit „Feb–Apr · Jun–Sep“; Monatsprofil in % des stärksten Monats: Jan 14, Feb 77, Mär 55, Apr 35, Mai 7, Jun 100, Jul 38, Aug 34, Sep 25, Okt 0, Nov 0, Dez 0.
