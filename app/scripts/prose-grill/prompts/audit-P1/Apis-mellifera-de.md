# prompts/audit-P1/Apis-mellifera-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Apis-mellifera-de.json`.

## System

You audit a species text against the numbered fact lines it was written from. For every sentence give:
1. "verdict": "supported" (every claim in the sentence follows from the cited lines), "partial" (some claim goes beyond the cited lines or rests on an uncited line), "unsupported" (a claim that no line states, or that contradicts a line). Be strict: rounding is fine, a unit change is fine; an added adjective of colour, size, behaviour or place, a cause, a season, a habit or preference read out of a record, a "typical" or "important" is not.
2. A GloBI line ("n GloBI-Belege" / "n GloBI records") is the record of an observed interaction. It grants every wording that only restates the record or names its kind: "beobachtet", "verzeichnet", "registriert", "nachgewiesen", "Fressfeind", "Beute", "Nahrung", "Wirt", "Blütenbesucher", "Bestäuber" / "observed", "recorded", "documented", "predator", "prey", "food", "host", "flower visitor", "pollinator". It does not grant a habit, a frequency, a life stage, a preference or a partner the line does not name. The species' own name and a plain group word for it (Falter, Vogel, Pilz / butterfly, bird, fungus) are not claims, like the region.
3. Decide the verdict first and keep it. "why" has at most 25 words, explains the verdict and never argues against it; if you notice while writing that the sentence is supported, the verdict is "supported".
4. "claims": every atomic claim in the sentence (one fact per claim, at most 12 words, in the language of the text), each with "fact": the id of the line that states it (any line, cited or not), or null when no line states it. Names, group words and the region are not claims; "it is nocturnal" is a claim.
Answer with JSON only, the verdict before anything else in each sentence:
{"sentences":[{"n":1,"verdict":"supported|partial|unsupported","why":"<≤ 25 words; empty when supported>","claims":[{"claim":"<text>","fact":"F3"}, {"claim":"<text>","fact":null}]}]}

## User

FACTS:
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

TEXT (sentence n, cited ids, text):
1. [F8] In Mainz-Bingen liegen 593 Meldungen aus zehn Jahren vor, mit Hauptzeit Februar bis Oktober.
2. [F4] Der Erhaltungszustand ist nach der IUCN Roten Liste als unzureichende Datenlage (DD) eingestuft.
3. [F1] Sie zählt zur Gruppe Insekt oder Spinne, Klasse Insecta, Ordnung Hymenoptera.
4. [F5] Beim Fressen wurde sie an Gewöhnlicher Kratzdistel, Schmuckkörbchen, Borretsch und Gewöhnlichem Löwenzahn beobachtet.
5. [F6] Als Fressfeinde sind Asiatische Hornisse, Veränderliche Krabbenspinne, Südliche Glanz-Krabbenspinne und Bienenwolf verzeichnet.
6. [F7] Blüten besucht wurden bei Rainfarn-Phazelie, Loesels Rauke, Geruchloser Kamille und Zweiblättrigem Blaustern.
