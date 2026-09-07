# prompts/audit-P1/Aglais-io-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Aglais-io-de.json`.

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
F1 [GBIF] Wissenschaftlicher Name Aglais io; Rang Art; Klasse Insecta, Ordnung Lepidoptera; Gruppe: Insekt oder Spinne.
F2 [Wikidata] Deutscher Name: Tagpfauenauge.
F3 [Wikidata] Englischer Name: Peacock.
F4 [GloBI] frisst: Große Brennnessel (Urtica dioica), Gemeiner Efeu (Hedera helix), Gewöhnlicher Wasserdost (Eupatorium cannabinum), Echter Hopfen (Humulus lupulus), Acker-Kratzdistel (Cirsium arvense), Oregano (Origanum vulgare), Schlehdorn (Prunus spinosa), Gewöhnlicher Liguster (Ligustrum vulgare), Gewöhnliches Bitterkraut (Picris hieracioides), Acker-Witwenblume (Knautia arvensis).
F5 [GloBI] wird gefressen von: Veränderliche Krabbenspinne (Misumena vatia).
F6 [GloBI] besucht Blüten von: Acker-Kratzdistel (Cirsium arvense), Gewöhnlicher Wasserdost (Eupatorium cannabinum), Gewöhnlicher Löwenzahn (Taraxacum officinale), Schlehdorn (Prunus spinosa), Oregano (Origanum vulgare), Gewöhnliche Kratzdistel (Cirsium vulgare), Purpurrote Taubnessel (Lamium purpureum), Wiesenklee (Trifolium pratense), Acker-Witwenblume (Knautia arvensis), Scharbockskraut (Ficaria verna), Gewöhnlicher Teufelsabbiss (Succisa pratensis), Wiesen-Flockenblume (Centaurea jacea) und 21 weitere.
F7 [GBIF occurrences] Region Mainz-Bingen: 625 Meldungen in zehn Jahren; Hauptzeit „Mär–Apr · Jun–Jul · Sep“; Monatsprofil in % des stärksten Monats: Jan 2, Feb 11, Mär 83, Apr 61, Mai 18, Jun 51, Jul 100, Aug 13, Sep 33, Okt 8, Nov 0, Dez 6.
F8 [GBIF occurrences] Region Schagen: 679 Meldungen in zehn Jahren; Hauptzeit „Mär–Apr · Jul–Sep“; Monatsprofil in % des stärksten Monats: Jan 1, Feb 14, Mär 82, Apr 100, Mai 25, Jun 8, Jul 96, Aug 40, Sep 83, Okt 21, Nov 12, Dez 2.
F9 [GBIF occurrences] Region Südwestpfalz: 754 Meldungen in zehn Jahren; Hauptzeit „Feb–Apr · Jul · Sep–Okt“; Monatsprofil in % des stärksten Monats: Jan 1, Feb 39, Mär 100, Apr 83, Mai 10, Jun 20, Jul 31, Aug 21, Sep 37, Okt 33, Nov 10, Dez 8.

TEXT (sentence n, cited ids, text):
1. [F1] Aglais io ist ein Insekt aus der Ordnung Lepidoptera.
2. [F7] In Mainz-Bingen liegen 625 Meldungen aus zehn Jahren vor, mit Hauptzeit im März–April, Juni–Juli und September.
3. [F4] Es wurde beim Fressen von Große Brennnessel, Gemeiner Efeu, Gewöhnlicher Wasserdost und Echter Hopfen beobachtet.
4. [F5] Als Fressfeind verzeichnet ist die Veränderliche Krabbenspinne.
5. [F6] Blütenbesuche wurden bei Acker-Kratzdistel, Gewöhnlicher Wasserdost, Gewöhnlicher Löwenzahn und Schlehdorn beobachtet.
