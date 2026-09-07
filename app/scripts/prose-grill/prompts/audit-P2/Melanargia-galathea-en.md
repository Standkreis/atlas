# prompts/audit-P2/Melanargia-galathea-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P2/Melanargia-galathea-en.json`.

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
F1 [GBIF occurrences] Region Mainz-Bingen: 644 reports in ten years; main time "Jun–Jul"; month profile as % of the peak month: Jan 0, Feb 0, Mar 0, Apr 0, May 2, Jun 100, Jul 63, Aug 1, Sep 0, Oct 0, Nov 0, Dec 0.
F2 [GloBI] pollinates: Carthusian Pink (Dianthus carthusianorum) — 58 GloBI records.
F3 [GloBI] pollinates: Small Scabious (Scabiosa columbaria) — 47 GloBI records.
F4 [GloBI] pollinates: field scabious (Knautia arvensis) — 40 GloBI records.
F5 [GloBI] pollinates: zigzag clover (Trifolium medium) — 26 GloBI records.
F6 [GloBI] pollinates: Red Clover (Trifolium pratense) — 19 GloBI records.
F7 [GloBI] pollinates: Betony (Betonica officinalis) — 19 GloBI records.
F8 [GloBI] pollinates: Oxeye Daisy (Leucanthemum vulgare) — 17 GloBI records.
F9 [GloBI] visits flowers of: field scabious (Knautia arvensis) — 23 GloBI records.

TEXT (sentence n, cited ids, text):
1. [F1] Melanargia galathea is mainly observed in Mainz-Bingen from June to July, with the highest number of reports in June.
2. [F2,F3,F4] It is recorded as a pollinator of the Carthusian Pink, Small Scabious and field scabious.
3. [F5,F6,F7,F8] Further pollination is recorded for zigzag clover, Red Clover, Betony and Oxeye Daisy.
4. [F9] In addition, 23 GloBI records document flower visits to field scabious.
