# prompts/P1/Urtica-dioica-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 1200. The answer is the JSON object the model would return, nothing else, written to `answers/P1/Urtica-dioica-en.json`.

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
Species: Urtica dioica (Stinging Nettle).
Region of the reader: Mainz-Bingen.

FACTS:
F1 [GBIF] Scientific name Urtica dioica; rank species; class Magnoliopsida, order Rosales; group: Plant.
F2 [Wikidata] German name: Große Brennnessel.
F3 [Wikidata] English name: Stinging Nettle.
F4 [IUCN Red List] Status: LC (least concern).
F5 [GIFT (Weigelt et al.)] Height: up to 3 m.
F6 [GIFT (Weigelt et al.)] Life form: perennial herb.
F7 [GIFT (Weigelt et al.)] Flowering: May–Oct.
F8 [GIFT (Weigelt et al.)] Pollination: wind.
F9 [GloBI] eats: Colpocephalum indi (Colpocephalum indi), Splendoroffula tauracobia (Splendoroffula tauracobia), Eomenopon ryani (Eomenopon ryani), Myrsidea breviventris (Myrsidea breviventris), Eomenopon sintillatae (Eomenopon sintillatae).
F10 [GloBI] is eaten by: Peacock (Aglais io), Small tortoiseshell (Aglais urticae), Eupteryx cyclops (Eupteryx cyclops), Eupteryx urticae (Eupteryx urticae), Eupteryx aurata (Eupteryx aurata), Eupteryx calcarata (Eupteryx calcarata), Macropsis scutellatus (Macropsis scutellatus), Aphrodes makarovi (Aphrodes makarovi), Agallia consobrina (Agallia consobrina), Colladonus mendicus (Colladonus mendicus), Metcalfa pruinosa (Metcalfa pruinosa), Orientus ishidae (Orientus ishidae) and 4 more.
F11 [GloBI] host of: Peacock (Aglais io), Map (Araschnia levana), Small tortoiseshell (Aglais urticae), Puccinia caricina (Puccinia caricina), Ramularia urticae (Ramularia urticae), Leptosphaeria acuta (Leptosphaeria acuta), Puccinia urticata (Puccinia urticata), Puccinia urticae (Puccinia urticae), Erysiphe urticae (Erysiphe urticae), Septoria urticae (Septoria urticae), Leptosphaeria conoidea (Leptosphaeria conoidea), Didymella eupyrena (Didymella eupyrena) and 13 more.
F12 [GBIF occurrences] Region Mainz-Bingen: 259 reports in ten years; main time "Apr–Jul"; month profile as % of the peak month: Jan 0, Feb 0, Mar 14, Apr 31, May 100, Jun 28, Jul 37, Aug 15, Sep 18, Oct 25, Nov 9, Dec 3.
F13 [GBIF occurrences] Region Schagen: 101 reports in ten years; main time "Ganzes Jahr"; month profile as % of the peak month: Jan 22, Feb 49, Mar 43, Apr 49, May 62, Jun 100, Jul 59, Aug 56, Sep 95, Oct 62, Nov 46, Dec 60.
F14 [GBIF occurrences] Region Südwestpfalz: 52 reports in ten years; main time "Feb · Apr–Sep"; month profile as % of the peak month: Jan 0, Feb 72, Mar 0, Apr 56, May 100, Jun 70, Jul 89, Aug 36, Sep 54, Oct 0, Nov 0, Dec 0.
