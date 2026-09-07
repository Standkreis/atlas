# prompts/audit-P1/Salamandra-salamandra-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Salamandra-salamandra-de.json`.

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
F1 [GBIF] Wissenschaftlicher Name Salamandra salamandra; Rang Art; Klasse Amphibia, Ordnung Caudata; Gruppe: Amphibie.
F2 [Wikidata] Deutscher Name: Feuersalamander.
F3 [Wikidata] Englischer Name: Fire salamander.
F4 [IUCN Red List] Status: VU (gefährdet).
F5 [AmphiBIO] Nahrung: Gliederfüßer.
F6 [AmphiBIO] Gewicht: 36 g.
F7 [AmphiBIO] Länge: 28 cm.
F8 [AmphiBIO] Lebensraum: an Land, im Wasser, im Boden.
F9 [AmphiBIO] Aktiv: tagsüber, in der Dämmerung, nachts.
F10 [GloBI] frisst: Lumbricidae (Lumbricidae).
F11 [GloBI] wird gefressen von: Barrenringelnatter (Natrix helvetica), Domestic Cat (Felis catus), Natrix maura (Natrix maura), Natrix natrix (Natrix natrix).
F12 [GBIF occurrences] Region Mainz-Bingen: 48 Meldungen in zehn Jahren; Hauptzeit „Mär–Mai · Aug–Dez“; Monatsprofil in % des stärksten Monats: Jan 12, Feb 0, Mär 30, Apr 50, Mai 60, Jun 18, Jul 18, Aug 30, Sep 64, Okt 100, Nov 62, Dez 42.
F13 [GBIF occurrences] Region Südwestpfalz: 106 Meldungen in zehn Jahren; Hauptzeit „Feb–Mär · Sep–Dez“; Monatsprofil in % des stärksten Monats: Jan 5, Feb 85, Mär 44, Apr 20, Mai 8, Jun 3, Jul 7, Aug 2, Sep 38, Okt 92, Nov 100, Dez 64.

TEXT (sentence n, cited ids, text):
1. [F1,F4] Der Feuersalamander ist eine Amphibie und gilt als gefährdet (VU).
2. [F7,F6] Er wird 28 cm lang und 36 g schwer.
3. [F12] In Mainz-Bingen liegen 48 Meldungen aus zehn Jahren vor, vor allem im März bis Mai und im August bis Dezember.
4. [F8,F9] Er lebt an Land, im Wasser und im Boden und ist tagsüber, in der Dämmerung und nachts aktiv.
5. [F5,F10] Er frisst Gliederfüßer und wurde beim Fressen von Lumbricidae beobachtet.
6. [F11] Als Fressfeinde sind Barrenringelnatter, Domestic Cat, Natrix maura und Natrix natrix verzeichnet.
