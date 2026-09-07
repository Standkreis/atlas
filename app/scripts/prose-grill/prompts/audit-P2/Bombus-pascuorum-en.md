# prompts/audit-P2/Bombus-pascuorum-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P2/Bombus-pascuorum-en.json`.

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
F1 [GBIF occurrences] Region Mainz-Bingen: 572 reports in ten years; main time "Apr–Sep"; month profile as % of the peak month: Jan 0, Feb 0, Mar 12, Apr 39, May 33, Jun 72, Jul 71, Aug 100, Sep 47, Oct 18, Nov 0, Dec 0.
F2 [GloBI] visits flowers of: Marsh Thistle (Cirsium palustre) — 499 GloBI records.
F3 [GloBI] visits flowers of: Devil's-Bit Scabious (Succisa pratensis) — 266 GloBI records.
F4 [GloBI] visits flowers of: Greater Knapweed (Centaurea scabiosa) — 261 GloBI records.
F5 [GloBI] visits flowers of: Meadow vetchling (Lathyrus pratensis) — 235 GloBI records.
F6 [GloBI] visits flowers of: Creeping Thistle (Cirsium arvense) — 221 GloBI records.
F7 [GloBI] visits flowers of: Bush Vetch (Vicia sepium) — 213 GloBI records.
F8 [GloBI] visits flowers of: field scabious (Knautia arvensis) — 174 GloBI records.
F9 [GloBI] visits flowers of: Foxglove (Digitalis purpurea) — 173 GloBI records.

TEXT (sentence n, cited ids, text):
1. [F1] In the Mainz-Bingen region, the Common Carder Bee has 572 reports over ten years, with a main season from April to September and the strongest numbers in August.
2. [F2,F3,F4] It has been recorded visiting flowers of Marsh Thistle (499 GloBI records), Devil's-Bit Scabious (266) and Greater Knapweed (261).
3. [F5,F6,F7] Further records show flower visits to Meadow vetchling (235), Creeping Thistle (221) and Bush Vetch (213).
4. [F8,F9] It has also been recorded visiting field scabious (174 records) and Foxglove (173 records).
