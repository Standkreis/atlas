# prompts/audit-P3/Apis-mellifera-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P3/Apis-mellifera-de.json`.

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
F1 [GBIF occurrences] Region Mainz-Bingen: 593 Meldungen in zehn Jahren; Hauptzeit „Feb–Okt“; Monatsprofil in % des stärksten Monats: Jan 4, Feb 41, Mär 54, Apr 37, Mai 30, Jun 100, Jul 75, Aug 100, Sep 66, Okt 31, Nov 11, Dez 4.
F2 [GloBI] frisst: Gewöhnliche Kratzdistel (Cirsium vulgare) — 87 GloBI-Belege.
F3 [GloBI] frisst: Schmuckkörbchen (Cosmos bipinnatus) — 77 GloBI-Belege.
F4 [GloBI] frisst: Borretsch (Borago officinalis) — 64 GloBI-Belege.
F5 [GloBI] frisst: Gewöhnlicher Löwenzahn (Taraxacum officinale) — 62 GloBI-Belege.
F6 [GloBI] wird gefressen von: Asiatische Hornisse (Vespa velutina) — 857 GloBI-Belege.
F7 [GloBI] wird gefressen von: Veränderliche Krabbenspinne (Misumena vatia) — 149 GloBI-Belege.
F8 [GloBI] wird gefressen von: Südliche Glanz-Krabbenspinne (Synema globosum) — 61 GloBI-Belege.
F9 [GloBI] besucht Blüten von: Rainfarn-Phazelie (Phacelia tanacetifolia) — 294 GloBI-Belege.

TEXT (sentence n, cited ids, text):
1. [F1] In Mainz-Bingen wird die Westliche Honigbiene vor allem von Februar bis Oktober gemeldet, am häufigsten im Juni und August.
2. [F2,F3,F4,F5] Sie wurde beim Fressen von Gewöhnlicher Kratzdistel, Schmuckkörbchen, Borretsch und Gewöhnlichem Löwenzahn beobachtet.
3. [F6,F7,F8] Als Fressfeinde sind Asiatische Hornisse, Veränderliche Krabbenspinne und Südliche Glanz-Krabbenspinne verzeichnet.
4. [F9] Sie wurde beim Blütenbesuch an Rainfarn-Phazelie beobachtet.
