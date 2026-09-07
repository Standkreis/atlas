# prompts/audit-P2/Urtica-dioica-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P2/Urtica-dioica-en.json`.

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
F1 [GIFT (Weigelt et al.)] Pollination: wind.
F2 [GBIF occurrences] Region Mainz-Bingen: 259 reports in ten years; main time "Apr–Jul"; month profile as % of the peak month: Jan 0, Feb 0, Mar 14, Apr 31, May 100, Jun 28, Jul 37, Aug 15, Sep 18, Oct 25, Nov 9, Dec 3.
F3 [GloBI] is eaten by: Peacock (Aglais io) — 3 GloBI records.
F4 [GloBI] is eaten by: Small tortoiseshell (Aglais urticae) — 2 GloBI records.
F5 [GloBI] host of: Peacock (Aglais io) — 3 GloBI records.
F6 [GloBI] host of: Map (Araschnia levana) — 2 GloBI records.
F7 [GloBI] host of: Small tortoiseshell (Aglais urticae) — 2 GloBI records.

TEXT (sentence n, cited ids, text):
1. [F1] Stinging nettle is pollinated by wind.
2. [F3,F4] The peacock and the small tortoiseshell have been recorded eating stinging nettle, with 3 and 2 GloBI records respectively.
3. [F5,F6,F7] It is also recorded as a host plant for the peacock (3 GloBI records), the map (2 GloBI records), and the small tortoiseshell (2 GloBI records).
4. [F2] In Mainz-Bingen, most reports fall between April and July.
