# prompts/audit-P3/Apis-mellifera-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P3/Apis-mellifera-en.json`.

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
F1 [GBIF occurrences] Region Mainz-Bingen: 593 reports in ten years; main time "Feb–Oct"; month profile as % of the peak month: Jan 4, Feb 41, Mar 54, Apr 37, May 30, Jun 100, Jul 75, Aug 100, Sep 66, Oct 31, Nov 11, Dec 4.
F2 [GloBI] eats: Bull Thistle (Cirsium vulgare) — 87 GloBI records.
F3 [GloBI] eats: Garden cosmos (Cosmos bipinnatus) — 77 GloBI records.
F4 [GloBI] eats: Borage (Borago officinalis) — 64 GloBI records.
F5 [GloBI] eats: common dandelion (Taraxacum officinale) — 62 GloBI records.
F6 [GloBI] is eaten by: Asian hornet (Vespa velutina) — 857 GloBI records.
F7 [GloBI] is eaten by: Goldenrod Crab Spider (Misumena vatia) — 149 GloBI records.
F8 [GloBI] is eaten by: Shiny crab-spider (Synema globosum) — 61 GloBI records.
F9 [GloBI] visits flowers of: Phacelia (Phacelia tanacetifolia) — 294 GloBI records.

TEXT (sentence n, cited ids, text):
1. [F1] In Mainz-Bingen, the Western honey bee is mainly reported from February to October, most often in June and August.
2. [F2,F3,F4,F5] It has been recorded eating Bull Thistle, Garden cosmos, Borage, and common dandelion.
3. [F6,F7,F8] Asian hornet, Goldenrod Crab Spider, and Shiny crab-spider are recorded as predators.
4. [F9] It has been recorded visiting the flowers of Phacelia.
