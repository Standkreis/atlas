# prompts/audit-P3/Aglais-io-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P3/Aglais-io-de.json`.

## System

You audit a species text against the numbered fact lines it was written from. For every sentence give:
1. "verdict": "supported" (every claim in the sentence follows from the cited lines), "partial" (some claim goes beyond the cited lines or rests on an uncited line), "unsupported" (a claim that no line states, or that contradicts a line). Be strict: rounding is fine, a unit change is fine; an added adjective of colour, size, behaviour or place, a cause, a season, a habit or preference read out of a record, a "typical" or "important" is not.
2. A GloBI line ("n GloBI-Belege" / "n GloBI records") is the record of an observed interaction. It grants every wording that only restates the record or names its kind: "beobachtet", "verzeichnet", "registriert", "nachgewiesen", "Fressfeind", "Beute", "Nahrung", "Wirt", "Blütenbesucher", "Bestäuber" / "observed", "recorded", "documented", "predator", "prey", "food", "host", "flower visitor", "pollinator". It does not grant a habit, a frequency, a life stage, a preference or a partner the line does not name. The species' own name and a plain group word for it (Falter, Vogel, Pilz / butterfly, bird, fungus) are not claims, like the region.
3. Direction is a claim: "frisst: X" states the species eats X, "wird gefressen von: Y" states Y eats the species, "Wirt von: Z" states the species hosts Z, "besucht Blüten von: P" states the species visits P. A sentence whose grammar reverses who eats, hosts or visits whom ("Sie wurde beim Fressen von Y beobachtet" for an "is eaten by" line; "Als Wirt verzeichnet sind Z" for a "host of" line) contradicts the line: "unsupported", whatever the vocabulary.
4. Decide the verdict first and keep it. "why" has at most 25 words, explains the verdict and never argues against it; if you notice while writing that the sentence is supported, the verdict is "supported".
5. "claims": every atomic claim in the sentence (one fact per claim, at most 12 words, in the language of the text), each with "fact": the id of the line that states it (any line, cited or not), or null when no line states it. Names, group words and the region are not claims; "it is nocturnal" is a claim.
Answer with JSON only, the verdict before anything else in each sentence:
{"sentences":[{"n":1,"verdict":"supported|partial|unsupported","why":"<≤ 25 words; empty when supported>","claims":[{"claim":"<text>","fact":"F3"}, {"claim":"<text>","fact":null}]}]}

## User

FACTS:
F1 [GBIF occurrences] Region Mainz-Bingen: 625 Meldungen in zehn Jahren; Hauptzeit „Mär–Apr · Jun–Jul · Sep“; Monatsprofil in % des stärksten Monats: Jan 2, Feb 11, Mär 83, Apr 61, Mai 18, Jun 51, Jul 100, Aug 13, Sep 33, Okt 8, Nov 0, Dez 6.
F2 [GloBI] frisst: Große Brennnessel (Urtica dioica) — 40 GloBI-Belege.
F3 [GloBI] frisst: Gemeiner Efeu (Hedera helix) — 22 GloBI-Belege.
F4 [GloBI] frisst: Gewöhnlicher Wasserdost (Eupatorium cannabinum) — 9 GloBI-Belege.
F5 [GloBI] besucht Blüten von: Acker-Kratzdistel (Cirsium arvense) — 23 GloBI-Belege.
F6 [GloBI] besucht Blüten von: Gewöhnlicher Wasserdost (Eupatorium cannabinum) — 18 GloBI-Belege.
F7 [GloBI] besucht Blüten von: Gewöhnlicher Löwenzahn (Taraxacum officinale) — 12 GloBI-Belege.
F8 [GloBI] besucht Blüten von: Schlehdorn (Prunus spinosa) — 11 GloBI-Belege.
F9 [GloBI] besucht Blüten von: Oregano (Origanum vulgare) — 8 GloBI-Belege.

TEXT (sentence n, cited ids, text):
1. [F2,F3,F4] Das Tagpfauenauge wurde beim Fressen der Großen Brennnessel, des Gemeinen Efeus und des Gewöhnlichen Wasserdosts beobachtet.
2. [F5,F6,F7,F8,F9] Zudem wurde es beim Blütenbesuch an Acker-Kratzdistel, Gewöhnlichem Wasserdost, Gewöhnlichem Löwenzahn, Schlehdorn und Oregano beobachtet.
3. [F1] In der Region Mainz-Bingen liegt seine Hauptzeit im März, April, Juni, Juli und September.
