# prompts/audit-P1/Urtica-dioica-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Urtica-dioica-de.json`.

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
F1 [GBIF] Wissenschaftlicher Name Urtica dioica; Rang Art; Klasse Magnoliopsida, Ordnung Rosales; Gruppe: Pflanze.
F2 [Wikidata] Deutscher Name: Große Brennnessel.
F3 [Wikidata] Englischer Name: Stinging Nettle.
F4 [IUCN Red List] Status: LC (nicht gefährdet).
F5 [GIFT (Weigelt et al.)] Höhe: bis 3 m.
F6 [GIFT (Weigelt et al.)] Lebensform: Staude.
F7 [GIFT (Weigelt et al.)] Blütezeit: Mai–Okt.
F8 [GIFT (Weigelt et al.)] Bestäubung: Wind.
F9 [GloBI] frisst: Colpocephalum indi (Colpocephalum indi), Splendoroffula tauracobia (Splendoroffula tauracobia), Eomenopon ryani (Eomenopon ryani), Myrsidea breviventris (Myrsidea breviventris), Eomenopon sintillatae (Eomenopon sintillatae).
F10 [GloBI] wird gefressen von: Tagpfauenauge (Aglais io), Kleiner Fuchs (Aglais urticae), Eupteryx cyclops (Eupteryx cyclops), Eupteryx urticae (Eupteryx urticae), Eupteryx aurata (Eupteryx aurata), Eupteryx calcarata (Eupteryx calcarata), Macropsis scutellatus (Macropsis scutellatus), Aphrodes makarovi (Aphrodes makarovi), Agallia consobrina (Agallia consobrina), Colladonus mendicus (Colladonus mendicus), Metcalfa pruinosa (Metcalfa pruinosa), Orientus ishidae (Orientus ishidae) und 4 weitere.
F11 [GloBI] Wirt von: Tagpfauenauge (Aglais io), Landkärtchen (Araschnia levana), Kleiner Fuchs (Aglais urticae), Puccinia caricina (Puccinia caricina), Ramularia urticae (Ramularia urticae), Leptosphaeria acuta (Leptosphaeria acuta), Puccinia urticata (Puccinia urticata), Puccinia urticae (Puccinia urticae), Erysiphe urticae (Erysiphe urticae), Septoria urticae (Septoria urticae), Leptosphaeria conoidea (Leptosphaeria conoidea), Didymella eupyrena (Didymella eupyrena) und 13 weitere.
F12 [GBIF occurrences] Region Mainz-Bingen: 259 Meldungen in zehn Jahren; Hauptzeit „Apr–Jul“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 14, Apr 31, Mai 100, Jun 28, Jul 37, Aug 15, Sep 18, Okt 25, Nov 9, Dez 3.
F13 [GBIF occurrences] Region Schagen: 101 Meldungen in zehn Jahren; Hauptzeit „Ganzes Jahr“; Monatsprofil in % des stärksten Monats: Jan 22, Feb 49, Mär 43, Apr 49, Mai 62, Jun 100, Jul 59, Aug 56, Sep 95, Okt 62, Nov 46, Dez 60.
F14 [GBIF occurrences] Region Südwestpfalz: 52 Meldungen in zehn Jahren; Hauptzeit „Feb · Apr–Sep“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 72, Mär 0, Apr 56, Mai 100, Jun 70, Jul 89, Aug 36, Sep 54, Okt 0, Nov 0, Dez 0.

TEXT (sentence n, cited ids, text):
1. [F1,F4] Die Große Brennnessel ist eine Pflanze und gilt als nicht gefährdet (LC).
2. [F5] Sie wird bis zu 3 m hoch.
3. [F12] In Mainz-Bingen liegen 259 Meldungen aus zehn Jahren vor, vor allem im April bis Juli.
4. [F6,F7,F8] Sie ist eine Staude und blüht von Mai bis Oktober; die Bestäubung erfolgt durch Wind.
5. [F10] Als Fraßfeinde sind unter anderem Tagpfauenauge, Kleiner Fuchs, Eupteryx cyclops und Eupteryx urticae verzeichnet.
6. [F11] Sie ist außerdem Wirt von Tagpfauenauge, Landkärtchen und Kleiner Fuchs.
