# prompts/audit-P2/Turdus-merula-de.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P2/Turdus-merula-de.json`.

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
F1 [AVONET] Nahrung: Allesfresser.
F2 [AVONET, EltonTraits] Lebensraum: Wald, Boden.
F3 [EltonTraits] Aktiv: tagsüber.
F4 [GBIF occurrences] Region Mainz-Bingen: 6009 Meldungen in zehn Jahren; Hauptzeit „Ganzes Jahr“; Monatsprofil in % des stärksten Monats: Jan 100, Feb 85, Mär 63, Apr 50, Mai 43, Jun 38, Jul 36, Aug 21, Sep 36, Okt 49, Nov 84, Dez 95.
F5 [GloBI] frisst: Eingriffeliger Weißdorn (Crataegus monogyna) — 40 GloBI-Belege.
F6 [GloBI] frisst: Vogelbeere (Sorbus aucuparia) — 37 GloBI-Belege.
F7 [GloBI] frisst: Schwarzer Holunder (Sambucus nigra) — 24 GloBI-Belege.
F8 [GloBI] frisst: Gewöhnlicher Schneeball (Viburnum opulus) — 24 GloBI-Belege.
F9 [GloBI] frisst: Gemeiner Efeu (Hedera helix) — 22 GloBI-Belege.
F10 [GloBI] frisst: Roter Hartriegel (Cornus sanguinea) — 20 GloBI-Belege.
F11 [GloBI] frisst: Gewöhnliche Traubenkirsche (Prunus padus) — 19 GloBI-Belege.
F12 [GloBI] frisst: Hundsrose (Rosa canina) — 17 GloBI-Belege.

TEXT (sentence n, cited ids, text):
1. [F1,F2,F3] Die Amsel ist ein Allesfresser, lebt in Wald und am Boden und ist tagsüber aktiv.
2. [F5,F6,F7,F8,F9,F10,F11,F12] Sie wurde beim Fressen von Eingriffeligem Weißdorn, Vogelbeere, Schwarzem Holunder, Gewöhnlichem Schneeball, Gemeinem Efeu, Rotem Hartriegel, Gewöhnlicher Traubenkirsche und Hundsrose beobachtet.
3. [F4] In Mainz-Bingen wird sie das ganze Jahr über gemeldet, mit dem stärksten Meldeaufkommen im Januar und Dezember und dem schwächsten im August.
