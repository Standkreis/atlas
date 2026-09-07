# prompts/audit-P3/Turdus-merula-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P3/Turdus-merula-en.json`.

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
F1 [AVONET] Diet: omnivore.
F2 [AVONET, EltonTraits] Habitat: forest, on the ground.
F3 [EltonTraits] Active: by day.
F4 [GBIF occurrences] Region Mainz-Bingen: 6009 reports in ten years; main time "Ganzes Jahr"; month profile as % of the peak month: Jan 100, Feb 85, Mar 63, Apr 50, May 43, Jun 38, Jul 36, Aug 21, Sep 36, Oct 49, Nov 84, Dec 95.
F5 [GloBI] eats: Hawthorn (Crataegus monogyna) — 40 GloBI records.
F6 [GloBI] eats: Rowan (Sorbus aucuparia) — 37 GloBI records.
F7 [GloBI] eats: Elder (Sambucus nigra) — 24 GloBI records.
F8 [GloBI] eats: Guelder Rose (Viburnum opulus) — 24 GloBI records.
F9 [GloBI] eats: English Ivy (Hedera helix) — 22 GloBI records.
F10 [GloBI] eats: Dogwood (Cornus sanguinea) — 20 GloBI records.
F11 [GloBI] eats: Bird Cherry (Prunus padus) — 19 GloBI records.
F12 [GloBI] eats: Dog rose (Rosa canina) — 17 GloBI records.

TEXT (sentence n, cited ids, text):
1. [F1,F2,F3] The common blackbird is an omnivore that lives in forest and on the ground, active by day.
2. [F5,F6,F7,F8] It has been recorded eating Hawthorn, Rowan, Elder and Guelder Rose.
3. [F9,F10,F11,F12] English Ivy, Dogwood, Bird Cherry and Dog rose are also among the recorded food plants.
4. [F4] In Mainz-Bingen 6009 reports have been logged over ten years, with the peak time spanning the whole year.
