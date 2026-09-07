# prompts/audit-P1/Grus-grus-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Grus-grus-en.json`.

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
F1 [GBIF] Scientific name Grus grus; rank species; class Aves, order Gruiformes; group: Bird.
F2 [Wikidata] German name: Kranich.
F3 [Wikidata] English name: Common crane.
F4 [IUCN Red List] Status: LC (least concern).
F5 [AVONET] Diet: omnivore.
F6 [AVONET] Mass: 5.5 kg.
F7 [AVONET] Habitat: wetland.
F8 [EltonTraits] Active: by day.
F9 [AnAge] Lifespan: up to 43 years (wild).
F10 [Wikidata] Wingspan: 2.2 m.
F11 [AVONET] Migration: migratory.
F12 [GBIF occurrences] Region Mainz-Bingen: 977 reports in ten years; main time "Feb · Oct–Dec"; month profile as % of the peak month: Jan 19, Feb 100, Mar 6, Apr 1, May 0, Jun 0, Jul 0, Aug 0, Sep 0, Oct 70, Nov 88, Dec 30.
F13 [GBIF occurrences] Region Südwestpfalz: 142 reports in ten years; main time "Feb · Oct–Dec"; month profile as % of the peak month: Jan 7, Feb 100, Mar 4, Apr 0, May 0, Jun 0, Jul 0, Aug 0, Sep 0, Oct 28, Nov 74, Dec 52.

TEXT (sentence n, cited ids, text):
1. [F1,F6,F10] The common crane is a bird with a mass of 5.5 kg and a wingspan of 2.2 m.
2. [F4] Its status is listed as least concern (LC) by the IUCN.
3. [F12] In Mainz-Bingen it has 977 reports over ten years, with peaks in February and between October and December.
4. [F5,F7] It feeds as an omnivore and lives in wetlands.
5. [F8,F11] It is active by day and migrates.
6. [F9] In the wild it can live up to 43 years.
