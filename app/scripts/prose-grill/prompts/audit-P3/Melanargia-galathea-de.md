# prompts/audit-P3/Melanargia-galathea-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P3/Melanargia-galathea-de.json`.

## System

You audit a species text against the numbered fact lines it was written from. For every sentence give:
1. "verdict": "supported" (every claim in the sentence follows from the cited lines), "partial" (some claim goes beyond the cited lines or rests on an uncited line), "unsupported" (a claim that no line states, or that contradicts a line). Be strict: rounding is fine, a unit change is fine; an added adjective of colour, size, behaviour or place, a cause, a season, a habit or preference read out of a record, a "typical" or "important" is not.
2. A GloBI line ("n GloBI-Belege" / "n GloBI records") is the record of an observed interaction. It grants every wording that only restates the record or names its kind: "beobachtet", "verzeichnet", "registriert", "nachgewiesen", "Fressfeind", "Beute", "Nahrung", "Wirt", "Blütenbesucher", "Bestäuber" / "observed", "recorded", "documented", "predator", "prey", "food", "host", "flower visitor", "pollinator". It does not grant a habit, a frequency, a life stage, a preference or a partner the line does not name. The species' own name and a plain group word for it (Falter, Vogel, Pilz / butterfly, bird, fungus) are not claims, like the region.
3. Direction is a claim: "frisst: X" states the species eats X, "wird gefressen von: Y" states Y eats the species, "Wirt von: Z" states the species hosts Z, "besucht Blüten von: P" states the species visits P. A sentence whose grammar reverses who eats, hosts or visits whom ("Sie wurde beim Fressen von Y beobachtet" for an "is eaten by" line; "Als Wirt verzeichnet sind Z" for a "host of" line) contradicts the line: "unsupported", whatever the vocabulary.
4. Decide the verdict first and keep it. "why" has at most 25 words, explains the verdict and never argues against it; if you notice while writing that the sentence is supported, the verdict is "supported".
5. "claims": every atomic claim in the sentence (one fact per claim, at most 12 words, in the language of the text), each with "fact": the id of the line that states it (any line, cited or not), or null when no line states it. Names, group words and the region are not claims; "it is nocturnal" is a claim.
Answer with JSON only, the verdict before anything else in each sentence:
{"sentences":[{"n":1,"verdict":"supported|partial|unsupported","why":"<≤ 25 words; empty when supported>","claims":[{"claim":"<text>","fact":"F3"}, {"claim":"<text>","fact":null}]}]}

## User

FACTS:
F1 [GBIF occurrences] Region Mainz-Bingen: 644 Meldungen in zehn Jahren; Hauptzeit „Jun–Jul“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 0, Apr 0, Mai 2, Jun 100, Jul 63, Aug 1, Sep 0, Okt 0, Nov 0, Dez 0.
F2 [GloBI] bestäubt: Kartäusernelke (Dianthus carthusianorum) — 58 GloBI-Belege.
F3 [GloBI] bestäubt: Tauben-Skabiose (Scabiosa columbaria) — 47 GloBI-Belege.
F4 [GloBI] bestäubt: Acker-Witwenblume (Knautia arvensis) — 40 GloBI-Belege.
F5 [GloBI] bestäubt: Mittlerer Klee (Trifolium medium) — 26 GloBI-Belege.
F6 [GloBI] bestäubt: Wiesenklee (Trifolium pratense) — 19 GloBI-Belege.
F7 [GloBI] bestäubt: Echte Betonie (Betonica officinalis) — 19 GloBI-Belege.
F8 [GloBI] bestäubt: Magerwiesen-Margerite (Leucanthemum vulgare) — 17 GloBI-Belege.
F9 [GloBI] besucht Blüten von: Acker-Witwenblume (Knautia arvensis) — 23 GloBI-Belege.

TEXT (sentence n, cited ids, text):
1. [F1] Das Schachbrett wurde in Mainz-Bingen vor allem im Juni und Juli gemeldet.
2. [F2,F3,F4] Es ist als Bestäuber von Kartäusernelke, Tauben-Skabiose und Acker-Witwenblume verzeichnet.
3. [F5,F6,F7,F8] Ebenso ist es als Bestäuber von Mittlerem Klee, Wiesenklee, Echter Betonie und Magerwiesen-Margerite verzeichnet.
4. [F9] Zudem wurde es beim Blütenbesuch an der Acker-Witwenblume beobachtet.
