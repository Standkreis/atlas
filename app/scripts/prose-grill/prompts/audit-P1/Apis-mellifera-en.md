# prompts/audit-P1/Apis-mellifera-en.md

Model `claude-sonnet-5`, thinking disabled, max_tokens 2000. The answer is the JSON object the model would return, nothing else, written to `answers/audit-P1/Apis-mellifera-en.json`.

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
F1 [GBIF] Scientific name Apis mellifera; rank species; class Insecta, order Hymenoptera; group: Insect or spider.
F2 [Wikidata] German name: Westliche Honigbiene.
F3 [Wikidata] English name: Western honey bee.
F4 [IUCN Red List] Status: DD (data deficient).
F5 [GloBI] eats: Bull Thistle (Cirsium vulgare), Garden cosmos (Cosmos bipinnatus), Borage (Borago officinalis), common dandelion (Taraxacum officinale), Phacelia (Phacelia tanacetifolia), Bloodwort (Achillea millefolium), Fodder Vetch (Vicia villosa), Cornflower (Centaurea cyanus), White Melilot (Melilotus albus), Oregano (Origanum vulgare), English Ivy (Hedera helix), Bird's-foot Trefoil (Lotus corniculatus) and 66 more.
F6 [GloBI] is eaten by: Asian hornet (Vespa velutina), Goldenrod Crab Spider (Misumena vatia), Shiny crab-spider (Synema globosum), European beewolf (Philanthus triangulum), Flower Spider (Thomisus onustus), European hornet (Vespa crabro), German Wasp (Vespula germanica), Cross Orbweaver (Araneus diadematus), European mantis (Mantis religiosa), Oak Spider (Aculepeira ceropegia), Common Wasp (Vespula vulgaris), European bee-eater (Merops apiaster).
F7 [GloBI] visits flowers of: Phacelia (Phacelia tanacetifolia), False London-rocket (Sisymbrium loeselii), Scentless Mayweed (Tripleurospermum inodorum), Alpine Squill (Scilla bifolia), Hedgerow Crane's-bill (Geranium pyrenaicum), Elder (Sambucus nigra), Woad (Isatis tinctoria), Crown Vetch (Coronilla varia), White Mullein (Verbascum lychnitis), Dwarf Elder (Sambucus ebulus), Perennial Yellow-Woundwort (Stachys recta), Warty Cabbage (Bunias orientalis) and 5 more.
F8 [GBIF occurrences] Region Mainz-Bingen: 593 reports in ten years; main time "Feb–Oct"; month profile as % of the peak month: Jan 4, Feb 41, Mar 54, Apr 37, May 30, Jun 100, Jul 75, Aug 100, Sep 66, Oct 31, Nov 11, Dec 4.
F9 [GBIF occurrences] Region Kyoto: 17 reports in ten years; main time "Jun–Jul"; month profile as % of the peak month: Jan 0, Feb 11, Mar 0, Apr 7, May 19, Jun 100, Jul 46, Aug 0, Sep 0, Oct 0, Nov 0, Dec 13.
F10 [GBIF occurrences] Region Schagen: 412 reports in ten years; main time "Apr–Aug"; month profile as % of the peak month: Jan 0, Feb 9, Mar 19, Apr 100, May 33, Jun 61, Jul 50, Aug 35, Sep 24, Oct 8, Nov 2, Dec 0.
F11 [GBIF occurrences] Region Südwestpfalz: 97 reports in ten years; main time "Feb–Apr · Jun–Sep"; month profile as % of the peak month: Jan 14, Feb 77, Mar 55, Apr 35, May 7, Jun 100, Jul 38, Aug 34, Sep 25, Oct 0, Nov 0, Dec 0.

TEXT (sentence n, cited ids, text):
1. [F8] In Mainz-Bingen there are 593 reports over ten years, with main time February to October.
2. [F4] The conservation status is listed as data deficient (DD) on the IUCN Red List.
3. [F1] It belongs to the group Insect or spider, class Insecta, order Hymenoptera.
4. [F5] It has been recorded eating Bull Thistle, Garden cosmos, Borage and common dandelion.
5. [F6] Recorded as predators are Asian hornet, Goldenrod Crab Spider, Shiny crab-spider and European beewolf.
6. [F7] It has been recorded visiting flowers of Phacelia, False London-rocket, Scentless Mayweed and Alpine Squill.
