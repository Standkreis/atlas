# prompts/audit-P1/Mantis-religiosa-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Mantis-religiosa-en.json`.

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
F1 [GBIF] Scientific name Mantis religiosa; rank species; class Insecta, order Mantodea; group: Insect or spider.
F2 [Wikidata] German name: Europäische Gottesanbeterin.
F3 [Wikidata] English name: European mantis.
F4 [IUCN Red List] Status: LC (least concern).
F5 [GloBI] eats: Western honey bee (Apis mellifera), Common Wasp (Vespula vulgaris), Great Green Bush-cricket (Tettigonia viridissima), Blue-winged Grasshopper (Oedipoda caerulescens), Common Wall Lizard (Podarcis muralis), Orthoptera (Orthoptera), Acrididae (Acrididae), Colias eurytheme (Colias eurytheme), Insecta (Insecta), Pterygota (Pterygota), Vespidae (Vespidae), Cicadidae (Cicadidae) and 2 more.
F6 [GloBI] is eaten by: Asian hornet (Vespa velutina), House sparrow (Passer domesticus), Falco sparverius (Falco sparverius), Hierodula transcaucasica (Hierodula transcaucasica), Emberiza calandra (Emberiza calandra), Sphodromantis viridis (Sphodromantis viridis).
F7 [GBIF occurrences] Region Mainz-Bingen: 630 reports in ten years; main time "Aug–Sep"; month profile as % of the peak month: Jan 2, Feb 1, Mar 1, Apr 1, May 1, Jun 4, Jul 20, Aug 76, Sep 100, Oct 21, Nov 3, Dec 1.
F8 [GBIF occurrences] Region Südwestpfalz: 224 reports in ten years; main time "Aug–Oct"; month profile as % of the peak month: Jan 0, Feb 0, Mar 0, Apr 1, May 0, Jun 1, Jul 6, Aug 45, Sep 100, Oct 39, Nov 0, Dec 0.

TEXT (sentence n, cited ids, text):
1. [F1,F4] Mantis religiosa is an insect, listed as least concern (LC).
2. [F7] In Mainz-Bingen, 630 reports over ten years show a main time of Aug–Sep.
3. [F5] It has been recorded eating Western honey bee, Common Wasp, Great Green Bush-cricket and Blue-winged Grasshopper.
4. [F6] Asian hornet and House sparrow are recorded as predators.
