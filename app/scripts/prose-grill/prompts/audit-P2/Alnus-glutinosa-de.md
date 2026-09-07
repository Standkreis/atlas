# prompts/audit-P2/Alnus-glutinosa-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P2/Alnus-glutinosa-de.json`.

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
F1 [GIFT (Weigelt et al.)] Bestäubung: Wind.
F2 [GBIF occurrences] Region Mainz-Bingen: 27 Meldungen in zehn Jahren; Hauptzeit „Ganzes Jahr“; Monatsprofil in % des stärksten Monats: Jan 59, Feb 28, Mär 16, Apr 13, Mai 31, Jun 38, Jul 28, Aug 47, Sep 41, Okt 38, Nov 31, Dez 100.
F3 [GloBI] wird gefressen von: Stieglitz (Carduelis carduelis) — 5 GloBI-Belege.
F4 [GloBI] wird gefressen von: Moschusbock (Aromia moschata) — 2 GloBI-Belege.
F5 [GloBI] Wirt von: Schmetterlings-Tramete (Trametes versicolor) — 9 GloBI-Belege.
F6 [GloBI] Wirt von: Zunderschwamm (Fomes fomentarius) — 6 GloBI-Belege.
F7 [GloBI] Wirt von: Graugelber Breitflügelspanner (Agriopis marginaria) — 5 GloBI-Belege.
F8 [GloBI] Wirt von: Rotrandiger Baumschwamm (Fomitopsis pinicola) — 5 GloBI-Belege.
F9 [GloBI] Wirt von: Lindenschwärmer (Mimas tiliae) — 2 GloBI-Belege.
F10 [GloBI] Wirt von: Geweihförmige Holzkeule (Xylaria hypoxylon) — 2 GloBI-Belege.

TEXT (sentence n, cited ids, text):
1. [F1] Die Schwarz-Erle wird durch Wind bestäubt.
2. [F3,F4] Als Fressfeinde verzeichnet sind Stieglitz und Moschusbock.
3. [F5,F6,F7,F8,F9,F10] Als Wirt verzeichnet sind Schmetterlings-Tramete, Zunderschwamm, Graugelber Breitflügelspanner, Rotrandiger Baumschwamm, Lindenschwärmer und Geweihförmige Holzkeule.
4. [F2] In der Region Mainz-Bingen liegen dazu 27 Meldungen aus zehn Jahren vor, ganzjährig mit Höchstwert im Dezember.
