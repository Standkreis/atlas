# prompts/audit-P1/Vanessa-atalanta-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Vanessa-atalanta-de.json`.

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

TEXT (sentence n, cited ids, text):
1. [F1,F4] Vanessa atalanta ist ein Insekt aus der Ordnung Lepidoptera und gilt als nicht gefährdet (LC).
2. [F9] In Mainz-Bingen liegen 594 Meldungen aus zehn Jahren vor, mit Hauptzeit im Februar–April und Juni–Oktober.
3. [F5] Es wurde beim Fressen von Gemeiner Efeu, Rote Spornblume, Große Brennnessel und Wiesenklee beobachtet.
4. [F6] Als Fressfeinde verzeichnet sind Hornisse und Bienenfresser.
5. [F7,F8] Es bestäubt Feld-Mannstreu und wurde beim Blütenbesuch bei Gemeiner Flieder, Gewöhnlicher Wasserdost, Acker-Kratzdistel und Gewöhnlicher Löwenzahn beobachtet.
