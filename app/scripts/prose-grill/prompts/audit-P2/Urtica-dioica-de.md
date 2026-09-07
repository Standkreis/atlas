# prompts/audit-P2/Urtica-dioica-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P2/Urtica-dioica-de.json`.

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
F1 [GIFT (Weigelt et al.)] Bestäubung: Wind.
F2 [GBIF occurrences] Region Mainz-Bingen: 259 Meldungen in zehn Jahren; Hauptzeit „Apr–Jul“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 14, Apr 31, Mai 100, Jun 28, Jul 37, Aug 15, Sep 18, Okt 25, Nov 9, Dez 3.
F3 [GloBI] wird gefressen von: Tagpfauenauge (Aglais io) — 3 GloBI-Belege.
F4 [GloBI] wird gefressen von: Kleiner Fuchs (Aglais urticae) — 2 GloBI-Belege.
F5 [GloBI] Wirt von: Tagpfauenauge (Aglais io) — 3 GloBI-Belege.
F6 [GloBI] Wirt von: Landkärtchen (Araschnia levana) — 2 GloBI-Belege.
F7 [GloBI] Wirt von: Kleiner Fuchs (Aglais urticae) — 2 GloBI-Belege.

TEXT (sentence n, cited ids, text):
1. [F1] Die Große Brennnessel wird vom Wind bestäubt.
2. [F3,F4] Sie wurde beim Fressen von Tagpfauenauge (3 GloBI-Belege) und Kleinem Fuchs (2 GloBI-Belege) beobachtet.
3. [F5,F6,F7] Als Wirtspflanze ist sie für Tagpfauenauge (3 GloBI-Belege), Landkärtchen (2 GloBI-Belege) und Kleinen Fuchs (2 GloBI-Belege) verzeichnet.
4. [F2] In Mainz-Bingen liegt die Hauptzeit der Meldungen zwischen April und Juli.
