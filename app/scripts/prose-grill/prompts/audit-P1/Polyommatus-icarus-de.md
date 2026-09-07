# prompts/audit-P1/Polyommatus-icarus-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Polyommatus-icarus-de.json`.

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
F1 [GBIF] Wissenschaftlicher Name Polyommatus icarus; Rang Art; Klasse Insecta, Ordnung Lepidoptera; Gruppe: Insekt oder Spinne.
F2 [Wikidata] Deutscher Name: Hauhechel-Bläuling.
F3 [Wikidata] Englischer Name: Common blue.
F4 [GloBI] frisst: Gewöhnlicher Hornklee (Lotus corniculatus), Oregano (Origanum vulgare), Hopfenklee (Medicago lupulina), Wiesenklee (Trifolium pratense), Luzerne (Medicago sativa), Weißklee (Trifolium repens), Sichelklee (Medicago falcata).
F5 [GloBI] wird gefressen von: Veränderliche Krabbenspinne (Misumena vatia), Flower Spider (Thomisus onustus).
F6 [GloBI] bestäubt: Gemeine Schafgarbe (Achillea millefolium).
F7 [GloBI] besucht Blüten von: Gewöhnlicher Hornklee (Lotus corniculatus), Weißklee (Trifolium repens), Rainfarn (Tanacetum vulgare), Luzerne (Medicago sativa), Wiesenklee (Trifolium pratense), Acker-Kratzdistel (Cirsium arvense), Oregano (Origanum vulgare), Vogel-Wicke (Vicia cracca), Hopfenklee (Medicago lupulina), Möhre (Daucus carota), Saat-Esparsette (Onobrychis viciifolia), Gemeiner Efeu (Hedera helix) und 41 weitere.
F8 [GBIF occurrences] Region Mainz-Bingen: 580 Meldungen in zehn Jahren; Hauptzeit „Mai–Sep“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 0, Apr 1, Mai 38, Jun 27, Jul 84, Aug 98, Sep 100, Okt 13, Nov 0, Dez 0.
F9 [GBIF occurrences] Region Schagen: 1716 Meldungen in zehn Jahren; Hauptzeit „Mai–Sep“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 0, Apr 1, Mai 93, Jun 64, Jul 100, Aug 89, Sep 37, Okt 1, Nov 0, Dez 0.
F10 [GBIF occurrences] Region Südwestpfalz: 1060 Meldungen in zehn Jahren; Hauptzeit „Mai–Okt“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 0, Apr 0, Mai 30, Jun 41, Jul 46, Aug 100, Sep 75, Okt 31, Nov 0, Dez 0.

TEXT (sentence n, cited ids, text):
1. [F8] In Mainz-Bingen liegen 580 Meldungen aus zehn Jahren vor, mit Hauptzeit Mai bis September.
2. [F1] Sie zählt zur Gruppe Insekt oder Spinne, Klasse Insecta, Ordnung Lepidoptera.
3. [F4] Beim Fressen wurde sie an Gewöhnlichem Hornklee, Oregano, Hopfenklee und Wiesenklee beobachtet.
4. [F5] Als Fressfeinde sind Veränderliche Krabbenspinne und Flower Spider verzeichnet.
5. [F6] Beim Bestäuben wurde sie an Gewöhnlicher Schafgarbe beobachtet.
6. [F7] Blüten besucht wurden bei Gewöhnlichem Hornklee, Weißklee, Rainfarn und Luzerne.
