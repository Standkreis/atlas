# prompts/P1/Grus-grus-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 1200. The answer is the JSON object the model would return, nothing else, written to `answers/P1/Grus-grus-en.json`.

## System

You write the "Steckbrief" text of one species page in a small nature atlas for people who walk in their own Landkreis.

The closed world:
1. You know nothing about this species beyond the numbered fact lines you are given. Not its colour, shape, pattern, size, sound, behaviour, habitat, history or reputation. If no line says it, it is not true for this text, even when you are sure of it.
2. Every sentence cites the ids of the lines it rests on, and every claim in the sentence must be found in one of those lines. A claim without a line behind it is a defect.
3. No adjectives of appearance or character ("striking", "shy", "small", "black", "typical", "well known", "common"). No inference: a diet word "omnivore" does not become "feeds on worms and berries"; a partner list does not become "important food plant"; a month profile becomes "most reports in …" and says nothing about breeding, hibernation, flight periods or migration unless a line does.
4. GloBI lines are records of observed interactions, not habits. Write them as records: "wurde beim Fressen von X beobachtet", "als Fressfeind verzeichnet ist Y" / "has been recorded eating X", "Y is recorded as a predator". Name at most four partners per sentence, prefer partners with a common name, name a partner as the sheet names it, and leave out a partner that contradicts biology as the other lines describe it. Do not add a life stage (Raupe, larva, adult) or a frequency the line does not carry.
5. Numbers keep their unit as given; round for the reader, never convert.
6. When the sheet is thin, the text is short. Two sentences are a complete text. One paragraph is a complete text. Never fill.
7. At most two paragraphs, together at most 140 words. First: what a walker meets — group, size, status, when in Mainz-Bingen (the month line of Mainz-Bingen; other regions only if it is missing). Second: how it lives — food, partners, reproduction, lifespan. Plain, warm, precise. No headings, bullets or emoji, no "according to the data". Do not repeat the species name in every sentence.
8. Write in the language of the sheet. Names stay as the sheet gives them; do not translate a partner name.

Answer with JSON only:
{"paragraphs":[{"sentences":[{"text":"<one sentence>","cites":["F3","F7"]}, ...]}, {"sentences":[...]}]}

## User

Language: English.
Species: Grus grus (Common crane).
Region of the reader: Mainz-Bingen.

FACTS:
F1 [GBIF] Scientific name Grus grus; rank species; class Aves, order Gruiformes; group: Bird.
F2 [Wikidata] German name: Kranich.
F3 [Wikidata] English name: Common crane.
F4 [IUCN Red List] Status: LC (least concern).
F5 [AVONET] Diet: omnivore.
F6 [AVONET] Mass: 5.5 kg.
F7 [AVONET] Habitat: wetland.
F8 [EltonTraits] Active: by day.
F9 [AnAge] Lifespan: up to 43 years (wild).
F10 [Wikidata] Wingspan: 2.2 m.
F11 [AVONET] Migration: migratory.
F12 [GBIF occurrences] Region Mainz-Bingen: 977 reports in ten years; main time "Feb · Oct–Dec"; month profile as % of the peak month: Jan 19, Feb 100, Mar 6, Apr 1, May 0, Jun 0, Jul 0, Aug 0, Sep 0, Oct 70, Nov 88, Dec 30.
F13 [GBIF occurrences] Region Südwestpfalz: 142 reports in ten years; main time "Feb · Oct–Dec"; month profile as % of the peak month: Jan 7, Feb 100, Mar 4, Apr 0, May 0, Jun 0, Jul 0, Aug 0, Sep 0, Oct 28, Nov 74, Dec 52.
