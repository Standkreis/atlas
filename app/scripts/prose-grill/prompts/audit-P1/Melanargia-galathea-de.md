# prompts/audit-P1/Melanargia-galathea-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Melanargia-galathea-de.json`.

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
F1 [GBIF] Wissenschaftlicher Name Melanargia galathea; Rang Art; Klasse Insecta, Ordnung Lepidoptera; Gruppe: Insekt oder Spinne.
F2 [Wikidata] Deutscher Name: Schachbrett.
F3 [Wikidata] Englischer Name: Marbled White.
F4 [GloBI] frisst: Wiesenklee (Trifolium pratense), Acker-Witwenblume (Knautia arvensis), Festuca rubra (Festuca rubra).
F5 [GloBI] wird gefressen von: Mauereidechse (Podarcis muralis), Flower Spider (Thomisus onustus).
F6 [GloBI] bestäubt: Kartäusernelke (Dianthus carthusianorum), Tauben-Skabiose (Scabiosa columbaria), Acker-Witwenblume (Knautia arvensis), Mittlerer Klee (Trifolium medium), Wiesenklee (Trifolium pratense), Echte Betonie (Betonica officinalis), Magerwiesen-Margerite (Leucanthemum vulgare), Wiesen-Flockenblume (Centaurea jacea), Feld-Klee (Trifolium campestre), Vogel-Wicke (Vicia cracca), Gewöhnlicher Hornklee (Lotus corniculatus), Crown Vetch (Coronilla varia) und 7 weitere.
F7 [GloBI] besucht Blüten von: Acker-Witwenblume (Knautia arvensis), Wiesenklee (Trifolium pratense), Wiesen-Flockenblume (Centaurea jacea), Skabiosen-Flockenblume (Centaurea scabiosa), Magerwiesen-Margerite (Leucanthemum vulgare), Acker-Kratzdistel (Cirsium arvense), Gewöhnliche Kratzdistel (Cirsium vulgare), Oregano (Origanum vulgare), Rote Spornblume (Centranthus ruber), Wilde Karde (Dipsacus fullonum), Rispen-Flockenblume (Centaurea stoebe), Tauben-Skabiose (Scabiosa columbaria) und 8 weitere.
F8 [GBIF occurrences] Region Mainz-Bingen: 644 Meldungen in zehn Jahren; Hauptzeit „Jun–Jul“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 0, Apr 0, Mai 2, Jun 100, Jul 63, Aug 1, Sep 0, Okt 0, Nov 0, Dez 0.
F9 [GBIF occurrences] Region Südwestpfalz: 409 Meldungen in zehn Jahren; Hauptzeit „Jun–Jul“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 0, Apr 0, Mai 0, Jun 43, Jul 100, Aug 4, Sep 0, Okt 0, Nov 0, Dez 0.

TEXT (sentence n, cited ids, text):
1. [F1,F2] Das Schachbrett ist ein Insekt aus der Ordnung Lepidoptera.
2. [F8] In Mainz-Bingen wurden in zehn Jahren 644 Meldungen erfasst, mit Hauptzeit von Juni bis Juli.
3. [F4] Es wurde beim Fressen von Wiesenklee, Acker-Witwenblume und Festuca rubra beobachtet.
4. [F5] Als Fressfeinde sind Mauereidechse und Flower Spider verzeichnet.
5. [F6] Bei der Bestäubung wurden unter anderem Kartäusernelke, Tauben-Skabiose, Acker-Witwenblume und Mittlerer Klee verzeichnet.
