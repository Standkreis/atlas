# prompts/audit-P1/Rana-temporaria-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Rana-temporaria-de.json`.

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
F1 [GBIF] Wissenschaftlicher Name Rana temporaria; Rang Art; Klasse Amphibia, Ordnung Anura; Gruppe: Amphibie.
F2 [Wikidata] Deutscher Name: Grasfrosch.
F3 [Wikidata] Englischer Name: Common frog.
F4 [IUCN Red List] Status: LC (nicht gefährdet).
F5 [AmphiBIO] Nahrung: Gliederfüßer.
F6 [AmphiBIO] Gewicht: 48 g.
F7 [AmphiBIO] Länge: 11 cm.
F8 [AmphiBIO] Lebensraum: an Land, im Wasser, auf Bäumen.
F9 [AmphiBIO] Aktiv: tagsüber, nachts.
F10 [GloBI] wird gefressen von: Barrenringelnatter (Natrix helvetica), Graureiher (Ardea cinerea), Silbermöwe (Larus argentatus), Rotfuchs (Vulpes vulpes), Spitzschlammschnecke (Lymnaea stagnalis), Natrix natrix (Natrix natrix), Vipera berus (Vipera berus), Corvus cornix (Corvus cornix), Botaurus stellaris (Botaurus stellaris).
F11 [GBIF occurrences] Region Mainz-Bingen: 71 Meldungen in zehn Jahren; Hauptzeit „Feb–Apr“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 31, Mär 100, Apr 29, Mai 10, Jun 15, Jul 12, Aug 7, Sep 9, Okt 22, Nov 7, Dez 0.
F12 [GBIF occurrences] Region Schagen: 177 Meldungen in zehn Jahren; Hauptzeit „Mär–Nov“; Monatsprofil in % des stärksten Monats: Jan 5, Feb 0, Mär 100, Apr 64, Mai 49, Jun 45, Jul 48, Aug 63, Sep 70, Okt 37, Nov 27, Dez 0.
F13 [GBIF occurrences] Region Südwestpfalz: 82 Meldungen in zehn Jahren; Hauptzeit „Mär · Sep–Okt“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 100, Apr 24, Mai 4, Jun 15, Jul 11, Aug 22, Sep 31, Okt 43, Nov 0, Dez 0.

TEXT (sentence n, cited ids, text):
1. [F1,F6,F7,F4] Es handelt sich um eine Amphibie mit einer Länge von 11 cm und einem Gewicht von 48 g; der Status ist LC (nicht gefährdet).
2. [F11] In Mainz-Bingen wurden binnen zehn Jahren 71 Meldungen erfasst, mit der Hauptzeit Feb–Apr.
3. [F5] Zur Nahrung zählen Gliederfüßer.
4. [F8,F9] Der Lebensraum umfasst Land, Wasser und Bäume, aktiv ist sie tagsüber und nachts.
5. [F10] Als Fressfeinde verzeichnet sind Barrenringelnatter, Graureiher, Silbermöwe und Rotfuchs.
