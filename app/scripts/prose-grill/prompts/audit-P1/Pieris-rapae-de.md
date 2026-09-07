# prompts/audit-P1/Pieris-rapae-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Pieris-rapae-de.json`.

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
F1 [GBIF] Wissenschaftlicher Name Pieris rapae; Rang Art; Klasse Insecta, Ordnung Lepidoptera; Gruppe: Insekt oder Spinne.
F2 [Wikidata] Deutscher Name: Kleiner Kohlweißling.
F3 [Wikidata] Englischer Name: Small White.
F4 [GloBI] frisst: Wiesenklee (Trifolium pratense), Rote Spornblume (Centranthus ruber), Gewöhnlicher Löwenzahn (Taraxacum officinale), Raps (Brassica napus), Gewöhnliches Bitterkraut (Picris hieracioides), Luzerne (Medicago sativa), Gewöhnlicher Blutweiderich (Lythrum salicaria), Oregano (Origanum vulgare), Kleine Braunelle (Prunella vulgaris), Weg-Rauke (Sisymbrium officinale), Einjähriges Berufkraut (Erigeron annuus), Gewöhnliche Kratzdistel (Cirsium vulgare) und 26 weitere.
F5 [GloBI] wird gefressen von: Veränderliche Krabbenspinne (Misumena vatia), Haussperling (Passer domesticus).
F6 [GloBI] besucht Blüten von: Gewöhnliches Hirtentäschel (Capsella bursa-pastoris), Kratzbeere (Rubus caesius), Scharfer Hahnenfuß (Ranunculus acris), Gamander-Ehrenpreis (Veronica chamaedrys), Spitzwegerich (Plantago lanceolata).
F7 [GBIF occurrences] Region Mainz-Bingen: 576 Meldungen in zehn Jahren; Hauptzeit „Jun–Sep“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 7, Apr 22, Mai 16, Jun 46, Jul 66, Aug 100, Sep 65, Okt 24, Nov 3, Dez 3.
F8 [GBIF occurrences] Region Kyoto: 64 Meldungen in zehn Jahren; Hauptzeit „Mai–Jul“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 3, Apr 13, Mai 100, Jun 79, Jul 40, Aug 6, Sep 5, Okt 0, Nov 9, Dez 0.
F9 [GBIF occurrences] Region Schagen: 747 Meldungen in zehn Jahren; Hauptzeit „Apr–Sep“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 1, Mär 17, Apr 46, Mai 32, Jun 30, Jul 82, Aug 100, Sep 90, Okt 19, Nov 5, Dez 0.
F10 [GBIF occurrences] Region Südwestpfalz: 391 Meldungen in zehn Jahren; Hauptzeit „Apr · Jun–Okt“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 5, Mär 2, Apr 29, Mai 16, Jun 37, Jul 36, Aug 48, Sep 100, Okt 64, Nov 0, Dez 0.

TEXT (sentence n, cited ids, text):
1. [F7] In Mainz-Bingen liegen 576 Meldungen aus zehn Jahren vor, mit Hauptzeit Juni bis September.
2. [F1] Sie zählt zur Gruppe Insekt oder Spinne, Klasse Insecta, Ordnung Lepidoptera.
3. [F4] Beim Fressen wurde sie an Wiesenklee, Roter Spornblume, Gewöhnlichem Löwenzahn und Raps beobachtet.
4. [F5] Als Fressfeinde sind Veränderliche Krabbenspinne und Haussperling verzeichnet.
5. [F6] Blüten besucht wurden bei Gewöhnlichem Hirtentäschel, Kratzbeere, Scharfem Hahnenfuß und Gamander-Ehrenpreis.
