# prompts/audit-P1/Pieris-rapae-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Pieris-rapae-en.json`.

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
F1 [GBIF] Scientific name Pieris rapae; rank species; class Insecta, order Lepidoptera; group: Insect or spider.
F2 [Wikidata] German name: Kleiner Kohlweißling.
F3 [Wikidata] English name: Small White.
F4 [GloBI] eats: Red Clover (Trifolium pratense), Valeriana rubra (Centranthus ruber), common dandelion (Taraxacum officinale), Rapeseed (Brassica napus), Hawkweed Oxtongue (Picris hieracioides), Alfalfa (Medicago sativa), Purple Loosestrife (Lythrum salicaria), Oregano (Origanum vulgare), Heal-all (Prunella vulgaris), Hedge Mustard (Sisymbrium officinale), Tall Fleabane (Erigeron annuus), Bull Thistle (Cirsium vulgare) and 26 more.
F5 [GloBI] is eaten by: Goldenrod Crab Spider (Misumena vatia), House sparrow (Passer domesticus).
F6 [GloBI] visits flowers of: Shepherd's-purse (Capsella bursa-pastoris), Dewberry (Rubus caesius), Meadow Buttercup (Ranunculus acris), Germander Speedwell (Veronica chamaedrys), Ribwort Plantain (Plantago lanceolata).
F7 [GBIF occurrences] Region Mainz-Bingen: 576 reports in ten years; main time "Jun–Sep"; month profile as % of the peak month: Jan 0, Feb 0, Mar 7, Apr 22, May 16, Jun 46, Jul 66, Aug 100, Sep 65, Oct 24, Nov 3, Dec 3.
F8 [GBIF occurrences] Region Kyoto: 64 reports in ten years; main time "May–Jul"; month profile as % of the peak month: Jan 0, Feb 0, Mar 3, Apr 13, May 100, Jun 79, Jul 40, Aug 6, Sep 5, Oct 0, Nov 9, Dec 0.
F9 [GBIF occurrences] Region Schagen: 747 reports in ten years; main time "Apr–Sep"; month profile as % of the peak month: Jan 0, Feb 1, Mar 17, Apr 46, May 32, Jun 30, Jul 82, Aug 100, Sep 90, Oct 19, Nov 5, Dec 0.
F10 [GBIF occurrences] Region Südwestpfalz: 391 reports in ten years; main time "Apr · Jun–Oct"; month profile as % of the peak month: Jan 0, Feb 5, Mar 2, Apr 29, May 16, Jun 37, Jul 36, Aug 48, Sep 100, Oct 64, Nov 0, Dec 0.

TEXT (sentence n, cited ids, text):
1. [F1,F3] Pieris rapae, known as the Small White, is an insect in the order Lepidoptera.
2. [F7] In Mainz-Bingen, 576 reports have been logged in ten years, mostly from June to September, with most reports in August.
3. [F4] It has been recorded eating Red Clover, common dandelion, Rapeseed and Hawkweed Oxtongue, among other plants.
4. [F5] Goldenrod Crab Spider and House sparrow are recorded as predators.
5. [F6] It has been recorded visiting flowers of Shepherd's-purse, Dewberry, Meadow Buttercup and Germander Speedwell.
