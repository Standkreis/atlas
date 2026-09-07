# prompts/audit-P3/Bombus-terrestris-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P3/Bombus-terrestris-de.json`.

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
F1 [GBIF occurrences] Region Mainz-Bingen: 728 Meldungen in zehn Jahren; Hauptzeit „Feb–Sep“; Monatsprofil in % des stärksten Monats: Jan 2, Feb 29, Mär 77, Apr 63, Mai 31, Jun 99, Jul 100, Aug 65, Sep 47, Okt 20, Nov 4, Dez 0.
F2 [GloBI] besucht Blüten von: Skabiosen-Flockenblume (Centaurea scabiosa) — 224 GloBI-Belege.
F3 [GloBI] besucht Blüten von: Acker-Kratzdistel (Cirsium arvense) — 189 GloBI-Belege.
F4 [GloBI] besucht Blüten von: Weißklee (Trifolium repens) — 138 GloBI-Belege.
F5 [GloBI] besucht Blüten von: Besenheide (Calluna vulgaris) — 132 GloBI-Belege.
F6 [GloBI] besucht Blüten von: Oregano (Origanum vulgare) — 110 GloBI-Belege.
F7 [GloBI] besucht Blüten von: Acker-Witwenblume (Knautia arvensis) — 89 GloBI-Belege.
F8 [GloBI] besucht Blüten von: Drüsiges Springkraut (Impatiens glandulifera) — 84 GloBI-Belege.
F9 [GloBI] besucht Blüten von: Gewöhnlicher Löwenzahn (Taraxacum officinale) — 80 GloBI-Belege.

TEXT (sentence n, cited ids, text):
1. [F1] Die Dunkle Erdhummel wurde in der Region Mainz-Bingen vor allem von Februar bis September gemeldet, mit Schwerpunkt im Juni und Juli.
2. [F2,F3,F4] Sie wurde beim Blütenbesuch an der Skabiosen-Flockenblume, der Acker-Kratzdistel und dem Weißklee beobachtet.
3. [F5,F6,F7,F8,F9] Ebenso wurde sie an Besenheide, Oregano, der Acker-Witwenblume, dem Drüsigen Springkraut und dem Gewöhnlichen Löwenzahn beim Blütenbesuch beobachtet.
