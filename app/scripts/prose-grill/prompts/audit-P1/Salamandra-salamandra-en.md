# prompts/audit-P1/Salamandra-salamandra-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Salamandra-salamandra-en.json`.

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
F1 [GBIF] Scientific name Salamandra salamandra; rank species; class Amphibia, order Caudata; group: Amphibian.
F2 [Wikidata] German name: Feuersalamander.
F3 [Wikidata] English name: Fire salamander.
F4 [IUCN Red List] Status: VU (vulnerable).
F5 [AmphiBIO] Diet: arthropods.
F6 [AmphiBIO] Mass: 36 g.
F7 [AmphiBIO] Length: 28 cm.
F8 [AmphiBIO] Habitat: on land, in water, underground.
F9 [AmphiBIO] Active: by day, at dusk and dawn, at night.
F10 [GloBI] eats: Lumbricidae (Lumbricidae).
F11 [GloBI] is eaten by: Barred grass snake (Natrix helvetica), Domestic Cat (Felis catus), Natrix maura (Natrix maura), Natrix natrix (Natrix natrix).
F12 [GBIF occurrences] Region Mainz-Bingen: 48 reports in ten years; main time "Mar–May · Aug–Dec"; month profile as % of the peak month: Jan 12, Feb 0, Mar 30, Apr 50, May 60, Jun 18, Jul 18, Aug 30, Sep 64, Oct 100, Nov 62, Dec 42.
F13 [GBIF occurrences] Region Südwestpfalz: 106 reports in ten years; main time "Feb–Mar · Sep–Dec"; month profile as % of the peak month: Jan 5, Feb 85, Mar 44, Apr 20, May 8, Jun 3, Jul 7, Aug 2, Sep 38, Oct 92, Nov 100, Dec 64.

TEXT (sentence n, cited ids, text):
1. [F1,F4] Fire salamander is an amphibian and is listed as vulnerable (VU).
2. [F7,F6] It grows to 28 cm and weighs 36 g.
3. [F12] In Mainz-Bingen there are 48 reports in ten years, mainly in March to May and August to December.
4. [F8,F9] It lives on land, in water and underground, and is active by day, at dusk and dawn, and at night.
5. [F5,F10] Its diet is arthropods, and it has been recorded eating Lumbricidae.
6. [F11] It is recorded as prey of Barred grass snake, Domestic Cat, Natrix maura and Natrix natrix.
