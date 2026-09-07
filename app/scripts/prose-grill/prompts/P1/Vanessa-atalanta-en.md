# prompts/P1/Vanessa-atalanta-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 1200. The answer is the JSON object the model would return, nothing else, written to `answers/P1/Vanessa-atalanta-en.json`.

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
Species: Vanessa atalanta (Red Admiral).
Region of the reader: Mainz-Bingen.

FACTS:
F1 [GBIF] Scientific name Vanessa atalanta; rank species; class Insecta, order Lepidoptera; group: Insect or spider.
F2 [Wikidata] German name: Admiral.
F3 [Wikidata] English name: Red Admiral.
F4 [IUCN Red List] Status: LC (least concern).
F5 [GloBI] eats: English Ivy (Hedera helix), Valeriana rubra (Centranthus ruber), Stinging Nettle (Urtica dioica), Red Clover (Trifolium pratense), Daisy (Bellis perennis), Apple (Malus domestica), Queen Anne's Lace (Daucus carota), Hemp Agrimony (Eupatorium cannabinum), common dandelion (Taraxacum officinale), Marsh Thistle (Cirsium palustre), Alfalfa (Medicago sativa), Garden cosmos (Cosmos bipinnatus) and 2 more.
F6 [GloBI] is eaten by: European hornet (Vespa crabro), European bee-eater (Merops apiaster).
F7 [GloBI] pollinates: Field Eryngo (Eryngium campestre).
F8 [GloBI] visits flowers of: Common Lilac (Syringa vulgaris), Hemp Agrimony (Eupatorium cannabinum), Creeping Thistle (Cirsium arvense), common dandelion (Taraxacum officinale), English Ivy (Hedera helix), cherry laurel (Prunus laurocerasus), Garlic Mustard (Alliaria petiolata), Red Clover (Trifolium pratense), Valeriana rubra (Centranthus ruber), Queen Anne's Lace (Daucus carota), Hawthorn (Crataegus monogyna), Oxeye Daisy (Leucanthemum vulgare) and 33 more.
F9 [GBIF occurrences] Region Mainz-Bingen: 594 reports in ten years; main time "Feb–Apr · Jun–Oct"; month profile as % of the peak month: Jan 1, Feb 31, Mar 44, Apr 28, May 12, Jun 50, Jul 100, Aug 98, Sep 74, Oct 69, Nov 21, Dec 6.
F10 [GBIF occurrences] Region Schagen: 1672 reports in ten years; main time "May–Oct"; month profile as % of the peak month: Jan 0, Feb 0, Mar 4, Apr 19, May 35, Jun 70, Jul 100, Aug 71, Sep 58, Oct 29, Nov 13, Dec 0.
F11 [GBIF occurrences] Region Südwestpfalz: 634 reports in ten years; main time "Feb–Mar · Sep–Oct"; month profile as % of the peak month: Jan 1, Feb 100, Mar 62, Apr 16, May 2, Jun 18, Jul 24, Aug 23, Sep 48, Oct 41, Nov 22, Dec 7.
