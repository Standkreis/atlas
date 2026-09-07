# prompts/audit-P2/Vanessa-atalanta-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P2/Vanessa-atalanta-en.json`.

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
F1 [GBIF occurrences] Region Mainz-Bingen: 594 reports in ten years; main time "Feb–Apr · Jun–Oct"; month profile as % of the peak month: Jan 1, Feb 31, Mar 44, Apr 28, May 12, Jun 50, Jul 100, Aug 98, Sep 74, Oct 69, Nov 21, Dec 6.
F2 [GloBI] eats: English Ivy (Hedera helix) — 26 GloBI records.
F3 [GloBI] visits flowers of: Common Lilac (Syringa vulgaris) — 47 GloBI records.
F4 [GloBI] visits flowers of: Hemp Agrimony (Eupatorium cannabinum) — 35 GloBI records.
F5 [GloBI] visits flowers of: Creeping Thistle (Cirsium arvense) — 32 GloBI records.
F6 [GloBI] visits flowers of: common dandelion (Taraxacum officinale) — 28 GloBI records.
F7 [GloBI] visits flowers of: English Ivy (Hedera helix) — 22 GloBI records.
F8 [GloBI] visits flowers of: cherry laurel (Prunus laurocerasus) — 19 GloBI records.
F9 [GloBI] visits flowers of: Garlic Mustard (Alliaria petiolata) — 17 GloBI records.

TEXT (sentence n, cited ids, text):
1. [F1] In Mainz-Bingen, 594 reports over ten years put its main time as February to April and June to October, peaking in July and August.
2. [F2] It has been recorded eating English Ivy.
3. [F3,F4,F5,F6,F7,F8,F9] It has been recorded visiting the flowers of Common Lilac, Hemp Agrimony, Creeping Thistle, common dandelion, English Ivy, cherry laurel, and Garlic Mustard.
