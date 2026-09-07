# prompts/audit-P1/Lycaena-phlaeas-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Lycaena-phlaeas-de.json`.

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
F1 [GBIF] Wissenschaftlicher Name Lycaena phlaeas; Rang Art; Klasse Insecta, Ordnung Lepidoptera; Gruppe: Insekt oder Spinne.
F2 [Wikidata] Deutscher Name: Kleiner Feuerfalter.
F3 [Wikidata] Englischer Name: Small Copper.
F4 [GloBI] frisst: Oregano (Origanum vulgare), Wiesen-Sauerampfer (Rumex acetosa), Rainfarn (Tanacetum vulgare), Stumpfblättriger Ampfer (Rumex obtusifolius), Gemeine Schafgarbe (Achillea millefolium).
F5 [GloBI] wird gefressen von: Veränderliche Krabbenspinne (Misumena vatia).
F6 [GloBI] bestäubt: Echter Buchweizen (Fagopyrum esculentum).
F7 [GloBI] besucht Blüten von: Senecio jacobaea (Senecio jacobaea), Rainfarn (Tanacetum vulgare), Besenheide (Calluna vulgaris), Gänseblümchen (Bellis perennis), Acker-Kratzdistel (Cirsium arvense), Gemeine Schafgarbe (Achillea millefolium), Oregano (Origanum vulgare), Feld-Mannstreu (Eryngium campestre), Jakobs-Greiskraut (Jacobaea vulgaris), Gewöhnlicher Teufelsabbiss (Succisa pratensis), Knolliger Hahnenfuß (Ranunculus bulbosus), Magerwiesen-Margerite (Leucanthemum vulgare) und 31 weitere.
F8 [GBIF occurrences] Region Mainz-Bingen: 126 Meldungen in zehn Jahren; Hauptzeit „Apr–Mai · Jul–Okt“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 7, Apr 53, Mai 38, Jun 11, Jul 79, Aug 64, Sep 100, Okt 57, Nov 0, Dez 0.
F9 [GBIF occurrences] Region Kyoto: 45 Meldungen in zehn Jahren; Hauptzeit „Apr · Jun–Aug“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 0, Apr 45, Mai 25, Jun 100, Jul 49, Aug 51, Sep 9, Okt 17, Nov 22, Dez 0.
F10 [GBIF occurrences] Region Schagen: 878 Meldungen in zehn Jahren; Hauptzeit „Apr–Mai · Jul–Sep“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 1, Apr 53, Mai 100, Jun 24, Jul 68, Aug 40, Sep 85, Okt 22, Nov 6, Dez 0.
F11 [GBIF occurrences] Region Südwestpfalz: 1288 Meldungen in zehn Jahren; Hauptzeit „Jul–Okt“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 1, Apr 19, Mai 24, Jun 16, Jul 47, Aug 37, Sep 100, Okt 62, Nov 8, Dez 0.

TEXT (sentence n, cited ids, text):
1. [F1] Der Kleine Feuerfalter gehört zur Gruppe der Insekten oder Spinnen.
2. [F8] In Mainz-Bingen wurden in zehn Jahren 126 Meldungen erfasst, mit Hauptzeit von April bis Mai und Juli bis Oktober.
3. [F4] Beim Fressen wurde er an Oregano, Wiesen-Sauerampfer, Rainfarn und Stumpfblättrigem Ampfer beobachtet.
4. [F5] Als Fressfeind ist die Veränderliche Krabbenspinne verzeichnet.
5. [F6] Er wurde beim Bestäuben von Echtem Buchweizen beobachtet.
6. [F7] Zudem wurde er beim Blütenbesuch an Rainfarn, Besenheide, Gänseblümchen und Gemeiner Schafgarbe beobachtet.
