# prompts/audit-P2/Rana-temporaria-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P2/Rana-temporaria-en.json`.

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
F1 [AmphiBIO] Diet: arthropods.
F2 [AmphiBIO] Habitat: on land, in water, in trees.
F3 [AmphiBIO] Active: by day, at night.
F4 [GBIF occurrences] Region Mainz-Bingen: 71 reports in ten years; main time "Feb–Apr"; month profile as % of the peak month: Jan 0, Feb 31, Mar 100, Apr 29, May 10, Jun 15, Jul 12, Aug 7, Sep 9, Oct 22, Nov 7, Dec 0.
F5 [GloBI] is eaten by: Barred grass snake (Natrix helvetica) — 19 GloBI records.
F6 [GloBI] is eaten by: Grey heron (Ardea cinerea) — 15 GloBI records.
F7 [GloBI] is eaten by: European herring gull (Larus argentatus) — 3 GloBI records.
F8 [GloBI] is eaten by: Red fox (Vulpes vulpes) — 2 GloBI records.
F9 [GloBI] is eaten by: Swamp lymnaea (Lymnaea stagnalis) — 2 GloBI records.

TEXT (sentence n, cited ids, text):
1. [F1,F2,F3] The common frog eats arthropods and lives on land, in water and in trees; it is active by day and at night.
2. [F5,F6,F7,F8,F9] The barred grass snake, grey heron, European herring gull, red fox and swamp lymnaea are recorded as predators.
3. [F4] In the Mainz-Bingen region, 71 reports over ten years show a peak from February to April.
