# prompts/audit-P1/Turdus-merula-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Turdus-merula-de.json`.

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
F1 [GBIF] Wissenschaftlicher Name Turdus merula; Rang Art; Klasse Aves, Ordnung Passeriformes; Gruppe: Vogel.
F2 [Wikidata] Deutscher Name: Amsel.
F3 [Wikidata] Englischer Name: Common blackbird.
F4 [IUCN Red List] Status: LC (nicht gefährdet).
F5 [AVONET] Nahrung: Allesfresser.
F6 [AVONET] Gewicht: 103 g.
F7 [AVONET, EltonTraits] Lebensraum: Wald, Boden.
F8 [EltonTraits] Aktiv: tagsüber.
F9 [AnAge] Alter: bis 21,8 Jahre (frei lebend).
F10 [Wikidata] Spannweite: 36 cm.
F11 [AVONET] Zug: Standvogel.
F12 [AnAge] Nachwuchs: reif mit 365 Tagen.
F13 [GloBI] frisst: Eingriffeliger Weißdorn (Crataegus monogyna), Vogelbeere (Sorbus aucuparia), Schwarzer Holunder (Sambucus nigra), Gewöhnlicher Schneeball (Viburnum opulus), Gemeiner Efeu (Hedera helix), Roter Hartriegel (Cornus sanguinea), Gewöhnliche Traubenkirsche (Prunus padus), Hundsrose (Rosa canina), Schlehdorn (Prunus spinosa), Gewöhnlicher Liguster (Ligustrum vulgare), Vogelkirsche (Prunus avium), Wolliger Schneeball (Viburnum lantana) und 4 weitere.
F14 [GBIF occurrences] Region Mainz-Bingen: 6009 Meldungen in zehn Jahren; Hauptzeit „Ganzes Jahr“; Monatsprofil in % des stärksten Monats: Jan 100, Feb 85, Mär 63, Apr 50, Mai 43, Jun 38, Jul 36, Aug 21, Sep 36, Okt 49, Nov 84, Dez 95.
F15 [GBIF occurrences] Region Schagen: 1683 Meldungen in zehn Jahren; Hauptzeit „Ganzes Jahr“; Monatsprofil in % des stärksten Monats: Jan 100, Feb 78, Mär 38, Apr 38, Mai 35, Jun 20, Jul 24, Aug 11, Sep 10, Okt 56, Nov 100, Dez 81.
F16 [GBIF occurrences] Region Südwestpfalz: 944 Meldungen in zehn Jahren; Hauptzeit „Mai · Nov–Mär“; Monatsprofil in % des stärksten Monats: Jan 100, Feb 51, Mär 50, Apr 22, Mai 30, Jun 10, Jul 6, Aug 6, Sep 5, Okt 11, Nov 45, Dez 67.

TEXT (sentence n, cited ids, text):
1. [F1,F10] Die Amsel gehört zur Gruppe der Vögel und hat eine Spannweite von 36 cm.
2. [F4] Der Bestand gilt als nicht gefährdet (LC).
3. [F14] In Mainz-Bingen wurden in zehn Jahren 6009 Meldungen erfasst, mit Hauptzeit über das ganze Jahr.
4. [F5,F7] Sie ist ein Allesfresser und lebt in Wald und am Boden.
5. [F13] Beim Fressen wurde sie an Eingriffeligem Weißdorn, Vogelbeere, Schwarzem Holunder und Gewöhnlichem Schneeball beobachtet.
6. [F8,F11] Sie ist tagsüber aktiv und als Standvogel unterwegs.
7. [F12,F9] Der Nachwuchs ist mit 365 Tagen ausgewachsen, und frei lebend kann sie bis zu 21,8 Jahre alt werden.
