# prompts/audit-P1/Melanargia-galathea-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Melanargia-galathea-en.json`.

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
F1 [GBIF] Scientific name Melanargia galathea; rank species; class Insecta, order Lepidoptera; group: Insect or spider.
F2 [Wikidata] German name: Schachbrett.
F3 [Wikidata] English name: Marbled White.
F4 [GloBI] eats: Red Clover (Trifolium pratense), field scabious (Knautia arvensis), Festuca rubra (Festuca rubra).
F5 [GloBI] is eaten by: Common Wall Lizard (Podarcis muralis), Flower Spider (Thomisus onustus).
F6 [GloBI] pollinates: Carthusian Pink (Dianthus carthusianorum), Small Scabious (Scabiosa columbaria), field scabious (Knautia arvensis), zigzag clover (Trifolium medium), Red Clover (Trifolium pratense), Betony (Betonica officinalis), Oxeye Daisy (Leucanthemum vulgare), Brown Knapweed (Centaurea jacea), Field Clover (Trifolium campestre), Tufted Vetch (Vicia cracca), Bird's-foot Trefoil (Lotus corniculatus), Crown Vetch (Coronilla varia) and 7 more.
F7 [GloBI] visits flowers of: field scabious (Knautia arvensis), Red Clover (Trifolium pratense), Brown Knapweed (Centaurea jacea), Greater Knapweed (Centaurea scabiosa), Oxeye Daisy (Leucanthemum vulgare), Creeping Thistle (Cirsium arvense), Bull Thistle (Cirsium vulgare), Oregano (Origanum vulgare), Valeriana rubra (Centranthus ruber), Teasel (Dipsacus fullonum), Spotted Knapweed (Centaurea stoebe), Small Scabious (Scabiosa columbaria) and 8 more.
F8 [GBIF occurrences] Region Mainz-Bingen: 644 reports in ten years; main time "Jun–Jul"; month profile as % of the peak month: Jan 0, Feb 0, Mar 0, Apr 0, May 2, Jun 100, Jul 63, Aug 1, Sep 0, Oct 0, Nov 0, Dec 0.
F9 [GBIF occurrences] Region Südwestpfalz: 409 reports in ten years; main time "Jun–Jul"; month profile as % of the peak month: Jan 0, Feb 0, Mar 0, Apr 0, May 0, Jun 43, Jul 100, Aug 4, Sep 0, Oct 0, Nov 0, Dec 0.

TEXT (sentence n, cited ids, text):
1. [F1,F3] The Marbled White is an insect in the order Lepidoptera.
2. [F8] In Mainz-Bingen, 644 reports were recorded over ten years, with the main time running from June to July.
3. [F4] It has been recorded eating Red Clover, field scabious, and Festuca rubra.
4. [F5] Common Wall Lizard and Flower Spider are recorded as predators.
5. [F6] Pollination has been recorded at Carthusian Pink, Small Scabious, field scabious, and zigzag clover, among others.
