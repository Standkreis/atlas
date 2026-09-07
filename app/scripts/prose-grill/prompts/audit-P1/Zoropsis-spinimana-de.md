# prompts/audit-P1/Zoropsis-spinimana-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Zoropsis-spinimana-de.json`.

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
F1 [GBIF] Wissenschaftlicher Name Zoropsis spinimana; Rang Art; Klasse Arachnida, Ordnung Araneae; Gruppe: Insekt oder Spinne.
F2 [Wikidata] Deutscher Name: Nosferatu-Spinne.
F3 [Wikidata] Englischer Name: Zoropsid spider.
F4 [GBIF occurrences] Region Mainz-Bingen: 1077 Meldungen in zehn Jahren; Hauptzeit „Aug–Nov“; Monatsprofil in % des stärksten Monats: Jan 12, Feb 16, Mär 16, Apr 14, Mai 6, Jun 4, Jul 12, Aug 28, Sep 100, Okt 45, Nov 34, Dez 17.
F5 [GBIF occurrences] Region Südwestpfalz: 35 Meldungen in zehn Jahren; Hauptzeit „Okt–Dez“; Monatsprofil in % des stärksten Monats: Jan 3, Feb 10, Mär 18, Apr 2, Mai 1, Jun 3, Jul 1, Aug 5, Sep 15, Okt 26, Nov 39, Dez 100.

TEXT (sentence n, cited ids, text):
1. [F1,F2] Die Nosferatu-Spinne (Zoropsis spinimana) zählt zur Klasse Arachnida und zur Ordnung Araneae.
2. [F4] In Mainz-Bingen liegen für sie 1077 Meldungen aus zehn Jahren vor, mit den meisten Meldungen zwischen August und November.
