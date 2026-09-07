# prompts/audit-P1/Polyommatus-icarus-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Polyommatus-icarus-en.json`.

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
F1 [GBIF] Scientific name Polyommatus icarus; rank species; class Insecta, order Lepidoptera; group: Insect or spider.
F2 [Wikidata] German name: Hauhechel-Bläuling.
F3 [Wikidata] English name: Common blue.
F4 [GloBI] eats: Bird's-foot Trefoil (Lotus corniculatus), Oregano (Origanum vulgare), Black Medick (Medicago lupulina), Red Clover (Trifolium pratense), Alfalfa (Medicago sativa), White Clover (Trifolium repens), Sickle Medick (Medicago falcata).
F5 [GloBI] is eaten by: Goldenrod Crab Spider (Misumena vatia), Flower Spider (Thomisus onustus).
F6 [GloBI] pollinates: Bloodwort (Achillea millefolium).
F7 [GloBI] visits flowers of: Bird's-foot Trefoil (Lotus corniculatus), White Clover (Trifolium repens), Tansy (Tanacetum vulgare), Alfalfa (Medicago sativa), Red Clover (Trifolium pratense), Creeping Thistle (Cirsium arvense), Oregano (Origanum vulgare), Tufted Vetch (Vicia cracca), Black Medick (Medicago lupulina), Queen Anne's Lace (Daucus carota), Sainfoin (Onobrychis viciifolia), English Ivy (Hedera helix) and 41 more.
F8 [GBIF occurrences] Region Mainz-Bingen: 580 reports in ten years; main time "May–Sep"; month profile as % of the peak month: Jan 0, Feb 0, Mar 0, Apr 1, May 38, Jun 27, Jul 84, Aug 98, Sep 100, Oct 13, Nov 0, Dec 0.
F9 [GBIF occurrences] Region Schagen: 1716 reports in ten years; main time "May–Sep"; month profile as % of the peak month: Jan 0, Feb 0, Mar 0, Apr 1, May 93, Jun 64, Jul 100, Aug 89, Sep 37, Oct 1, Nov 0, Dec 0.
F10 [GBIF occurrences] Region Südwestpfalz: 1060 reports in ten years; main time "May–Oct"; month profile as % of the peak month: Jan 0, Feb 0, Mar 0, Apr 0, May 30, Jun 41, Jul 46, Aug 100, Sep 75, Oct 31, Nov 0, Dec 0.

TEXT (sentence n, cited ids, text):
1. [F8] In Mainz-Bingen there are 580 reports over ten years, with main time May to September.
2. [F1] It belongs to the group Insect or spider, class Insecta, order Lepidoptera.
3. [F4] It has been recorded eating Bird's-foot Trefoil, Oregano, Black Medick and Red Clover.
4. [F5] Recorded as predators are Goldenrod Crab Spider and Flower Spider.
5. [F6] It has been recorded pollinating Bloodwort.
6. [F7] It has been recorded visiting flowers of Bird's-foot Trefoil, White Clover, Tansy and Alfalfa.
