# prompts/audit-P1/Pieris-napi-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Pieris-napi-en.json`.

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
F1 [GBIF] Scientific name Pieris napi; rank species; class Insecta, order Lepidoptera; group: Insect or spider.
F2 [Wikidata] German name: Rapsweißling.
F3 [Wikidata] English name: Green-veined white.
F4 [GloBI] eats: Oregano (Origanum vulgare), Cuckoo Flower (Cardamine pratensis), field scabious (Knautia arvensis), Tufted Vetch (Vicia cracca).
F5 [GloBI] visits flowers of: Oregano (Origanum vulgare), Garlic Mustard (Alliaria petiolata), Red Dead-nettle (Lamium purpureum), Purple Loosestrife (Lythrum salicaria), Daisy (Bellis perennis), Devil's-Bit Scabious (Succisa pratensis), Black Horehound (Ballota nigra), Ragged Robin (Silene flos-cuculi), Ground Ivy (Glechoma hederacea), Small Scabious (Scabiosa columbaria), Alfalfa (Medicago sativa), Red Clover (Trifolium pratense) and 38 more.
F6 [GBIF occurrences] Region Mainz-Bingen: 569 reports in ten years; main time "Apr–Sep"; month profile as % of the peak month: Jan 0, Feb 0, Mar 18, Apr 98, May 51, Jun 78, Jul 100, Aug 81, Sep 42, Oct 12, Nov 0, Dec 0.
F7 [GBIF occurrences] Region Schagen: 802 reports in ten years; main time "Apr–Sep"; month profile as % of the peak month: Jan 0, Feb 0, Mar 4, Apr 83, May 75, Jun 53, Jul 98, Aug 100, Sep 30, Oct 1, Nov 0, Dec 0.
F8 [GBIF occurrences] Region Südwestpfalz: 473 reports in ten years; main time "Apr–May · Jul–Sep"; month profile as % of the peak month: Jan 0, Feb 0, Mar 0, Apr 100, May 41, Jun 14, Jul 49, Aug 54, Sep 65, Oct 7, Nov 0, Dec 0.

TEXT (sentence n, cited ids, text):
1. [F1,F3] The Green-veined white is an insect in the order Lepidoptera.
2. [F6] In Mainz-Bingen, 569 reports have been logged in ten years, with a main time from April to September and most reports in July.
3. [F4] It has been recorded eating Oregano, Cuckoo Flower, field scabious and Tufted Vetch.
4. [F5] It has been recorded visiting flowers of Garlic Mustard, Daisy, Ground Ivy and Alfalfa.
