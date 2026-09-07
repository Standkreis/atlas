# prompts/audit-P1/Grus-grus-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Grus-grus-de.json`.

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
F1 [GBIF] Wissenschaftlicher Name Grus grus; Rang Art; Klasse Aves, Ordnung Gruiformes; Gruppe: Vogel.
F2 [Wikidata] Deutscher Name: Kranich.
F3 [Wikidata] Englischer Name: Common crane.
F4 [IUCN Red List] Status: LC (nicht gefährdet).
F5 [AVONET] Nahrung: Allesfresser.
F6 [AVONET] Gewicht: 5,5 kg.
F7 [AVONET] Lebensraum: Feuchtgebiet.
F8 [EltonTraits] Aktiv: tagsüber.
F9 [AnAge] Alter: bis 43 Jahre (frei lebend).
F10 [Wikidata] Spannweite: 2,2 m.
F11 [AVONET] Zug: Zugvogel.
F12 [GBIF occurrences] Region Mainz-Bingen: 977 Meldungen in zehn Jahren; Hauptzeit „Feb · Okt–Dez“; Monatsprofil in % des stärksten Monats: Jan 19, Feb 100, Mär 6, Apr 1, Mai 0, Jun 0, Jul 0, Aug 0, Sep 0, Okt 70, Nov 88, Dez 30.
F13 [GBIF occurrences] Region Südwestpfalz: 142 Meldungen in zehn Jahren; Hauptzeit „Feb · Okt–Dez“; Monatsprofil in % des stärksten Monats: Jan 7, Feb 100, Mär 4, Apr 0, Mai 0, Jun 0, Jul 0, Aug 0, Sep 0, Okt 28, Nov 74, Dez 52.

TEXT (sentence n, cited ids, text):
1. [F1,F6,F10] Der Kranich ist ein Vogel mit einem Gewicht von 5,5 kg und einer Spannweite von 2,2 m.
2. [F4] Der Bestand gilt laut IUCN als nicht gefährdet (LC).
3. [F12] In Mainz-Bingen liegen 977 Meldungen aus zehn Jahren vor, mit Schwerpunkten im Februar sowie zwischen Oktober und Dezember.
4. [F5,F7] Er ernährt sich als Allesfresser und lebt in Feuchtgebieten.
5. [F8,F11] Er ist tagsüber aktiv und zieht als Zugvogel.
6. [F9] Frei lebend kann er bis zu 43 Jahre alt werden.
