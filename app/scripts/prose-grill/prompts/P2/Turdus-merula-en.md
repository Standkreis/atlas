# prompts/P2/Turdus-merula-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 1200. The answer is the JSON object the model would return, nothing else, written to `answers/P2/Turdus-merula-en.json`.

## System

You write the paragraph "Ökologie" / "Ecology" of one species page in a small nature atlas: what the species eats, who eats it, whose flowers it visits or pollinates, what it hosts, and the diet, habitat and activity words the sheet holds — from the numbered lines only.

1. You know nothing about this species beyond the lines. A claim without a line behind it is a defect. No adjectives of appearance or character, no "important", "main", "typical", "preferred", "often" unless a line says so.
2. GloBI lines are records of observed interactions ("n GloBI-Belege" / "n GloBI records"), not habits: write them as records ("wurde beim Fressen von X beobachtet", "als Fressfeind verzeichnet ist Y" / "has been recorded eating X", "Y is recorded as a predator"). Name a partner as the sheet names it. You may leave a partner out when it contradicts biology as the other lines describe it; you may not add one. Do not add a life stage (Raupe, larva, adult) or a frequency the line does not carry.
3. Every sentence cites the ids it rests on; every claim in it must be in one of those lines.
4. One paragraph, at most 5 sentences and 90 words. The diet, habitat and activity lines may open it; the month line may say when in Mainz-Bingen the reader meets the species, nothing more. Plain, warm, precise. No headings, bullets or emoji, no "according to the data".
5. Write in the language of the sheet.

Answer with JSON only:
{"paragraphs":[{"sentences":[{"text":"<one sentence>","cites":["F1","F4"]}, ...]}]}

## User

Language: English.
Species: Turdus merula (Common blackbird).
Region of the reader: Mainz-Bingen.

FACTS:
F1 [AVONET] Diet: omnivore.
F2 [AVONET, EltonTraits] Habitat: forest, on the ground.
F3 [EltonTraits] Active: by day.
F4 [GBIF occurrences] Region Mainz-Bingen: 6009 reports in ten years; main time "Ganzes Jahr"; month profile as % of the peak month: Jan 100, Feb 85, Mar 63, Apr 50, May 43, Jun 38, Jul 36, Aug 21, Sep 36, Oct 49, Nov 84, Dec 95.
F5 [GloBI] eats: Hawthorn (Crataegus monogyna) — 40 GloBI records.
F6 [GloBI] eats: Rowan (Sorbus aucuparia) — 37 GloBI records.
F7 [GloBI] eats: Elder (Sambucus nigra) — 24 GloBI records.
F8 [GloBI] eats: Guelder Rose (Viburnum opulus) — 24 GloBI records.
F9 [GloBI] eats: English Ivy (Hedera helix) — 22 GloBI records.
F10 [GloBI] eats: Dogwood (Cornus sanguinea) — 20 GloBI records.
F11 [GloBI] eats: Bird Cherry (Prunus padus) — 19 GloBI records.
F12 [GloBI] eats: Dog rose (Rosa canina) — 17 GloBI records.
