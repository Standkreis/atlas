# prompts/audit-P1/Aglais-io-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Aglais-io-en.json`.

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
F1 [GBIF] Scientific name Aglais io; rank species; class Insecta, order Lepidoptera; group: Insect or spider.
F2 [Wikidata] German name: Tagpfauenauge.
F3 [Wikidata] English name: Peacock.
F4 [GloBI] eats: Stinging Nettle (Urtica dioica), English Ivy (Hedera helix), Hemp Agrimony (Eupatorium cannabinum), Hop (Humulus lupulus), Creeping Thistle (Cirsium arvense), Oregano (Origanum vulgare), Blackthorn (Prunus spinosa), Wild Privet (Ligustrum vulgare), Hawkweed Oxtongue (Picris hieracioides), field scabious (Knautia arvensis).
F5 [GloBI] is eaten by: Goldenrod Crab Spider (Misumena vatia).
F6 [GloBI] visits flowers of: Creeping Thistle (Cirsium arvense), Hemp Agrimony (Eupatorium cannabinum), common dandelion (Taraxacum officinale), Blackthorn (Prunus spinosa), Oregano (Origanum vulgare), Bull Thistle (Cirsium vulgare), Red Dead-nettle (Lamium purpureum), Red Clover (Trifolium pratense), field scabious (Knautia arvensis), Lesser Celandine (Ficaria verna), Devil's-Bit Scabious (Succisa pratensis), Brown Knapweed (Centaurea jacea) and 21 more.
F7 [GBIF occurrences] Region Mainz-Bingen: 625 reports in ten years; main time "Mar–Apr · Jun–Jul · Sep"; month profile as % of the peak month: Jan 2, Feb 11, Mar 83, Apr 61, May 18, Jun 51, Jul 100, Aug 13, Sep 33, Oct 8, Nov 0, Dec 6.
F8 [GBIF occurrences] Region Schagen: 679 reports in ten years; main time "Mar–Apr · Jul–Sep"; month profile as % of the peak month: Jan 1, Feb 14, Mar 82, Apr 100, May 25, Jun 8, Jul 96, Aug 40, Sep 83, Oct 21, Nov 12, Dec 2.
F9 [GBIF occurrences] Region Südwestpfalz: 754 reports in ten years; main time "Feb–Apr · Jul · Sep–Oct"; month profile as % of the peak month: Jan 1, Feb 39, Mar 100, Apr 83, May 10, Jun 20, Jul 31, Aug 21, Sep 37, Oct 33, Nov 10, Dec 8.

TEXT (sentence n, cited ids, text):
1. [F1] Aglais io is an insect in the order Lepidoptera.
2. [F7] In Mainz-Bingen, 625 reports over ten years show a main time of Mar–Apr, Jun–Jul and Sep.
3. [F4] It has been recorded eating Stinging Nettle, English Ivy, Hemp Agrimony and Hop.
4. [F5] Goldenrod Crab Spider is recorded as a predator.
5. [F6] It has been recorded visiting flowers of Creeping Thistle, Hemp Agrimony, common dandelion and Blackthorn.
