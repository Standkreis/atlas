# prompts/audit-P1/Pieris-napi-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Pieris-napi-de.json`.

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
F1 [GBIF] Wissenschaftlicher Name Pieris napi; Rang Art; Klasse Insecta, Ordnung Lepidoptera; Gruppe: Insekt oder Spinne.
F2 [Wikidata] Deutscher Name: Rapsweißling.
F3 [Wikidata] Englischer Name: Green-veined white.
F4 [GloBI] frisst: Oregano (Origanum vulgare), Wiesen-Schaumkraut (Cardamine pratensis), Acker-Witwenblume (Knautia arvensis), Vogel-Wicke (Vicia cracca).
F5 [GloBI] besucht Blüten von: Oregano (Origanum vulgare), Knoblauchsrauke (Alliaria petiolata), Purpurrote Taubnessel (Lamium purpureum), Gewöhnlicher Blutweiderich (Lythrum salicaria), Gänseblümchen (Bellis perennis), Gewöhnlicher Teufelsabbiss (Succisa pratensis), Schwarznessel (Ballota nigra), Kuckucks-Lichtnelke (Silene flos-cuculi), Gundermann (Glechoma hederacea), Tauben-Skabiose (Scabiosa columbaria), Luzerne (Medicago sativa), Wiesenklee (Trifolium pratense) und 38 weitere.
F6 [GBIF occurrences] Region Mainz-Bingen: 569 Meldungen in zehn Jahren; Hauptzeit „Apr–Sep“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 18, Apr 98, Mai 51, Jun 78, Jul 100, Aug 81, Sep 42, Okt 12, Nov 0, Dez 0.
F7 [GBIF occurrences] Region Schagen: 802 Meldungen in zehn Jahren; Hauptzeit „Apr–Sep“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 4, Apr 83, Mai 75, Jun 53, Jul 98, Aug 100, Sep 30, Okt 1, Nov 0, Dez 0.
F8 [GBIF occurrences] Region Südwestpfalz: 473 Meldungen in zehn Jahren; Hauptzeit „Apr–Mai · Jul–Sep“; Monatsprofil in % des stärksten Monats: Jan 0, Feb 0, Mär 0, Apr 100, Mai 41, Jun 14, Jul 49, Aug 54, Sep 65, Okt 7, Nov 0, Dez 0.

TEXT (sentence n, cited ids, text):
1. [F1,F2] Der Rapsweißling ist ein Insekt aus der Ordnung Lepidoptera.
2. [F6] In Mainz-Bingen wurden in zehn Jahren 569 Meldungen erfasst, mit Hauptzeit von April bis September und den meisten Meldungen im Juli.
3. [F4] Er wurde beim Fressen von Oregano, Wiesen-Schaumkraut, Acker-Witwenblume und Vogel-Wicke beobachtet.
4. [F5] Er wurde beim Besuch der Blüten von Knoblauchsrauke, Gänseblümchen, Gundermann und Luzerne beobachtet.
