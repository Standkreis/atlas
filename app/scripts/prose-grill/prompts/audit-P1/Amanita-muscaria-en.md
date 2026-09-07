# prompts/audit-P1/Amanita-muscaria-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Amanita-muscaria-en.json`.

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
F1 [GBIF] Scientific name Amanita muscaria; rank species; class Agaricomycetes, order Agaricales; group: Fungus.
F2 [Wikidata] German name: Fliegenpilz.
F3 [Wikidata] English name: Fly Agaric.
F4 [Wikidata] Edibility: poisonous, psychoactive.
F5 [Wikidata] Spore print: white.
F6 [GloBI] is eaten by: Ariolimax columbianus (Ariolimax columbianus), Prophysaon andersonii (Prophysaon andersonii), Mesarion (Mesarion).
F7 [GloBI] host of: Chalciporus piperatus (Chalciporus piperatus), Hypomyces hyalinus (Hypomyces hyalinus).
F8 [GBIF occurrences] Region Mainz-Bingen: 19 reports in ten years; main time "Oct–Nov"; month profile as % of the peak month: Jan 0, Feb 0, Mar 13, Apr 0, May 3, Jun 0, Jul 0, Aug 0, Sep 17, Oct 100, Nov 28, Dec 0.
F9 [GBIF occurrences] Region Schagen: 181 reports in ten years; main time "Oct–Nov"; month profile as % of the peak month: Jan 0, Feb 0, Mar 0, Apr 0, May 0, Jun 0, Jul 0, Aug 0, Sep 11, Oct 100, Nov 25, Dec 3.
F10 [GBIF occurrences] Region Südwestpfalz: 103 reports in ten years; main time "Oct–Nov"; month profile as % of the peak month: Jan 0, Feb 0, Mar 0, Apr 0, May 0, Jun 0, Jul 0, Aug 1, Sep 15, Oct 100, Nov 71, Dec 0.

TEXT (sentence n, cited ids, text):
1. [F1,F8] Fly Agaric is a fungus, and in Mainz-Bingen it has been reported 19 times over ten years, mostly in October and November.
2. [F4,F5] It is poisonous and psychoactive, with a white spore print.
3. [F6] It has been recorded eaten by Ariolimax columbianus, Prophysaon andersonii and Mesarion.
4. [F7] It is recorded as host of Chalciporus piperatus and Hypomyces hyalinus.
