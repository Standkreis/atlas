# prompts/audit-P1/Turdus-merula-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Turdus-merula-en.json`.

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
F1 [GBIF] Scientific name Turdus merula; rank species; class Aves, order Passeriformes; group: Bird.
F2 [Wikidata] German name: Amsel.
F3 [Wikidata] English name: Common blackbird.
F4 [IUCN Red List] Status: LC (least concern).
F5 [AVONET] Diet: omnivore.
F6 [AVONET] Mass: 103 g.
F7 [AVONET, EltonTraits] Habitat: forest, on the ground.
F8 [EltonTraits] Active: by day.
F9 [AnAge] Lifespan: up to 21.8 years (wild).
F10 [Wikidata] Wingspan: 36 cm.
F11 [AVONET] Migration: resident.
F12 [AnAge] Offspring: mature at 365 days.
F13 [GloBI] eats: Hawthorn (Crataegus monogyna), Rowan (Sorbus aucuparia), Elder (Sambucus nigra), Guelder Rose (Viburnum opulus), English Ivy (Hedera helix), Dogwood (Cornus sanguinea), Bird Cherry (Prunus padus), Dog rose (Rosa canina), Blackthorn (Prunus spinosa), Wild Privet (Ligustrum vulgare), Sweet Cherry (Prunus avium), Wayfaring Tree (Viburnum lantana) and 4 more.
F14 [GBIF occurrences] Region Mainz-Bingen: 6009 reports in ten years; main time "Ganzes Jahr"; month profile as % of the peak month: Jan 100, Feb 85, Mar 63, Apr 50, May 43, Jun 38, Jul 36, Aug 21, Sep 36, Oct 49, Nov 84, Dec 95.
F15 [GBIF occurrences] Region Schagen: 1683 reports in ten years; main time "Ganzes Jahr"; month profile as % of the peak month: Jan 100, Feb 78, Mar 38, Apr 38, May 35, Jun 20, Jul 24, Aug 11, Sep 10, Oct 56, Nov 100, Dec 81.
F16 [GBIF occurrences] Region Südwestpfalz: 944 reports in ten years; main time "May · Nov–Mar"; month profile as % of the peak month: Jan 100, Feb 51, Mar 50, Apr 22, May 30, Jun 10, Jul 6, Aug 6, Sep 5, Oct 11, Nov 45, Dec 67.

TEXT (sentence n, cited ids, text):
1. [F1,F10] The Common blackbird belongs to the group of birds and has a wingspan of 36 cm.
2. [F4] Its status is least concern (LC).
3. [F14] In Mainz-Bingen, 6009 reports were recorded over ten years, with main time throughout the year.
4. [F5,F7] It is an omnivore and its habitat is forest, on the ground.
5. [F13] It has been recorded eating Hawthorn, Rowan, Elder and Guelder Rose.
6. [F8,F11] It is active by day and is a resident.
7. [F12,F9] Offspring mature at 365 days, and in the wild it can live up to 21.8 years.
