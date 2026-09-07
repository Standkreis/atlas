# prompts/audit-P2/Lycaena-phlaeas-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P2/Lycaena-phlaeas-de.json`.

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
F1 [GBIF occurrences] Region Mainz-Bingen: 126 Meldungen in zehn Jahren; Hauptzeit „Apr–Mai · Jul–Okt“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 7, Apr 53, Mai 38, Jun 11, Jul 79, Aug 64, Sep 100, Okt 57, Nov 0, Dez 0.
F2 [GloBI] besucht Blüten von: Rainfarn (Tanacetum vulgare) — 18 GloBI-Belege.
F3 [GloBI] besucht Blüten von: Besenheide (Calluna vulgaris) — 18 GloBI-Belege.
F4 [GloBI] besucht Blüten von: Gänseblümchen (Bellis perennis) — 16 GloBI-Belege.
F5 [GloBI] besucht Blüten von: Acker-Kratzdistel (Cirsium arvense) — 11 GloBI-Belege.
F6 [GloBI] besucht Blüten von: Gemeine Schafgarbe (Achillea millefolium) — 11 GloBI-Belege.
F7 [GloBI] besucht Blüten von: Oregano (Origanum vulgare) — 10 GloBI-Belege.
F8 [GloBI] besucht Blüten von: Feld-Mannstreu (Eryngium campestre) — 10 GloBI-Belege.
F9 [GloBI] besucht Blüten von: Jakobs-Greiskraut (Jacobaea vulgaris) — 9 GloBI-Belege.

TEXT (sentence n, cited ids, text):
1. [F1] In Mainz-Bingen wird der Kleine Feuerfalter mit 126 Meldungen in zehn Jahren erfasst, vor allem von April bis Mai und von Juli bis Oktober.
2. [F2,F3,F4,F5,F6,F7,F8,F9] Er wurde beim Blütenbesuch an Rainfarn, Besenheide, Gänseblümchen, Acker-Kratzdistel, Gemeiner Schafgarbe, Oregano, Feld-Mannstreu und Jakobs-Greiskraut beobachtet.
