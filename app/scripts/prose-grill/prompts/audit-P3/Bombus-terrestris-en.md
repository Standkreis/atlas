# prompts/audit-P3/Bombus-terrestris-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P3/Bombus-terrestris-en.json`.

## System

You audit a species text against the numbered fact lines it was written from. For every sentence give:
1. "verdict": "supported" (every claim in the sentence follows from the cited lines), "partial" (some claim goes beyond the cited lines or rests on an uncited line), "unsupported" (a claim that no line states, or that contradicts a line). Be strict: rounding is fine, a unit change is fine; an added adjective of colour, size, behaviour or place, a cause, a season, a habit or preference read out of a record, a "typical" or "important" is not.
2. A GloBI line ("n GloBI-Belege" / "n GloBI records") is the record of an observed interaction. It grants every wording that only restates the record or names its kind: "beobachtet", "verzeichnet", "registriert", "nachgewiesen", "Fressfeind", "Beute", "Nahrung", "Wirt", "Blütenbesucher", "Bestäuber" / "observed", "recorded", "documented", "predator", "prey", "food", "host", "flower visitor", "pollinator". It does not grant a habit, a frequency, a life stage, a preference or a partner the line does not name. The species' own name and a plain group word for it (Falter, Vogel, Pilz / butterfly, bird, fungus) are not claims, like the region.
3. Direction is a claim: "frisst: X" states the species eats X, "wird gefressen von: Y" states Y eats the species, "Wirt von: Z" states the species hosts Z, "besucht Blüten von: P" states the species visits P. A sentence whose grammar reverses who eats, hosts or visits whom ("Sie wurde beim Fressen von Y beobachtet" for an "is eaten by" line; "Als Wirt verzeichnet sind Z" for a "host of" line) contradicts the line: "unsupported", whatever the vocabulary.
4. Decide the verdict first and keep it. "why" has at most 25 words, explains the verdict and never argues against it; if you notice while writing that the sentence is supported, the verdict is "supported".
5. "claims": every atomic claim in the sentence (one fact per claim, at most 12 words, in the language of the text), each with "fact": the id of the line that states it (any line, cited or not), or null when no line states it. Names, group words and the region are not claims; "it is nocturnal" is a claim.
Answer with JSON only, the verdict before anything else in each sentence:
{"sentences":[{"n":1,"verdict":"supported|partial|unsupported","why":"<≤ 25 words; empty when supported>","claims":[{"claim":"<text>","fact":"F3"}, {"claim":"<text>","fact":null}]}]}

## User

FACTS:
F1 [GBIF occurrences] Region Mainz-Bingen: 728 reports in ten years; main time "Feb–Sep"; month profile as % of the peak month: Jan 2, Feb 29, Mar 77, Apr 63, May 31, Jun 99, Jul 100, Aug 65, Sep 47, Oct 20, Nov 4, Dec 0.
F2 [GloBI] visits flowers of: Greater Knapweed (Centaurea scabiosa) — 224 GloBI records.
F3 [GloBI] visits flowers of: Creeping Thistle (Cirsium arvense) — 189 GloBI records.
F4 [GloBI] visits flowers of: White Clover (Trifolium repens) — 138 GloBI records.
F5 [GloBI] visits flowers of: Heather (Calluna vulgaris) — 132 GloBI records.
F6 [GloBI] visits flowers of: Oregano (Origanum vulgare) — 110 GloBI records.
F7 [GloBI] visits flowers of: field scabious (Knautia arvensis) — 89 GloBI records.
F8 [GloBI] visits flowers of: Himalayan balsam (Impatiens glandulifera) — 84 GloBI records.
F9 [GloBI] visits flowers of: common dandelion (Taraxacum officinale) — 80 GloBI records.

TEXT (sentence n, cited ids, text):
1. [F1] The Buff-tailed Bumblebee has been reported in Mainz-Bingen mainly from February to September, peaking in June and July.
2. [F2,F3,F4] It has been recorded visiting the flowers of Greater Knapweed, Creeping Thistle, and White Clover.
3. [F5,F6,F7,F8,F9] It has also been recorded visiting the flowers of Heather, Oregano, field scabious, Himalayan balsam, and common dandelion.
