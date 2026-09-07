# prompts/audit-P1/Alnus-glutinosa-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Alnus-glutinosa-en.json`.

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
F1 [GBIF] Scientific name Alnus glutinosa; rank species; class Magnoliopsida, order Fagales; group: Plant.
F2 [Wikidata] German name: Schwarz-Erle.
F3 [Wikidata] English name: Black Alder.
F4 [IUCN Red List] Status: LC (least concern).
F5 [GIFT (Weigelt et al.)] Height: up to 25 m.
F6 [GIFT (Weigelt et al.)] Life form: tree or shrub.
F7 [GIFT (Weigelt et al.)] Flowering: Apr.
F8 [GIFT (Weigelt et al.)] Pollination: wind.
F9 [GloBI] is eaten by: European goldfinch (Carduelis carduelis), Musk beetle (Aromia moschata).
F10 [GloBI] host of: Turkeytail (Trametes versicolor), Tinder Bracket (Fomes fomentarius), Dotted border (Agriopis marginaria), Red-Belted Bracket (Fomitopsis pinicola), Lime Hawk-Moth (Mimas tiliae), Candlesnuff Fungus (Xylaria hypoxylon).
F11 [GBIF occurrences] Region Mainz-Bingen: 27 reports in ten years; main time "Ganzes Jahr"; month profile as % of the peak month: Jan 59, Feb 28, Mar 16, Apr 13, May 31, Jun 38, Jul 28, Aug 47, Sep 41, Oct 38, Nov 31, Dec 100.
F12 [GBIF occurrences] Region Schagen: 79 reports in ten years; main time "Jan–Mar · May–Nov"; month profile as % of the peak month: Jan 41, Feb 92, Mar 84, Apr 6, May 41, Jun 92, Jul 39, Aug 100, Sep 90, Oct 65, Nov 37, Dec 0.

TEXT (sentence n, cited ids, text):
1. [F1,F6,F5,F4] It is a plant, specifically a tree or shrub with a height of up to 25 m; its status is LC (least concern).
2. [F11] In Mainz-Bingen, 27 reports were recorded in ten years, with the main time Ganzes Jahr.
3. [F7,F8] Flowering occurs in Apr, with pollination by wind.
4. [F9] It is eaten by the European goldfinch and Musk beetle.
5. [F10] It serves as host to, among others, Turkeytail, Tinder Bracket, Dotted border, and Red-Belted Bracket.
