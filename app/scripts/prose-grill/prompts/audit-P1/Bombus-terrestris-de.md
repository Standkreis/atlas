# prompts/audit-P1/Bombus-terrestris-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Bombus-terrestris-de.json`.

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
F1 [GBIF] Wissenschaftlicher Name Bombus terrestris; Rang Art; Klasse Insecta, Ordnung Hymenoptera; Gruppe: Insekt oder Spinne.
F2 [Wikidata] Deutscher Name: Dunkle Erdhummel.
F3 [Wikidata] Englischer Name: Buff-tailed Bumblebee.
F4 [GloBI] frisst: Schmuckkörbchen (Cosmos bipinnatus), Gefleckte Taubnessel (Lamium maculatum), Kulturapfel (Malus domestica), Rainfarn-Phazelie (Phacelia tanacetifolia).
F5 [GloBI] besucht Blüten von: Skabiosen-Flockenblume (Centaurea scabiosa), Acker-Kratzdistel (Cirsium arvense), Weißklee (Trifolium repens), Besenheide (Calluna vulgaris), Oregano (Origanum vulgare), Acker-Witwenblume (Knautia arvensis), Drüsiges Springkraut (Impatiens glandulifera), Gewöhnlicher Löwenzahn (Taraxacum officinale), Gewöhnlicher Teufelsabbiss (Succisa pratensis), Wiesen-Bärenklau (Heracleum sphondylium), Roter Fingerhut (Digitalis purpurea), Borretsch (Borago officinalis) und 120 weitere.
F6 [GBIF occurrences] Region Mainz-Bingen: 728 Meldungen in zehn Jahren; Hauptzeit „Feb–Sep“; Monatsprofil in % des stärksten Monats: Jan 2, Feb 29, Mär 77, Apr 63, Mai 31, Jun 99, Jul 100, Aug 65, Sep 47, Okt 20, Nov 4, Dez 0.
F7 [GBIF occurrences] Region Schagen: 408 Meldungen in zehn Jahren; Hauptzeit „Mär–Apr · Jun–Aug“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 6, Mär 43, Apr 100, Mai 21, Jun 65, Jul 85, Aug 44, Sep 12, Okt 2, Nov 3, Dez 0.
F8 [GBIF occurrences] Region Südwestpfalz: 123 Meldungen in zehn Jahren; Hauptzeit „Feb–Apr · Jun“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 100, Mär 76, Apr 30, Mai 3, Jun 39, Jul 20, Aug 15, Sep 14, Okt 10, Nov 0, Dez 0.

TEXT (sentence n, cited ids, text):
1. [F1,F2] Die Dunkle Erdhummel ist ein Insekt aus der Ordnung Hymenoptera.
2. [F6] In Mainz-Bingen wurden in zehn Jahren 728 Meldungen erfasst, mit Hauptzeit von Februar bis September.
3. [F4] Sie wurde beim Fressen von Schmuckkörbchen, Gefleckte Taubnessel, Kulturapfel und Rainfarn-Phazelie beobachtet.
4. [F5] Bei Blütenbesuchen wurde sie unter anderem bei Skabiosen-Flockenblume, Acker-Kratzdistel, Weißklee und Besenheide verzeichnet.
