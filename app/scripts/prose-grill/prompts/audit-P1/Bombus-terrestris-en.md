# prompts/audit-P1/Bombus-terrestris-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Bombus-terrestris-en.json`.

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
F1 [GBIF] Scientific name Bombus terrestris; rank species; class Insecta, order Hymenoptera; group: Insect or spider.
F2 [Wikidata] German name: Dunkle Erdhummel.
F3 [Wikidata] English name: Buff-tailed Bumblebee.
F4 [GloBI] eats: Garden cosmos (Cosmos bipinnatus), Spotted Dead-nettle (Lamium maculatum), Apple (Malus domestica), Phacelia (Phacelia tanacetifolia).
F5 [GloBI] visits flowers of: Greater Knapweed (Centaurea scabiosa), Creeping Thistle (Cirsium arvense), White Clover (Trifolium repens), Heather (Calluna vulgaris), Oregano (Origanum vulgare), field scabious (Knautia arvensis), Himalayan balsam (Impatiens glandulifera), common dandelion (Taraxacum officinale), Devil's-Bit Scabious (Succisa pratensis), Hogweed (Heracleum sphondylium), Foxglove (Digitalis purpurea), Borage (Borago officinalis) and 120 more.
F6 [GBIF occurrences] Region Mainz-Bingen: 728 reports in ten years; main time "Feb–Sep"; month profile as % of the peak month: Jan 2, Feb 29, Mar 77, Apr 63, May 31, Jun 99, Jul 100, Aug 65, Sep 47, Oct 20, Nov 4, Dec 0.
F7 [GBIF occurrences] Region Schagen: 408 reports in ten years; main time "Mar–Apr · Jun–Aug"; month profile as % of the peak month: Jan 0, Feb 6, Mar 43, Apr 100, May 21, Jun 65, Jul 85, Aug 44, Sep 12, Oct 2, Nov 3, Dec 0.
F8 [GBIF occurrences] Region Südwestpfalz: 123 reports in ten years; main time "Feb–Apr · Jun"; month profile as % of the peak month: Jan 0, Feb 100, Mar 76, Apr 30, May 3, Jun 39, Jul 20, Aug 15, Sep 14, Oct 10, Nov 0, Dec 0.

TEXT (sentence n, cited ids, text):
1. [F1,F3] The Buff-tailed Bumblebee is an insect in the order Hymenoptera.
2. [F6] In Mainz-Bingen, 728 reports were recorded over ten years, with the main time running from February to September.
3. [F4] It has been recorded eating Garden cosmos, Spotted Dead-nettle, Apple, and Phacelia.
4. [F5] Flower visits have been recorded at Greater Knapweed, Creeping Thistle, White Clover, and Heather, among others.
