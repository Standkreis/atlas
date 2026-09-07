# prompts/audit-P1/Alnus-glutinosa-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Alnus-glutinosa-de.json`.

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
F1 [GBIF] Wissenschaftlicher Name Alnus glutinosa; Rang Art; Klasse Magnoliopsida, Ordnung Fagales; Gruppe: Pflanze.
F2 [Wikidata] Deutscher Name: Schwarz-Erle.
F3 [Wikidata] Englischer Name: Black Alder.
F4 [IUCN Red List] Status: LC (nicht gefährdet).
F5 [GIFT (Weigelt et al.)] Höhe: bis 25 m.
F6 [GIFT (Weigelt et al.)] Lebensform: Baum oder Strauch.
F7 [GIFT (Weigelt et al.)] Blütezeit: Apr.
F8 [GIFT (Weigelt et al.)] Bestäubung: Wind.
F9 [GloBI] wird gefressen von: Stieglitz (Carduelis carduelis), Moschusbock (Aromia moschata).
F10 [GloBI] Wirt von: Schmetterlings-Tramete (Trametes versicolor), Zunderschwamm (Fomes fomentarius), Graugelber Breitflügelspanner (Agriopis marginaria), Rotrandiger Baumschwamm (Fomitopsis pinicola), Lindenschwärmer (Mimas tiliae), Geweihförmige Holzkeule (Xylaria hypoxylon).
F11 [GBIF occurrences] Region Mainz-Bingen: 27 Meldungen in zehn Jahren; Hauptzeit „Ganzes Jahr“; Monatsprofil in % des stärksten Monats: Jan 59, Feb 28, Mär 16, Apr 13, Mai 31, Jun 38, Jul 28, Aug 47, Sep 41, Okt 38, Nov 31, Dez 100.
F12 [GBIF occurrences] Region Schagen: 79 Meldungen in zehn Jahren; Hauptzeit „Jan–Mär · Mai–Nov“; Monatsprofil in % des stärksten Monats: Jan 41, Feb 92, Mär 84, Apr 6, Mai 41, Jun 92, Jul 39, Aug 100, Sep 90, Okt 65, Nov 37, Dez 0.

TEXT (sentence n, cited ids, text):
1. [F1,F6,F5,F4] Es handelt sich um eine Pflanze, genauer einen Baum oder Strauch mit einer Höhe von bis zu 25 m; der Status ist LC (nicht gefährdet).
2. [F11] In Mainz-Bingen wurden binnen zehn Jahren 27 Meldungen erfasst, mit der Hauptzeit Ganzes Jahr.
3. [F7,F8] Die Blütezeit liegt im Apr, bestäubt wird durch Wind.
4. [F9] Gefressen wird sie von Stieglitz und Moschusbock.
5. [F10] Als Wirt dient sie unter anderem für Schmetterlings-Tramete, Zunderschwamm, Graugelber Breitflügelspanner und Rotrandiger Baumschwamm.
