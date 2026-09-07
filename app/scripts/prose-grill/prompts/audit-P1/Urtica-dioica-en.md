# prompts/audit-P1/Urtica-dioica-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Urtica-dioica-en.json`.

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
F1 [GBIF] Scientific name Urtica dioica; rank species; class Magnoliopsida, order Rosales; group: Plant.
F2 [Wikidata] German name: Große Brennnessel.
F3 [Wikidata] English name: Stinging Nettle.
F4 [IUCN Red List] Status: LC (least concern).
F5 [GIFT (Weigelt et al.)] Height: up to 3 m.
F6 [GIFT (Weigelt et al.)] Life form: perennial herb.
F7 [GIFT (Weigelt et al.)] Flowering: May–Oct.
F8 [GIFT (Weigelt et al.)] Pollination: wind.
F9 [GloBI] eats: Colpocephalum indi (Colpocephalum indi), Splendoroffula tauracobia (Splendoroffula tauracobia), Eomenopon ryani (Eomenopon ryani), Myrsidea breviventris (Myrsidea breviventris), Eomenopon sintillatae (Eomenopon sintillatae).
F10 [GloBI] is eaten by: Peacock (Aglais io), Small tortoiseshell (Aglais urticae), Eupteryx cyclops (Eupteryx cyclops), Eupteryx urticae (Eupteryx urticae), Eupteryx aurata (Eupteryx aurata), Eupteryx calcarata (Eupteryx calcarata), Macropsis scutellatus (Macropsis scutellatus), Aphrodes makarovi (Aphrodes makarovi), Agallia consobrina (Agallia consobrina), Colladonus mendicus (Colladonus mendicus), Metcalfa pruinosa (Metcalfa pruinosa), Orientus ishidae (Orientus ishidae) and 4 more.
F11 [GloBI] host of: Peacock (Aglais io), Map (Araschnia levana), Small tortoiseshell (Aglais urticae), Puccinia caricina (Puccinia caricina), Ramularia urticae (Ramularia urticae), Leptosphaeria acuta (Leptosphaeria acuta), Puccinia urticata (Puccinia urticata), Puccinia urticae (Puccinia urticae), Erysiphe urticae (Erysiphe urticae), Septoria urticae (Septoria urticae), Leptosphaeria conoidea (Leptosphaeria conoidea), Didymella eupyrena (Didymella eupyrena) and 13 more.
F12 [GBIF occurrences] Region Mainz-Bingen: 259 reports in ten years; main time "Apr–Jul"; month profile as % of the peak month: Jan 0, Feb 0, Mar 14, Apr 31, May 100, Jun 28, Jul 37, Aug 15, Sep 18, Oct 25, Nov 9, Dec 3.
F13 [GBIF occurrences] Region Schagen: 101 reports in ten years; main time "Ganzes Jahr"; month profile as % of the peak month: Jan 22, Feb 49, Mar 43, Apr 49, May 62, Jun 100, Jul 59, Aug 56, Sep 95, Oct 62, Nov 46, Dec 60.
F14 [GBIF occurrences] Region Südwestpfalz: 52 reports in ten years; main time "Feb · Apr–Sep"; month profile as % of the peak month: Jan 0, Feb 72, Mar 0, Apr 56, May 100, Jun 70, Jul 89, Aug 36, Sep 54, Oct 0, Nov 0, Dec 0.

TEXT (sentence n, cited ids, text):
1. [F1,F4] Stinging Nettle is a plant and is listed as least concern (LC).
2. [F5] It grows up to 3 m tall.
3. [F12] In Mainz-Bingen there are 259 reports in ten years, mainly from April to July.
4. [F6,F7,F8] It is a perennial herb that flowers from May to October and is pollinated by wind.
5. [F10] It has been recorded eaten by Peacock, Small tortoiseshell, Eupteryx cyclops and Eupteryx urticae.
6. [F11] It is also recorded as host of Peacock, Map and Small tortoiseshell.
