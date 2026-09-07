# prompts/audit-P1/Vanessa-atalanta-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Vanessa-atalanta-en.json`.

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
F1 [GBIF] Scientific name Vanessa atalanta; rank species; class Insecta, order Lepidoptera; group: Insect or spider.
F2 [Wikidata] German name: Admiral.
F3 [Wikidata] English name: Red Admiral.
F4 [IUCN Red List] Status: LC (least concern).
F5 [GloBI] eats: English Ivy (Hedera helix), Valeriana rubra (Centranthus ruber), Stinging Nettle (Urtica dioica), Red Clover (Trifolium pratense), Daisy (Bellis perennis), Apple (Malus domestica), Queen Anne's Lace (Daucus carota), Hemp Agrimony (Eupatorium cannabinum), common dandelion (Taraxacum officinale), Marsh Thistle (Cirsium palustre), Alfalfa (Medicago sativa), Garden cosmos (Cosmos bipinnatus) and 2 more.
F6 [GloBI] is eaten by: European hornet (Vespa crabro), European bee-eater (Merops apiaster).
F7 [GloBI] pollinates: Field Eryngo (Eryngium campestre).
F8 [GloBI] visits flowers of: Common Lilac (Syringa vulgaris), Hemp Agrimony (Eupatorium cannabinum), Creeping Thistle (Cirsium arvense), common dandelion (Taraxacum officinale), English Ivy (Hedera helix), cherry laurel (Prunus laurocerasus), Garlic Mustard (Alliaria petiolata), Red Clover (Trifolium pratense), Valeriana rubra (Centranthus ruber), Queen Anne's Lace (Daucus carota), Hawthorn (Crataegus monogyna), Oxeye Daisy (Leucanthemum vulgare) and 33 more.
F9 [GBIF occurrences] Region Mainz-Bingen: 594 reports in ten years; main time "Feb–Apr · Jun–Oct"; month profile as % of the peak month: Jan 1, Feb 31, Mar 44, Apr 28, May 12, Jun 50, Jul 100, Aug 98, Sep 74, Oct 69, Nov 21, Dec 6.
F10 [GBIF occurrences] Region Schagen: 1672 reports in ten years; main time "May–Oct"; month profile as % of the peak month: Jan 0, Feb 0, Mar 4, Apr 19, May 35, Jun 70, Jul 100, Aug 71, Sep 58, Oct 29, Nov 13, Dec 0.
F11 [GBIF occurrences] Region Südwestpfalz: 634 reports in ten years; main time "Feb–Mar · Sep–Oct"; month profile as % of the peak month: Jan 1, Feb 100, Mar 62, Apr 16, May 2, Jun 18, Jul 24, Aug 23, Sep 48, Oct 41, Nov 22, Dec 7.

TEXT (sentence n, cited ids, text):
1. [F1,F4] Vanessa atalanta is an insect in the order Lepidoptera, listed as least concern (LC).
2. [F9] In Mainz-Bingen, 594 reports over ten years show a main time of Feb–Apr and Jun–Oct.
3. [F5] It has been recorded eating English Ivy, Valeriana rubra, Stinging Nettle and Red Clover.
4. [F6] European hornet and European bee-eater are recorded as predators.
5. [F7,F8] It pollinates Field Eryngo and has been recorded visiting flowers of Common Lilac, Hemp Agrimony, Creeping Thistle and common dandelion.
