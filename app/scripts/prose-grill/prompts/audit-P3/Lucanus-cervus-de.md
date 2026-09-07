# prompts/audit-P3/Lucanus-cervus-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P3/Lucanus-cervus-de.json`.

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
F1 [GBIF occurrences] Region Mainz-Bingen: 63 Meldungen in zehn Jahren; Hauptzeit „Jun–Jul“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 0, Apr 0, Mai 19, Jun 100, Jul 51, Aug 4, Sep 0, Okt 5, Nov 0, Dez 0.
F2 [GloBI] frisst: Rotbuche (Fagus sylvatica) — 2 GloBI-Belege.
F3 [GloBI] frisst: Gemeine Esche (Fraxinus excelsior) — 2 GloBI-Belege.
F4 [GloBI] frisst: Gemeine Hasel (Corylus avellana) — 2 GloBI-Belege.

TEXT (sentence n, cited ids, text):
1. [F2,F3,F4] Der Hirschkäfer wurde beim Fressen von Rotbuche (Fagus sylvatica), Gemeiner Esche (Fraxinus excelsior) und Gemeiner Hasel (Corylus avellana) beobachtet.
2. [F1] In Mainz-Bingen wurde die Art in zehn Jahren 63-mal gemeldet, mit Schwerpunkt von Juni bis Juli.
