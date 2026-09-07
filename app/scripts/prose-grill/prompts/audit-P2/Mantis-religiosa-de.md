# prompts/audit-P2/Mantis-religiosa-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P2/Mantis-religiosa-de.json`.

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
F1 [GBIF occurrences] Region Mainz-Bingen: 630 Meldungen in zehn Jahren; Hauptzeit „Aug–Sep“; Monatsprofil in % des stärksten Monats: Jan 2, Feb 1, Mär 1, Apr 1, Mai 1, Jun 4, Jul 20, Aug 76, Sep 100, Okt 21, Nov 3, Dez 1.
F2 [GloBI] frisst: Westliche Honigbiene (Apis mellifera) — 10 GloBI-Belege.
F3 [GloBI] frisst: Gemeine Wespe (Vespula vulgaris) — 4 GloBI-Belege.
F4 [GloBI] frisst: Grünes Heupferd (Tettigonia viridissima) — 2 GloBI-Belege.
F5 [GloBI] frisst: Blauflügelige Ödlandschrecke (Oedipoda caerulescens) — 2 GloBI-Belege.
F6 [GloBI] frisst: Mauereidechse (Podarcis muralis) — 2 GloBI-Belege.
F7 [GloBI] wird gefressen von: Asiatische Hornisse (Vespa velutina) — 5 GloBI-Belege.
F8 [GloBI] wird gefressen von: Haussperling (Passer domesticus) — 2 GloBI-Belege.

TEXT (sentence n, cited ids, text):
1. [F2,F3,F4,F5,F6] Sie wurde beim Fressen von Westlicher Honigbiene, Gemeiner Wespe, Grünem Heupferd, Blauflügeliger Ödlandschrecke und Mauereidechse beobachtet.
2. [F7,F8] Als Fressfeinde sind Asiatische Hornisse und Haussperling verzeichnet.
3. [F1] In Mainz-Bingen liegt die Hauptzeit der Meldungen zwischen August und September.
