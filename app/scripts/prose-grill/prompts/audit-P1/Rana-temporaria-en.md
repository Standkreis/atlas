# prompts/audit-P1/Rana-temporaria-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Rana-temporaria-en.json`.

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
F1 [GBIF] Scientific name Rana temporaria; rank species; class Amphibia, order Anura; group: Amphibian.
F2 [Wikidata] German name: Grasfrosch.
F3 [Wikidata] English name: Common frog.
F4 [IUCN Red List] Status: LC (least concern).
F5 [AmphiBIO] Diet: arthropods.
F6 [AmphiBIO] Mass: 48 g.
F7 [AmphiBIO] Length: 11 cm.
F8 [AmphiBIO] Habitat: on land, in water, in trees.
F9 [AmphiBIO] Active: by day, at night.
F10 [GloBI] is eaten by: Barred grass snake (Natrix helvetica), Grey heron (Ardea cinerea), European herring gull (Larus argentatus), Red fox (Vulpes vulpes), Swamp lymnaea (Lymnaea stagnalis), Natrix natrix (Natrix natrix), Vipera berus (Vipera berus), Corvus cornix (Corvus cornix), Botaurus stellaris (Botaurus stellaris).
F11 [GBIF occurrences] Region Mainz-Bingen: 71 reports in ten years; main time "Feb–Apr"; month profile as % of the peak month: Jan 0, Feb 31, Mar 100, Apr 29, May 10, Jun 15, Jul 12, Aug 7, Sep 9, Oct 22, Nov 7, Dec 0.
F12 [GBIF occurrences] Region Schagen: 177 reports in ten years; main time "Mar–Nov"; month profile as % of the peak month: Jan 5, Feb 0, Mar 100, Apr 64, May 49, Jun 45, Jul 48, Aug 63, Sep 70, Oct 37, Nov 27, Dec 0.
F13 [GBIF occurrences] Region Südwestpfalz: 82 reports in ten years; main time "Mar · Sep–Oct"; month profile as % of the peak month: Jan 0, Feb 0, Mar 100, Apr 24, May 4, Jun 15, Jul 11, Aug 22, Sep 31, Oct 43, Nov 0, Dec 0.

TEXT (sentence n, cited ids, text):
1. [F1,F7,F6,F4] It is an amphibian with a length of 11 cm and a mass of 48 g; its status is LC (least concern).
2. [F11] In Mainz-Bingen, 71 reports were recorded in ten years, with the main time Feb–Apr.
3. [F5] Its diet consists of arthropods.
4. [F8,F9] Its habitat includes land, water, and trees, and it is active by day and at night.
5. [F10] It has been recorded as prey for the Barred grass snake, Grey heron, European herring gull, and Red fox.
