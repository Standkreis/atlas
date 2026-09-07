# prompts/audit-P1/Bombus-pascuorum-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Bombus-pascuorum-en.json`.

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
F1 [GBIF] Scientific name Bombus pascuorum; rank species; class Insecta, order Hymenoptera; group: Insect or spider.
F2 [Wikidata] German name: Ackerhummel.
F3 [Wikidata] English name: Common Carder Bee.
F4 [IUCN Red List] Status: LC (least concern).
F5 [GloBI] eats: Red Clover (Trifolium pratense), Oregano (Origanum vulgare), Blueweed (Echium vulgare), White Clover (Trifolium repens), Red Dead-nettle (Lamium purpureum), Devil's-Bit Scabious (Succisa pratensis), White Dead-nettle (Lamium album), Spotted Knapweed (Centaurea stoebe), Common Comfrey (Symphytum officinale), Ground Ivy (Glechoma hederacea), field scabious (Knautia arvensis), Musk mallow (Malva moschata) and 12 more.
F6 [GloBI] is eaten by: Goldenrod Crab Spider (Misumena vatia).
F7 [GloBI] visits flowers of: Marsh Thistle (Cirsium palustre), Devil's-Bit Scabious (Succisa pratensis), Greater Knapweed (Centaurea scabiosa), Meadow vetchling (Lathyrus pratensis), Creeping Thistle (Cirsium arvense), Bush Vetch (Vicia sepium), field scabious (Knautia arvensis), Foxglove (Digitalis purpurea), Bugle (Ajuga reptans), Ground Ivy (Glechoma hederacea), Meadow Crane's-bill (Geranium pratense), Red Dead-nettle (Lamium purpureum) and 84 more.
F8 [GBIF occurrences] Region Mainz-Bingen: 572 reports in ten years; main time "Apr–Sep"; month profile as % of the peak month: Jan 0, Feb 0, Mar 12, Apr 39, May 33, Jun 72, Jul 71, Aug 100, Sep 47, Oct 18, Nov 0, Dec 0.
F9 [GBIF occurrences] Region Schagen: 500 reports in ten years; main time "Apr–Sep"; month profile as % of the peak month: Jan 0, Feb 0, Mar 11, Apr 100, May 59, Jun 93, Jul 96, Aug 83, Sep 56, Oct 18, Nov 0, Dec 0.
F10 [GBIF occurrences] Region Südwestpfalz: 144 reports in ten years; main time "Apr · Jun · Aug"; month profile as % of the peak month: Jan 0, Feb 0, Mar 24, Apr 100, May 23, Jun 53, Jul 10, Aug 32, Sep 16, Oct 12, Nov 0, Dec 0.

TEXT (sentence n, cited ids, text):
1. [F1,F3,F4] The Common Carder Bee is an insect in the order Hymenoptera and is assessed by the IUCN Red List as LC (least concern).
2. [F8] In Mainz-Bingen, 572 reports have been logged in ten years, with a main time from April to September and most reports in August.
3. [F5] It has been recorded eating Red Clover, Oregano, Blueweed and White Clover, among other plants.
4. [F6] Goldenrod Crab Spider is recorded as a predator.
5. [F7] It has been recorded visiting flowers of Marsh Thistle, Greater Knapweed, Meadow vetchling and Foxglove.
