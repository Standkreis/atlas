# prompts/audit-P1/Lycaena-phlaeas-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Lycaena-phlaeas-en.json`.

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
F1 [GBIF] Scientific name Lycaena phlaeas; rank species; class Insecta, order Lepidoptera; group: Insect or spider.
F2 [Wikidata] German name: Kleiner Feuerfalter.
F3 [Wikidata] English name: Small Copper.
F4 [GloBI] eats: Oregano (Origanum vulgare), Sorrel (Rumex acetosa), Tansy (Tanacetum vulgare), Bitter Dock (Rumex obtusifolius), Bloodwort (Achillea millefolium).
F5 [GloBI] is eaten by: Goldenrod Crab Spider (Misumena vatia).
F6 [GloBI] pollinates: Buckwheat (Fagopyrum esculentum).
F7 [GloBI] visits flowers of: Senecio jacobaea (Senecio jacobaea), Tansy (Tanacetum vulgare), Heather (Calluna vulgaris), Daisy (Bellis perennis), Creeping Thistle (Cirsium arvense), Bloodwort (Achillea millefolium), Oregano (Origanum vulgare), Field Eryngo (Eryngium campestre), Common Ragwort (Jacobaea vulgaris), Devil's-Bit Scabious (Succisa pratensis), Bulbous Buttercup (Ranunculus bulbosus), Oxeye Daisy (Leucanthemum vulgare) and 31 more.
F8 [GBIF occurrences] Region Mainz-Bingen: 126 reports in ten years; main time "Apr–May · Jul–Oct"; month profile as % of the peak month: Jan 0, Feb 0, Mar 7, Apr 53, May 38, Jun 11, Jul 79, Aug 64, Sep 100, Oct 57, Nov 0, Dec 0.
F9 [GBIF occurrences] Region Kyoto: 45 reports in ten years; main time "Apr · Jun–Aug"; month profile as % of the peak month: Jan 0, Feb 0, Mar 0, Apr 45, May 25, Jun 100, Jul 49, Aug 51, Sep 9, Oct 17, Nov 22, Dec 0.
F10 [GBIF occurrences] Region Schagen: 878 reports in ten years; main time "Apr–May · Jul–Sep"; month profile as % of the peak month: Jan 0, Feb 0, Mar 1, Apr 53, May 100, Jun 24, Jul 68, Aug 40, Sep 85, Oct 22, Nov 6, Dec 0.
F11 [GBIF occurrences] Region Südwestpfalz: 1288 reports in ten years; main time "Jul–Oct"; month profile as % of the peak month: Jan 0, Feb 0, Mar 1, Apr 19, May 24, Jun 16, Jul 47, Aug 37, Sep 100, Oct 62, Nov 8, Dec 0.

TEXT (sentence n, cited ids, text):
1. [F1] The Small Copper belongs to the group of insects or spiders.
2. [F8] In Mainz-Bingen, 126 reports were recorded over ten years, with main time from April to May and July to October.
3. [F4] It has been recorded eating Oregano, Sorrel, Tansy and Bitter Dock.
4. [F5] The Goldenrod Crab Spider is recorded as a predator.
5. [F6] It has been recorded pollinating Buckwheat.
6. [F7] It has also been recorded visiting flowers of Tansy, Heather, Daisy and Bloodwort.
