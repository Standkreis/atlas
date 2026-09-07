# prompts/audit-P3/Mantis-religiosa-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P3/Mantis-religiosa-en.json`.

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
F1 [GBIF occurrences] Region Mainz-Bingen: 630 reports in ten years; main time "Aug–Sep"; month profile as % of the peak month: Jan 2, Feb 1, Mar 1, Apr 1, May 1, Jun 4, Jul 20, Aug 76, Sep 100, Oct 21, Nov 3, Dec 1.
F2 [GloBI] eats: Western honey bee (Apis mellifera) — 10 GloBI records.
F3 [GloBI] eats: Common Wasp (Vespula vulgaris) — 4 GloBI records.
F4 [GloBI] eats: Great Green Bush-cricket (Tettigonia viridissima) — 2 GloBI records.
F5 [GloBI] eats: Blue-winged Grasshopper (Oedipoda caerulescens) — 2 GloBI records.
F6 [GloBI] eats: Common Wall Lizard (Podarcis muralis) — 2 GloBI records.
F7 [GloBI] is eaten by: Asian hornet (Vespa velutina) — 5 GloBI records.
F8 [GloBI] is eaten by: House sparrow (Passer domesticus) — 2 GloBI records.

TEXT (sentence n, cited ids, text):
1. [F2,F3,F4,F5,F6] The European mantis has been recorded eating the Western honey bee, the Common Wasp, the Great Green Bush-cricket, the Blue-winged Grasshopper, and the Common Wall Lizard.
2. [F7,F8] The Asian hornet and the House sparrow are recorded as predators.
3. [F1] In the Mainz-Bingen region, its main time is August and September.
