# prompts/P1/Turdus-merula-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 1200. The answer is the JSON object the model would return, nothing else, written to `answers/P1/Turdus-merula-en.json`.

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
Species: Turdus merula (Common blackbird).
Region of the reader: Mainz-Bingen.

FACTS:
F1 [GBIF] Scientific name Turdus merula; rank species; class Aves, order Passeriformes; group: Bird.
F2 [Wikidata] German name: Amsel.
F3 [Wikidata] English name: Common blackbird.
F4 [IUCN Red List] Status: LC (least concern).
F5 [AVONET] Diet: omnivore.
F6 [AVONET] Mass: 103 g.
F7 [AVONET, EltonTraits] Habitat: forest, on the ground.
F8 [EltonTraits] Active: by day.
F9 [AnAge] Lifespan: up to 21.8 years (wild).
F10 [Wikidata] Wingspan: 36 cm.
F11 [AVONET] Migration: resident.
F12 [AnAge] Offspring: mature at 365 days.
F13 [GloBI] eats: Hawthorn (Crataegus monogyna), Rowan (Sorbus aucuparia), Elder (Sambucus nigra), Guelder Rose (Viburnum opulus), English Ivy (Hedera helix), Dogwood (Cornus sanguinea), Bird Cherry (Prunus padus), Dog rose (Rosa canina), Blackthorn (Prunus spinosa), Wild Privet (Ligustrum vulgare), Sweet Cherry (Prunus avium), Wayfaring Tree (Viburnum lantana) and 4 more.
F14 [GBIF occurrences] Region Mainz-Bingen: 6009 reports in ten years; main time "Ganzes Jahr"; month profile as % of the peak month: Jan 100, Feb 85, Mar 63, Apr 50, May 43, Jun 38, Jul 36, Aug 21, Sep 36, Oct 49, Nov 84, Dec 95.
F15 [GBIF occurrences] Region Schagen: 1683 reports in ten years; main time "Ganzes Jahr"; month profile as % of the peak month: Jan 100, Feb 78, Mar 38, Apr 38, May 35, Jun 20, Jul 24, Aug 11, Sep 10, Oct 56, Nov 100, Dec 81.
F16 [GBIF occurrences] Region Südwestpfalz: 944 reports in ten years; main time "May · Nov–Mar"; month profile as % of the peak month: Jan 100, Feb 51, Mar 50, Apr 22, May 30, Jun 10, Jul 6, Aug 6, Sep 5, Oct 11, Nov 45, Dec 67.
