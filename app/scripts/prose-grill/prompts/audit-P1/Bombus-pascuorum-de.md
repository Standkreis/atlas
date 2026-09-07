# prompts/audit-P1/Bombus-pascuorum-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Bombus-pascuorum-de.json`.

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
F1 [GBIF] Wissenschaftlicher Name Bombus pascuorum; Rang Art; Klasse Insecta, Ordnung Hymenoptera; Gruppe: Insekt oder Spinne.
F2 [Wikidata] Deutscher Name: Ackerhummel.
F3 [Wikidata] Englischer Name: Common Carder Bee.
F4 [IUCN Red List] Status: LC (nicht gefährdet).
F5 [GloBI] frisst: Wiesenklee (Trifolium pratense), Oregano (Origanum vulgare), Gewöhnlicher Natternkopf (Echium vulgare), Weißklee (Trifolium repens), Purpurrote Taubnessel (Lamium purpureum), Gewöhnlicher Teufelsabbiss (Succisa pratensis), Weiße Taubnessel (Lamium album), Rispen-Flockenblume (Centaurea stoebe), Echter Beinwell (Symphytum officinale), Gundermann (Glechoma hederacea), Acker-Witwenblume (Knautia arvensis), Moschus-Malve (Malva moschata) und 12 weitere.
F6 [GloBI] wird gefressen von: Veränderliche Krabbenspinne (Misumena vatia).
F7 [GloBI] besucht Blüten von: Sumpf-Kratzdistel (Cirsium palustre), Gewöhnlicher Teufelsabbiss (Succisa pratensis), Skabiosen-Flockenblume (Centaurea scabiosa), Wiesen-Platterbse (Lathyrus pratensis), Acker-Kratzdistel (Cirsium arvense), Zaun-Wicke (Vicia sepium), Acker-Witwenblume (Knautia arvensis), Roter Fingerhut (Digitalis purpurea), Kriechender Günsel (Ajuga reptans), Gundermann (Glechoma hederacea), Wiesen-Storchschnabel (Geranium pratense), Purpurrote Taubnessel (Lamium purpureum) und 84 weitere.
F8 [GBIF occurrences] Region Mainz-Bingen: 572 Meldungen in zehn Jahren; Hauptzeit „Apr–Sep“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 12, Apr 39, Mai 33, Jun 72, Jul 71, Aug 100, Sep 47, Okt 18, Nov 0, Dez 0.
F9 [GBIF occurrences] Region Schagen: 500 Meldungen in zehn Jahren; Hauptzeit „Apr–Sep“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 11, Apr 100, Mai 59, Jun 93, Jul 96, Aug 83, Sep 56, Okt 18, Nov 0, Dez 0.
F10 [GBIF occurrences] Region Südwestpfalz: 144 Meldungen in zehn Jahren; Hauptzeit „Apr · Jun · Aug“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 24, Apr 100, Mai 23, Jun 53, Jul 10, Aug 32, Sep 16, Okt 12, Nov 0, Dez 0.

TEXT (sentence n, cited ids, text):
1. [F1,F2,F4] Die Ackerhummel ist ein Insekt aus der Ordnung Hymenoptera und wird von der IUCN als nicht gefährdet (LC) eingestuft.
2. [F8] In Mainz-Bingen wurden in zehn Jahren 572 Meldungen erfasst, mit Hauptzeit von April bis September und den meisten Meldungen im August.
3. [F5] Sie wurde beim Fressen von Wiesenklee, Oregano, Gewöhnlichem Natternkopf und Weißklee beobachtet.
4. [F6] Als Fressfeind ist die Veränderliche Krabbenspinne verzeichnet.
5. [F7] Sie wurde beim Besuch der Blüten von Sumpf-Kratzdistel, Skabiosen-Flockenblume, Wiesen-Platterbse und Rotem Fingerhut beobachtet.
