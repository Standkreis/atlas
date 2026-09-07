# 📊 0027 prose re-grill · report

Model claude-sonnet-5 as Claude Code subagents (`model: "sonnet"`), 5 prompts per agent, drafts and audits in separate agents. 0026 columns from `e58e14e` (API, Sonnet 5). No dollars: no API call was made.

## 🔧 F1–F4 · edges per species

`full` = the V1 sheet's GloBI lines (all DB edges of the species), `eco` = the ECO sheet's candidates (named partner, in-set or ≥ 2 records, 0026's rule). F1 = eats/eatenBy whose studies are all metawebs (Reji Chacko trophiCH, Maiorano TETRA-EU). F2 = ≤ 1 real record from ≤ 1 real study. "eco kept" = after the cap of 8; in brackets 0026's kept count.

| species | tile | GloBI records | DB edges | full −F1 | full −F2 | full after | eco before (0026 rule) | eco −F1 | eco −F2 | eco after | eco kept (0026) | eco lines | ≥ 3 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Turdus merula | bird | 17253 | 200 | 184 | 0 | 16 | 198 | 182 | 0 | 16 | 8 (8) | 12 | ✓ |
| Lycaena phlaeas | insect | 2275 | 200 | 58 | 92 | 50 | 197 | 58 | 91 | 48 | 8 (8) | 9 | ✓ |
| Amanita muscaria | fungus | 935 | 13 | 0 | 8 | 5 | 2 | 0 | 2 | 0 | 0 (2) | 1 | ✗ |
| Salamandra salamandra | amphibian | 1447 | 187 | 180 | 2 | 5 | 22 | 20 | 0 | 2 | 2 (8) | 6 | ✓ |
| Urtica dioica | plant | 850 | 92 | 0 | 46 | 46 | 10 | 0 | 5 | 5 | 5 (8) | 7 | ✓ |
| Zoropsis spinimana | insect | 5 | 2 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 1 | ✗ |
| Grus grus | bird | 1750 | 198 | 197 | 1 | 0 | 28 | 28 | 0 | 0 | 0 (8) | 4 | ✓ |
| Lucanus cervus | insect | 99 | 43 | 36 | 3 | 4 | 12 | 8 | 1 | 3 | 3 (8) | 4 | ✓ |
| Rana temporaria | amphibian | 1192 | 198 | 170 | 19 | 9 | 54 | 41 | 8 | 5 | 5 (8) | 9 | ✓ |
| Alnus glutinosa | plant | 24782 | 200 | 179 | 13 | 8 | 85 | 64 | 13 | 8 | 8 (8) | 10 | ✓ |
| Bombus terrestris | insect | 38390 | 200 | 7 | 57 | 136 | 198 | 7 | 57 | 134 | 8 (8) | 9 | ✓ |
| Melanargia galathea | insect | 1910 | 199 | 87 | 68 | 44 | 174 | 65 | 66 | 43 | 8 (8) | 9 | ✓ |
| Mantis religiosa | insect | 592 | 196 | 164 | 12 | 20 | 39 | 25 | 7 | 7 | 7 (8) | 8 | ✓ |
| Aglais io | insect | 2736 | 200 | 68 | 88 | 44 | 197 | 67 | 88 | 42 | 8 (8) | 9 | ✓ |
| Vanessa atalanta | insect | 6603 | 200 | 56 | 82 | 62 | 199 | 56 | 82 | 61 | 8 (8) | 9 | ✓ |
| Apis mellifera | insect | 50000+ (189 pair queries) | 200 | 0 | 93 | 107 | 200 | 0 | 93 | 107 | 8 (8) | 9 | ✓ |
| Polyommatus icarus | insect | 3377 | 200 | 68 | 69 | 63 | 198 | 68 | 68 | 62 | 8 (8) | 9 | ✓ |
| Pieris rapae | insect | 14887 | 200 | 90 | 65 | 45 | 199 | 89 | 65 | 45 | 8 (8) | 9 | ✓ |
| Bombus pascuorum | insect | 35476 | 200 | 7 | 72 | 121 | 200 | 7 | 72 | 121 | 8 (8) | 9 | ✓ |
| Pieris napi | insect | 3448 | 200 | 87 | 59 | 54 | 200 | 87 | 59 | 54 | 8 (8) | 9 | ✓ |

Totals: DB edges 3328 · full −F1 1638 −F2 851 → 839 · eco candidates 2412 −F1 872 −F2 777 → 763. F2 drops with 0 GloBI records (the DB edge is not in GloBI's answer for the pair): Melanargia galathea 5, Aglais io 5, Apis mellifera 20. F3 and F4 are prompt and validator rules; their effect is the ❌ classification and the validator column below.

## 🌿 P2' · Ökologie paragraph, 18 species × de + en (0026: 19 species)

| run | validator ✓ | sentences | supported | partial | unsupported | texts with ❌ | claims | orphans | words (median) | JSON repaired draft / audit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ECO 0027 (P2') | 36 / 36 | 117 | 117 (100.0 %) | 0 (0.0 %) | **0 (0.0 %)** | 0 / 36 | 380 | 0 (0.0 / 100) | 54 | 0 / 0 |
| ECO 0026 | 38 / 38 | 141 | 118 (83.7 %) | 15 (10.6 %) | **8 (5.7 %)** | 6 / 38 | 463 | 19 (4.1 / 100) | 57 | 0 / 0 |
| 0027 de | 18 / 18 | 58 | 58 (100.0 %) | 0 (0.0 %) | **0 (0.0 %)** | 0 / 18 | 189 | 0 (0.0 / 100) | 49 | 0 / 0 |
| 0026 de | 19 / 19 | 74 | 62 (83.8 %) | 5 (6.8 %) | **7 (9.5 %)** | 5 / 19 | 233 | 7 (3.0 / 100) | 56 | 0 / 0 |
| 0027 en | 18 / 18 | 59 | 59 (100.0 %) | 0 (0.0 %) | **0 (0.0 %)** | 0 / 18 | 191 | 0 (0.0 / 100) | 57 | 0 / 0 |
| 0026 en | 19 / 19 | 67 | 56 (83.6 %) | 10 (14.9 %) | **1 (1.5 %)** | 1 / 19 | 230 | 12 (5.2 / 100) | 62 | 0 / 0 |
| 0027 0019 ten | 16 / 16 | 48 | 48 (100.0 %) | 0 (0.0 %) | **0 (0.0 %)** | 0 / 16 | 173 | 0 (0.0 / 100) | 49 | 0 / 0 |
| 0026 0019 ten | 18 / 18 | 74 | 61 (82.4 %) | 9 (12.2 %) | **4 (5.4 %)** | 2 / 18 | 237 | 12 (5.1 / 100) | 62 | 0 / 0 |
| 0027 insects | 20 / 20 | 69 | 69 (100.0 %) | 0 (0.0 %) | **0 (0.0 %)** | 0 / 20 | 207 | 0 (0.0 / 100) | 57 | 0 / 0 |
| 0026 insects | 20 / 20 | 67 | 57 (85.1 %) | 6 (9.0 %) | **4 (6.0 %)** | 4 / 20 | 226 | 7 (3.1 / 100) | 56 | 0 / 0 |

### 👓 P2' hand read · 36 paragraphs, 117 sentences · 🙈 embarrassing **2** · 🤔 odd 8

| species · lang | 🙈 embarrassing | 🤔 odd | note |
| --- | --- | --- | --- |
| Amsel · de | — | — | clean: eight fruit and berry plants, 17–40 real records each |
| Amsel · en | — | — | clean |
| Kleiner Feuerfalter · de | — | — | clean: eight nectar plants |
| Kleiner Feuerfalter · en | — | — | clean |
| Feuersalamander · de | — | s2 | s2 'ebenso die Domestic Cat': Felis catus has no German vernacular in the DB, the sheet falls back to the English name. The 0026 ducks, crane, boar and gull are gone (F1) |
| Feuersalamander · en | — | — | clean: grass snake (10 records), domestic cat (2) |
| Große Brennnessel · de | s2 | — | s2 'Sie wurde beim Fressen von Tagpfauenauge … beobachtet': the nettle observed eating the peacock. The line is 'wird gefressen von'; the model applied the eats template to eatenBy. Judge: supported. s3 (Wirtspflanze) correct |
| Große Brennnessel · en | — | — | clean: the direction is right in English ('have been recorded eating stinging nettle') |
| Kranich · de | — | — | clean: no partner lines survive F1/F2, one phenology sentence |
| Kranich · en | — | — | clean |
| Hirschkäfer · de | — | — | clean: the model left the three 2-record 'eats' lines (Rotbuche, Esche, Hasel; larval wood) out; phenology only |
| Hirschkäfer · en | — | — | clean, same omission |
| Grasfrosch · de | — | s2 | s2 'Spitzschlammschnecke' as a frog predator: 2 iNaturalist records (snails on spawn or dead tadpoles); true to the record, a herpetologist frowns. F2 keeps it because two records from one study pass '≤ 1' |
| Grasfrosch · en | — | s2 | same, plus 'swamp lymnaea' as the English name |
| Schwarz-Erle · de | s3 | — | s3 'Als Wirt verzeichnet sind Schmetterlings-Tramete, Zunderschwamm, …': reads as the fungi being the host. The line is 'Wirt von'; the eatenBy template ('Als Fressfeinde verzeichnet sind …', s2, correct) was reused for hostOf. Judge: supported (the audit agent flagged it in its summary, not in the verdict) |
| Schwarz-Erle · en | — | — | clean: 'recorded as a host for the fungi …', 'for the moths …', direction right |
| Dunkle Erdhummel · de | — | — | clean |
| Dunkle Erdhummel · en | — | — | clean |
| Schachbrett · de | — | — | clean: pollinates + visitsFlowersOf on Acker-Witwenblume both kept, both stated |
| Schachbrett · en | — | — | clean |
| Europäische Gottesanbeterin · de | — | — | clean: predators only; the model left the 'eats' lines (honey bee 10, wasp 4, wall lizard 2) out |
| Europäische Gottesanbeterin · en | — | — | clean, same |
| Tagpfauenauge · de | — | — | clean: flower visits; the 'eats' lines (nettle 40, ivy 22) left out |
| Tagpfauenauge · en | — | — | clean |
| Admiral · de | — | — | clean |
| Admiral · en | — | s2 | s2 'recorded eating English Ivy': 26 iNaturalist 'eats' records are adults at ivy flowers; true to the line, 'eating' is the wrong word for nectaring |
| Westliche Honigbiene · de | — | — | clean: Asian hornet 857 records, crab spiders, four forage plants |
| Westliche Honigbiene · en | — | — | clean |
| Hauhechel-Bläuling · de | — | — | clean |
| Hauhechel-Bläuling · en | — | — | clean |
| Kleiner Kohlweißling · de | — | s2 | s2–s4 'beim Fressen an Wiesenklee, Roter Spornblume, Löwenzahn …': all eight 'eats' lines are adults nectaring (iNaturalist); a reader expects Brassicaceae. Same in en |
| Kleiner Kohlweißling · en | — | s2 | same |
| Ackerhummel · de | — | — | clean: eight forage plants, 173–499 records |
| Ackerhummel · en | — | — | clean |
| Rapsweißling · de | — | s2 | s2 'Beim Fressen an Oregano (10)' next to s3 'Blütenbesuch an Oregano (28)': the same behaviour under two GloBI verbs |
| Rapsweißling · en | — | s2 | same |

## ✍️ P1' · V1 closed world, 20 species × de + en

| run | validator ✓ | sentences | supported | partial | unsupported | texts with ❌ | claims | orphans | words (median) | JSON repaired draft / audit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| V1 0027 (P1') | 40 / 40 | 202 | 200 (99.0 %) | 2 (1.0 %) | **0 (0.0 %)** | 0 / 40 | 513 | 1 (0.2 / 100) | 69 | 0 / 0 |
| V1 0026 | 33 / 40 | 160 | 137 (85.6 %) | 16 (10.0 %) | **7 (4.4 %)** | 6 / 40 | 698 | 27 (3.9 / 100) | 84 | 0 / 0 |
| 0027 de | 20 / 20 | 103 | 101 (98.1 %) | 2 (1.9 %) | **0 (0.0 %)** | 0 / 20 | 258 | 1 (0.4 / 100) | 64 | 0 / 0 |
| 0026 de | 15 / 20 | 84 | 69 (82.1 %) | 10 (11.9 %) | **5 (6.0 %)** | 4 / 20 | 350 | 19 (5.4 / 100) | 81 | 0 / 0 |
| 0027 en | 20 / 20 | 99 | 99 (100.0 %) | 0 (0.0 %) | **0 (0.0 %)** | 0 / 20 | 255 | 0 (0.0 / 100) | 71 | 0 / 0 |
| 0026 en | 18 / 20 | 76 | 68 (89.5 %) | 6 (7.9 %) | **2 (2.6 %)** | 2 / 20 | 348 | 8 (2.3 / 100) | 92 | 0 / 0 |
| 0027 0019 ten | 20 / 20 | 103 | 102 (99.0 %) | 1 (1.0 %) | **0 (0.0 %)** | 0 / 20 | 235 | 0 (0.0 / 100) | 71 | 0 / 0 |
| 0026 0019 ten | 16 / 20 | 84 | 70 (83.3 %) | 10 (11.9 %) | **4 (4.8 %)** | 4 / 20 | 336 | 16 (4.8 / 100) | 84 | 0 / 0 |
| 0027 insects | 20 / 20 | 99 | 98 (99.0 %) | 1 (1.0 %) | **0 (0.0 %)** | 0 / 20 | 278 | 1 (0.4 / 100) | 64 | 0 / 0 |
| 0026 insects | 17 / 20 | 76 | 67 (88.2 %) | 6 (7.9 %) | **3 (3.9 %)** | 2 / 20 | 362 | 11 (3.0 / 100) | 86 | 0 / 0 |

### ❌ every unsupported sentence, both runs (0)

| run | species · lang | s | text | judge |
| --- | --- | --- | --- | --- |

### validator failures (0)

none

## ⏱️ Subagents and wall time (nominal ⌈n / 5⌉; retries in the findings)

| run | drafts | draft agents | draft wall min | audits | audit agents | audit wall min | prompts → last audit min |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P2 | 36 | 8 | 2.6 | 36 | 8 | 1.0 | 5.7 |
| P1 | 40 | 8 | 3.2 | 40 | 8 | 1.6 | 7.5 |

## 📈 The production run on the plan (was P4)

| scope | taxa | drafts (de+en) | audits | subagents (5 each) | subagent minutes at 1 min each |
| --- | --- | --- | --- | --- | --- |
| one region | 300 | 600 | 600 | 240 | 240 |
| Neon today | 2414 | 4828 | 4828 | 1932 | 1932 |
| rewrite 20 % / year | 483 | 966 | 966 | 388 | 388 |
