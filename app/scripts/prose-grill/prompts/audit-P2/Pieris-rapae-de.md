# prompts/audit-P2/Pieris-rapae-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P2/Pieris-rapae-de.json`.

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
F1 [GBIF occurrences] Region Mainz-Bingen: 576 Meldungen in zehn Jahren; Hauptzeit „Jun–Sep“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 7, Apr 22, Mai 16, Jun 46, Jul 66, Aug 100, Sep 65, Okt 24, Nov 3, Dez 3.
F2 [GloBI] frisst: Wiesenklee (Trifolium pratense) — 24 GloBI-Belege.
F3 [GloBI] frisst: Rote Spornblume (Centranthus ruber) — 23 GloBI-Belege.
F4 [GloBI] frisst: Gewöhnlicher Löwenzahn (Taraxacum officinale) — 18 GloBI-Belege.
F5 [GloBI] frisst: Raps (Brassica napus) — 14 GloBI-Belege.
F6 [GloBI] frisst: Gewöhnliches Bitterkraut (Picris hieracioides) — 11 GloBI-Belege.
F7 [GloBI] frisst: Luzerne (Medicago sativa) — 8 GloBI-Belege.
F8 [GloBI] frisst: Gewöhnlicher Blutweiderich (Lythrum salicaria) — 8 GloBI-Belege.
F9 [GloBI] frisst: Oregano (Origanum vulgare) — 7 GloBI-Belege.

TEXT (sentence n, cited ids, text):
1. [F1] In der Region Mainz-Bingen liegen für den Kleinen Kohlweißling 576 Meldungen aus zehn Jahren vor, mit Hauptzeit von Juni bis September und dem stärksten Aufkommen im August.
2. [F2,F3,F4] Beim Fressen wurde er an Wiesenklee (24 GloBI-Belege), Roter Spornblume (23) und Gewöhnlichem Löwenzahn (18) beobachtet.
3. [F5,F6] Auch an Raps (14 Belege) und Gewöhnlichem Bitterkraut (11 Belege) wurde Fressen verzeichnet.
4. [F7,F8,F9] Weitere Nachweise gibt es beim Fressen an Luzerne, Gewöhnlichem Blutweiderich (je 8 Belege) und Oregano (7 Belege).
