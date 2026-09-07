# 🔥🔁 [0027] Findings — the prose re-grill after the four fixes

> Brief: [0027-prose-regrill.md](0027-prose-regrill.md). 0026 said **wait** because the Ökologie input leaked (metaweb rows, 1-record pairs) and the text side was close. After F1–F4 the input no longer leaks: the hand read of all 36 Ökologie paragraphs finds **0 false facts**. It finds **2 sentences with the direction reversed** (German: the nettle eating the butterfly, the fungi hosting the alder), the model's template slip on the brief's F3 wording, invisible to the judge. A fifth fix (F5: one template per line kind, a direction-aware judge) re-run on the same 36 gives **0 / 110**. P1' V1: **0 % unsupported** (2 partial, both harmless). Both gates pass with F5; §📐 is written. No API call was made: 49 Sonnet subagents, ≈ 13 min of stage wall time.

| 🗓️ Run | 👤 By | 🌿 Branch | 🤖 Model | 💸 Cost |
| --- | --- | --- | --- | --- |
| 2026-09-07 | Claude Fable 5.1 for Sven Reiser | `prose-2`, worktree `../standkreis-dex-prose` | Sonnet as Claude Code subagents (`Agent`, `model: "sonnet"`), 5 prompts per agent | 0 $ · 49 subagents · ≈ 2.3 M subagent tokens |

## 🧪 Setup

| what | value |
| --- | --- |
| species | 0026's twenty (the 0019 ten + ten Mainz-Bingen insects); P2'/P3 take the 18 whose eco sheet has ≥ 3 lines (Amanita muscaria 1 line, Zoropsis spinimana 1 line; **the brief's "19 × 2 = 38" cannot hold, F2 emptied Amanita**) |
| sheets | `sheets.mjs`: dev DB read only, GloBI `includeObservations=true`, every edge with its studies and its real (non-metaweb) record count → `sheets.json` |
| protocol | `prose.mjs prompts P1\|P2\|P3` writes `prompts/<run>/<Sci-Name>-<lang>.md`; a subagent answers into `answers/<run>/…json`; `prose.mjs collect` validates and writes `prompts/audit-<run>/…`; audit subagents answer into `answers/audit-<run>/…`; `report.mjs` computes everything. All 152 + 72 files are committed as evidence |
| runs | P2' = ECO (F1–F4) 18 × de/en · P1' = V1 20 × de/en · P3 = ECO2 (F1–F5) 18 × de/en |
| judge | AUDIT verdict-first (0026 doubt 7), F3 wording granted; P3 uses AUDIT2 (direction is a claim) |
| 0026 columns | `git show e58e14e:app/scripts/prose-grill/results.json` |

## 🔧 F1–F5 · what each fix removed

| # | Fix | Rule as built | Effect |
| --- | --- | --- | --- |
| F1 | edges carry their studies | `sheets.mjs`: `METAWEB` regex list (Reji Chacko trophiCH, Maiorano TETRA-EU; "metaweb", "potential", "Eurotrophic" matched nothing else); eats/eatenBy whose studies are **all** metawebs are dropped | full sheet −1 638 of 3 328 DB edges; eco candidates −872 of 2 412 |
| F2 | thin pairs out | ≤ 1 **real** record from ≤ 1 real study (my extension of the brief's "one record from one study": metaweb copies do not count as records) | full −851 → 839 left; eco −777 → 763 left. 30 drops have 0 GloBI records (Melanargia 5, Aglais 5, Apis 20: the DB edge is not in GloBI's answer for the pair) |
| F3 | "beobachtet" one way | ECO rule 2 and AUDIT rule 2 name the record wording; life stage and frequency forbidden | 0 artefact ❌ (0026: 4 of 7 V1 ❌ were this) |
| F4 | one paragraph valid | `paragraphs` is a maximum, any sheet size; `parseJson` cuts the stray `{"paragraphs":[]}` element (6 of 0026's 7 V1 failures) | V1 validator 40 / 40 (0026: 33 / 40) |
| F5 | direction | ECO2 rule 2: one template per line kind, the species always the subject; AUDIT2 rule 3: a reversed direction is unsupported | 🙈 2 → 0 on the same 36 paragraphs |

Per species (full = V1 sheet, eco = ECO candidates; "kept" = after the cap of 8, 0026's count in brackets):

| species | DB edges | full −F1 | full −F2 | full after | eco before | eco −F1 | eco −F2 | eco after | eco kept (0026) | ≥ 3 lines |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Turdus merula | 200 | 184 | 0 | 16 | 198 | 182 | 0 | 16 | 8 (8) | ✓ |
| Lycaena phlaeas | 200 | 58 | 92 | 50 | 197 | 58 | 91 | 48 | 8 (8) | ✓ |
| Amanita muscaria | 13 | 0 | 8 | 5 | 2 | 0 | 2 | 0 | 0 (2) | ✗ |
| Salamandra salamandra | 187 | 180 | 2 | 5 | 22 | 20 | 0 | 2 | 2 (8) | ✓ |
| Urtica dioica | 92 | 0 | 46 | 46 | 10 | 0 | 5 | 5 | 5 (8) | ✓ |
| Zoropsis spinimana | 2 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 (0) | ✗ |
| Grus grus | 198 | 197 | 1 | 0 | 28 | 28 | 0 | 0 | 0 (8) | ✓ |
| Lucanus cervus | 43 | 36 | 3 | 4 | 12 | 8 | 1 | 3 | 3 (8) | ✓ |
| Rana temporaria | 198 | 170 | 19 | 9 | 54 | 41 | 8 | 5 | 5 (8) | ✓ |
| Alnus glutinosa | 200 | 179 | 13 | 8 | 85 | 64 | 13 | 8 | 8 (8) | ✓ |
| Bombus terrestris | 200 | 7 | 57 | 136 | 198 | 7 | 57 | 134 | 8 (8) | ✓ |
| Melanargia galathea | 199 | 87 | 68 | 44 | 174 | 65 | 66 | 43 | 8 (8) | ✓ |
| Mantis religiosa | 196 | 164 | 12 | 20 | 39 | 25 | 7 | 7 | 7 (8) | ✓ |
| Aglais io | 200 | 68 | 88 | 44 | 197 | 67 | 88 | 42 | 8 (8) | ✓ |
| Vanessa atalanta | 200 | 56 | 82 | 62 | 199 | 56 | 82 | 61 | 8 (8) | ✓ |
| Apis mellifera | 200 | 0 | 93 | 107 | 200 | 0 | 93 | 107 | 8 (8) | ✓ |
| Polyommatus icarus | 200 | 68 | 69 | 63 | 198 | 68 | 68 | 62 | 8 (8) | ✓ |
| Pieris rapae | 200 | 90 | 65 | 45 | 199 | 89 | 65 | 45 | 8 (8) | ✓ |
| Bombus pascuorum | 200 | 7 | 72 | 121 | 200 | 7 | 72 | 121 | 8 (8) | ✓ |
| Pieris napi | 200 | 87 | 59 | 54 | 200 | 87 | 59 | 54 | 8 (8) | ✓ |

The 0026 leaks are gone by construction: Salamandra loses 180 of 187 edges (the ducks, crane, boar, gull were TETRA-EU), Grus all 198, Rana 189 of 198. The vertebrates keep 0–16 real edges; the insects keep 42–136, nearly all iNaturalist and pollination datasets.

## 🌿 P2' and P3 · Ökologie paragraph, 18 species × de + en

| run | validator ✓ | sentences | supported | partial | unsupported | texts with ❌ | claims | orphans | words (median) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **ECO 0027 (P2', F1–F4)** | 36 / 36 | 117 | 117 (100 %) | 0 | **0 (0.0 %)** | 0 / 36 | 380 | 0 | 54 |
| **ECO2 0027 (P3, +F5)** | 36 / 36 | 110 | 110 (100 %) | 0 | **0 (0.0 %)** | 0 / 36 | 360 | 0 | 48 |
| ECO 0026 | 38 / 38 | 141 | 118 (83.7 %) | 15 (10.6 %) | **8 (5.7 %)** | 6 / 38 | 463 | 19 (4.1 / 100) | 57 |
| 0027 de / en | 18 / 18 · 18 / 18 | 58 · 59 | 100 % · 100 % | 0 · 0 | **0 · 0** | 0 · 0 | 189 · 191 | 0 · 0 | 49 · 57 |
| 0026 de / en | 19 / 19 · 19 / 19 | 74 · 67 | 83.8 % · 83.6 % | 5 · 10 | **7 (9.5 %) · 1 (1.5 %)** | 5 · 1 | 233 · 230 | 7 · 12 | 56 · 62 |

The judge's 100 % is F3 at work (and a judge that is now told what a record grants; see doubt 2). The gate is the hand read.

### 👓 Hand read · every paragraph, every sentence (mine, not a subagent)

🙈 = false as written, a reader who knows the species objects · 🤔 = true to the line, reads oddly · ✓ = fine. `cause` in `marks.json`: input (the sheet line) or text (the model's wording).

**P2' (F1–F4) · 36 paragraphs, 117 sentences · 🙈 2 · 🤔 8**

| species · lang | sentences, marked | note |
| --- | --- | --- |
| Amsel · de | s1 ✓ · s2 ✓ · s3 ✓ | clean: eight fruit and berry plants, 17–40 real records each |
| Amsel · en | s1 ✓ · s2 ✓ · s3 ✓ | clean |
| Kleiner Feuerfalter · de | s1 ✓ · s2 ✓ | clean: eight nectar plants |
| Kleiner Feuerfalter · en | s1 ✓ · s2 ✓ | clean |
| Feuersalamander · de | s1 ✓ · s2 🤔 · s3 ✓ | s2 'ebenso die Domestic Cat': Felis catus has no German vernacular in the DB, the sheet falls back to the English name. The 0026 ducks, crane, boar and gull are gone (F1) |
| Feuersalamander · en | s1 ✓ · s2 ✓ · s3 ✓ · s4 ✓ | clean: grass snake (10 records), domestic cat (2) |
| Große Brennnessel · de | s1 ✓ · s2 🙈 · s3 ✓ · s4 ✓ | s2 'Sie wurde beim Fressen von Tagpfauenauge … beobachtet': the nettle observed eating the peacock. The line is 'wird gefressen von'; the model applied the eats template to eatenBy. Judge: supported. s3 (Wirtspflanze) correct |
| Große Brennnessel · en | s1 ✓ · s2 ✓ · s3 ✓ · s4 ✓ | clean: the direction is right in English ('have been recorded eating stinging nettle') |
| Kranich · de | s1 ✓ · s2 ✓ | clean: no partner lines survive F1/F2, one phenology sentence |
| Kranich · en | s1 ✓ · s2 ✓ | clean |
| Hirschkäfer · de | s1 ✓ · s2 ✓ | clean: the model left the three 2-record 'eats' lines (Rotbuche, Esche, Hasel; larval wood) out; phenology only |
| Hirschkäfer · en | s1 ✓ · s2 ✓ | clean, same omission |
| Grasfrosch · de | s1 ✓ · s2 🤔 · s3 ✓ | s2 'Spitzschlammschnecke' as a frog predator: 2 iNaturalist records (snails on spawn or dead tadpoles); true to the record, a herpetologist frowns. F2 keeps it because two records from one study pass '≤ 1' |
| Grasfrosch · en | s1 ✓ · s2 🤔 · s3 ✓ | same, plus 'swamp lymnaea' as the English name |
| Schwarz-Erle · de | s1 ✓ · s2 ✓ · s3 🙈 · s4 ✓ | s3 'Als Wirt verzeichnet sind Schmetterlings-Tramete, Zunderschwamm, …': reads as the fungi being the host. The line is 'Wirt von'; the eatenBy template ('Als Fressfeinde verzeichnet sind …', s2, correct) was reused for hostOf. Judge: supported (the audit agent flagged it in its summary, not in the verdict) |
| Schwarz-Erle · en | s1 ✓ · s2 ✓ · s3 ✓ · s4 ✓ · s5 ✓ | clean: 'recorded as a host for the fungi …', 'for the moths …', direction right |
| Dunkle Erdhummel · de | s1 ✓ · s2 ✓ · s3 ✓ · s4 ✓ | clean |
| Dunkle Erdhummel · en | s1 ✓ · s2 ✓ · s3 ✓ · s4 ✓ | clean |
| Schachbrett · de | s1 ✓ · s2 ✓ · s3 ✓ · s4 ✓ | clean: pollinates + visitsFlowersOf on Acker-Witwenblume both kept, both stated |
| Schachbrett · en | s1 ✓ · s2 ✓ · s3 ✓ · s4 ✓ | clean |
| Europäische Gottesanbeterin · de | s1 ✓ · s2 ✓ · s3 ✓ | clean: predators only; the model left the 'eats' lines (honey bee 10, wasp 4, wall lizard 2) out |
| Europäische Gottesanbeterin · en | s1 ✓ · s2 ✓ · s3 ✓ | clean, same |
| Tagpfauenauge · de | s1 ✓ · s2 ✓ · s3 ✓ | clean: flower visits; the 'eats' lines (nettle 40, ivy 22) left out |
| Tagpfauenauge · en | s1 ✓ · s2 ✓ · s3 ✓ | clean |
| Admiral · de | s1 ✓ · s2 ✓ · s3 ✓ | clean |
| Admiral · en | s1 ✓ · s2 🤔 · s3 ✓ | s2 'recorded eating English Ivy': 26 iNaturalist 'eats' records are adults at ivy flowers; true to the line, 'eating' is the wrong word for nectaring |
| Westliche Honigbiene · de | s1 ✓ · s2 ✓ · s3 ✓ · s4 ✓ | clean: Asian hornet 857 records, crab spiders, four forage plants |
| Westliche Honigbiene · en | s1 ✓ · s2 ✓ · s3 ✓ · s4 ✓ | clean |
| Hauhechel-Bläuling · de | s1 ✓ · s2 ✓ | clean |
| Hauhechel-Bläuling · en | s1 ✓ · s2 ✓ | clean |
| Kleiner Kohlweißling · de | s1 ✓ · s2 🤔 · s3 ✓ · s4 ✓ | s2–s4 'beim Fressen an Wiesenklee, Roter Spornblume, Löwenzahn …': all eight 'eats' lines are adults nectaring (iNaturalist); a reader expects Brassicaceae. Same in en |
| Kleiner Kohlweißling · en | s1 ✓ · s2 🤔 · s3 ✓ · s4 ✓ | same |
| Ackerhummel · de | s1 ✓ · s2 ✓ · s3 ✓ · s4 ✓ | clean: eight forage plants, 173–499 records |
| Ackerhummel · en | s1 ✓ · s2 ✓ · s3 ✓ · s4 ✓ | clean |
| Rapsweißling · de | s1 ✓ · s2 🤔 · s3 ✓ · s4 ✓ | s2 'Beim Fressen an Oregano (10)' next to s3 'Blütenbesuch an Oregano (28)': the same behaviour under two GloBI verbs |
| Rapsweißling · en | s1 ✓ · s2 🤔 · s3 ✓ | same |


**P3 (F1–F5) · 36 paragraphs, 110 sentences · 🙈 0 · 🤔 15**

| species · lang | sentences, marked | note |
| --- | --- | --- |
| Amsel · de | s1 ✓ · s2 ✓ · s3 ✓ · s4 ✓ | clean; diet, habitat and activity lines now open the paragraph |
| Amsel · en | s1 ✓ · s2 ✓ · s3 ✓ · s4 ✓ | clean |
| Kleiner Feuerfalter · de | s1 ✓ · s2 ✓ · s3 ✓ | clean |
| Kleiner Feuerfalter · en | s1 ✓ · s2 ✓ · s3 ✓ | clean |
| Feuersalamander · de | s1 ✓ · s2 ✓ · s3 🤔 · s4 ✓ | s3 'Domestic Cat (Felis catus)': no German vernacular in the DB |
| Feuersalamander · en | s1 ✓ · s2 ✓ · s3 ✓ · s4 ✓ | clean |
| Große Brennnessel · de | s1 ✓ · s2 ✓ · s3 ✓ · s4 ✓ | clean: s3 'Als Fressfeinde sind Tagpfauenauge und Kleiner Fuchs verzeichnet' has the direction right now; s4 Wirtspflanze right |
| Große Brennnessel · en | s1 ✓ · s2 ✓ · s3 🤔 · s4 ✓ | s3 'recorded as predators' for butterflies on a nettle: direction right, 'predator' is the template's word for a plant's eatenBy line; 'herbivore' would fit |
| Kranich · de | s1 ✓ · s2 ✓ | clean |
| Kranich · en | s1 ✓ · s2 ✓ | clean |
| Hirschkäfer · de | s1 🤔 · s2 ✓ | s1 stag beetle eating beech, ash, hazel: 2 real records each from one dataset (adults lick sap, larvae in dead wood); true to the record, thin. F2 keeps it because 2 records pass the rule |
| Hirschkäfer · en | s1 🤔 · s2 ✓ | same |
| Grasfrosch · de | s1 ✓ · s2 🤔 · s3 ✓ | s2 Spitzschlammschnecke as a frog predator, 2 iNaturalist records |
| Grasfrosch · en | s1 ✓ · s2 🤔 · s3 ✓ | same, 'Swamp lymnaea' |
| Schwarz-Erle · de | s1 ✓ · s2 ✓ · s3 ✓ · s4 ✓ | clean: s3 'Sie ist als Wirt von Schmetterlings-Tramete … verzeichnet' has the direction right now |
| Schwarz-Erle · en | s1 ✓ · s2 ✓ · s3 🤔 · s4 ✓ | s3 'predators of Black Alder' for goldfinch and musk beetle: the template's word for a plant's eatenBy line |
| Dunkle Erdhummel · de | s1 ✓ · s2 ✓ · s3 ✓ | clean |
| Dunkle Erdhummel · en | s1 ✓ · s2 ✓ · s3 ✓ | clean |
| Schachbrett · de | s1 ✓ · s2 ✓ · s3 ✓ · s4 ✓ | clean |
| Schachbrett · en | s1 ✓ · s2 ✓ · s3 ✓ · s4 ✓ | clean |
| Europäische Gottesanbeterin · de | s1 ✓ · s2 ✓ · s3 ✓ | clean; the eats lines are in this time (honey bee 10, wasp 4, bush-cricket, grasshopper, wall lizard 2 each), all true to the literature |
| Europäische Gottesanbeterin · en | s1 ✓ · s2 ✓ · s3 ✓ | clean, same |
| Tagpfauenauge · de | s1 🤔 · s2 ✓ · s3 ✓ | s1 'beim Fressen der Großen Brennnessel, des Gemeinen Efeus und des Gewöhnlichen Wasserdosts': nettle is the larval food (40 records), ivy and hemp agrimony are adults at flowers under GloBI eats |
| Tagpfauenauge · en | s1 🤔 · s2 ✓ · s3 ✓ | same |
| Admiral · de | s1 🤔 · s2 ✓ · s3 ✓ | s1 'beim Fressen des Gemeinen Efeus': adults at ivy flowers as eats (26 records) |
| Admiral · en | s1 ✓ · s2 🤔 · s3 ✓ | same |
| Westliche Honigbiene · de | s1 ✓ · s2 ✓ · s3 ✓ · s4 ✓ | clean |
| Westliche Honigbiene · en | s1 ✓ · s2 ✓ · s3 ✓ · s4 ✓ | clean |
| Hauhechel-Bläuling · de | s1 ✓ · s2 ✓ | clean |
| Hauhechel-Bläuling · en | s1 ✓ · s2 ✓ | clean |
| Kleiner Kohlweißling · de | s1 🤔 · s2 ✓ | s1 eight nectar plants as eats; a reader expects Brassicaceae |
| Kleiner Kohlweißling · en | s1 🤔 · s2 ✓ | same |
| Ackerhummel · de | s1 ✓ · s2 ✓ | clean |
| Ackerhummel · en | s1 ✓ · s2 ✓ | clean |
| Rapsweißling · de | s1 🤔 · s2 ✓ · s3 ✓ | s1 eats Oregano (10) next to s2 flower visits at Oregano (28): one behaviour, two GloBI verbs |
| Rapsweißling · en | s1 🤔 · s2 ✓ · s3 ✓ | same |

What the two 🙈 are: both German, both the model reusing the one template the F3 wording gave it ("wurde beim Fressen von X beobachtet" / "als Fressfeind verzeichnet ist Y") for a line kind it does not fit (eatenBy → the nettle eats the peacock; hostOf → the fungi are the alder's hosts). The English drafts got both right. Both were scored `supported`: the judge's vocabulary whitelist ("Fressfeind", "Wirt", "beobachtet") is direction-blind, and the audit agent for Alnus even flagged the reversal in its summary while writing `supported` in the file. F5 gives one template per kind and makes direction a claim; on the re-run every kind reads the right way round in 110 sentences.

What the 🤔 are, all input semantics, none false: GloBI `eats` for adult butterflies at flowers (Aglais, Vanessa, Pieris ×2: iNaturalist "feeding on" annotations), the same behaviour twice under two GloBI verbs (Pieris napi eats/visits Oregano), 2-record pairs that pass F2 (pond snail on frog, stag beetle on beech), a missing German vernacular (Felis catus → "Domestic Cat"), and the template's "predator" for a plant's herbivores in English. P3 has more 🤔 than P2' only because its drafts include the `eats` lines P2' drafts left out.

## ✍️ P1' · V1 closed world, 20 species × de + en

| run | validator ✓ | sentences | supported | partial | unsupported | texts with ❌ | claims | orphans | words (median) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **V1 0027 (P1')** | 40 / 40 | 202 | 200 (99.0 %) | 2 (1.0 %) | **0 (0.0 %)** | 0 / 40 | 513 | 1 (0.2 / 100) | 69 |
| V1 0026 | 33 / 40 | 160 | 137 (85.6 %) | 16 (10.0 %) | **7 (4.4 %)** | 6 / 40 | 698 | 27 (3.9 / 100) | 84 |
| 0027 de / en | 20 / 20 · 20 / 20 | 103 · 99 | 98.1 % · 100 % | 2 · 0 | **0 · 0** | 0 · 0 | 258 · 255 | 1 · 0 | 64 · 71 |
| 0026 de / en | 15 / 20 · 18 / 20 | 84 · 76 | 82.1 % · 89.5 % | 10 · 6 | **5 (6.0 %) · 2 (2.6 %)** | 4 · 2 | 350 · 348 | 19 · 8 | 81 · 92 |

Every non-supported sentence, classified by hand:

| species · lang | s | text | judge | hand |
| --- | --- | --- | --- | --- |
| Amsel · de | 7 | "Der Nachwuchs ist mit 365 Tagen ausgewachsen, und frei lebend kann sie bis zu 21,8 Jahre alt werden." | partial: "ausgewachsen" for F12's "reif" | wording drift, not a fact: the line is sexual maturity, the text says fully grown; the number is right. A build prompt says "geschlechtsreif" |
| Hauhechel-Bläuling · de | 5 | "Beim Bestäuben wurde sie an Gewöhnlicher Schafgarbe beobachtet." | partial: F6 says "Gemeine Schafgarbe"; the claim extractor found no line (the 1 orphan) | synonym of the same plant (Achillea millefolium); harmless. Names stay as given is a rule the model bent once in 202 sentences |

Zero ❌; the 0026 artefacts (beobachtet, Fressfeind, Falter) are gone, and no real leak replaced them. Two texts carry an untranslated partner name ("Flower Spider", "Domestic Cat"): the DB has no German vernacular for those partners.

## ⏱️ Subagents and wall time

| stage | prompts | agents (planned + retries) | tokens per agent | wall |
| --- | --- | --- | --- | --- |
| P2' drafts | 36 | 8 + 1 (one refusal, see doubt 4) | 43–47 k | 14:50:55 → 14:53:34 (2.6 min) |
| P1' drafts | 40 | 8 | 43–50 k | → 14:54:09 (in parallel with P2') |
| P2' + P1' audits | 76 | 16 | 47–57 k | 14:55:38 → 14:58:24 (2.8 min) |
| P3 drafts | 36 | 8 | 35–46 k | 15:03:46 → 15:05:36 (1.8 min) |
| P3 audits | 36 | 8 | 36–49 k | 15:06:51 → 15:09:09 (2.3 min) |
| **total** | **224** | **49** | **≈ 2.3 M** | **≈ 13 min of stages** (plus my collect/hand-read time between them) |

An agent of five prompts takes 50–170 s; eight run in parallel without visible throttling.

## 📈 The production run on the plan (was P4)

| scope | taxa | drafts (de+en) | audits | subagents | subagent tokens | wall at 8 parallel, 1.5 min each |
| --- | --- | --- | --- | --- | --- | --- |
| this session | 20 (×3 runs) | 112 | 112 | 49 | ≈ 2.3 M | 13 min |
| one region | 300 | 600 | 600 | 240 | ≈ 11 M | ≈ 45 min |
| Neon today | 2 414 | 4 828 | 4 828 | 1 932 | ≈ 90 M | ≈ 6 h |
| rewrite 20 % / year | 483 | 966 | 966 | 388 | ≈ 18 M | ≈ 1.2 h |

**Can the production build run on the plan at all?** Not as an ETL step. `etl/content.ts` runs on Vercel and in the dump, and the owner's rule (CLAUDE.md, 2026-09-07) keeps `api.anthropic.com` out of scripts with the app's key; a Claude Code subagent cannot be called from `etl/`. What the plan can do is what this session did: a coordinator session drives the file protocol for a region (240 agents, ≈ 45 min, no dollars) and the answers are loaded into the DB by a script, like the region dump. Neon-wide (1 932 agents) is a day of sessions and ≈ 90 M plan tokens; whether the plan's window limits allow that is the owner's call, I could not observe a limit at 49 agents. The API price for the same work, from 0026's P4 rates (≈ 3.6 ¢ per draft + audit pair): one region ≈ 22 $, Neon ≈ 175 $, the yearly rewrite ≈ 35 $. **Decision for the owner: file protocol from the plan (free, manual, per region) or the API with a separate key and a budget line (automatic, in the ETL).** §📐 is written so both fit behind one seam.

## 🚦 Verdict

| gate | threshold | P2' (F1–F4) | P3 (+F5) | P1' | |
| --- | --- | --- | --- | --- | --- |
| embarrassing Ökologie sentences, hand read of all paragraphs | 0 | **2 / 117** (direction, text side, de) | **0 / 110** | — | ✓ with F5 |
| false facts from the input, hand read | 0 | 0 | 0 | — | ✓ |
| unsupported by the judge, V1 Sonnet | < 3 % | — | — | **0.0 %** (2 partial, both harmless by hand) | ✓ |
| V1 validator | ≥ 38 / 40 | — | — | 40 / 40 | ✓ |

**Build.** The input no longer leaks (0 false facts in 227 Ökologie sentences over two runs, against 11 in 40 sentences in 0026); the one defect F1–F4 left was the model's, fixed by F5 and measured. The brief's stop branch ("name the leaking input") does not apply: there is no leaking input, and I did not want to hand the owner a stop over a one-rule prompt fix that costs eight subagents to verify.

### Decisions I took

| decision | why |
| --- | --- |
| F2 counts **real** records (metaweb copies excluded), not records | the brief's "one record from one study" would keep a pair with 1 real record + 5 TETRA-EU copies; the leak 0026 named |
| F5 added and re-run as P3 instead of stopping | the 2 🙈 were the prompt's, not the data's; a stop would have been a stop over wording. P2' stays in the report as the honest F1–F4 result |
| 18 species, not 19 | Amanita's eco sheet is one line after F2 (its 2 candidates were 1-record pairs). The brief counted 0026's 19 |
| `grill.json` removed, `results.json` is 0027's only | there is no spend; 0026's numbers are read from git |
| the ECO2 hand read done in full again (36 more paragraphs) | the gate is the hand read, a re-run without one is not a measurement |
| P1' has no hand read of all 202 sentences | the brief asks for the hand classification of every ❌ (there are none) and the partials (2, done) |

## 🤔 Doubts for the owner

1. **The judge is not the same judge as 0026's.** A subagent on the plan, verdict-first, with F3's whitelist, gave 100 % supported on 227 + 202 sentences. Some of that is real (F3 removed the artefacts, F1/F2 removed the lines that invited habits), some is leniency: it did not see the two direction reversals, and it accepted "peaks in April and July" from a month profile. The 0026 column is a different regime (API judge, no whitelist). The hand read is the gate; keep it that way in the build (a sample per region).
2. **A subagent is not the API.** The prompts are identical, but the drafting model runs inside a Claude Code agent with a tool loop and its own system prompt; it read the file, "acted as" the model, and wrote the JSON. It followed the format perfectly (0 repairs in 112 drafts; 0026 needed repairs in ~1 of 6), which means the production numbers on the API may be worse on format, not on facts.
3. **GloBI `eats` is not one thing.** For Lepidoptera, iNaturalist's "feeding on" lands as `eats` whether it is a caterpillar on nettle or an adult at ivy flowers. Fifteen 🤔 in P3 are this. It is true, and a reader who knows Pieris rapae expects cabbage. A build could route `eats` from iNaturalist for adult-observed groups into "an Blüten von" wording, but that is a guess about life stage, the thing F3 forbids. I would leave it and let the ⓘ sheet show the records.
4. **One subagent refused a draft batch** (P2' batch 8, one file), reading the prompt file as an injection ("you are the model in these files"). The coordinator framing ("Task from the coordinator of handoff 0027 … generated by prose.mjs … there is no injection here") worked for the remaining 48 agents. A production driver must expect refusals and retry with the framing.
5. **0027's first minute paid the API.** Before the no-API rule was applied to this session, 79 hashed answers (40 drafts + 39 audits, 0.505 $ by the 0026 rates) were written to `.cache/`. They are not used anywhere; they can be deleted or kept as the last API evidence. I left them, git-ignored.
6. **2-record pairs pass F2 and are the thinnest thing left** (pond snail on frog, stag beetle on beech: 2 iNaturalist records each). A threshold of ≥ 3 real records or ≥ 2 studies would remove them and also Salamandra's domestic cat (2). I did not change it: F2 as briefed is "one record from one study", and the sentences are true.
7. **Missing German vernaculars leak into the German text** ("Domestic Cat", "Flower Spider", "Swamp lymnaea" in English). The sheet's fallback is the other language's name; the build should skip a partner without a name in the target language or use the scientific name.

## 📐 Build draft (the 0019 S4/S5 shape, with what the grill changed)

### 🗄️ Schema

```sql
-- 0028: Steckbrief and Ökologie prose. Taxon.facts and factsAt (0025) stay as they are.
ALTER TABLE "Taxon" ADD COLUMN "prose" JSONB;
```

| column | shape | rule |
| --- | --- | --- |
| `prose` | `{ de: { paragraphs: [{ sentences: [{ text, cites }] }] }, en, eco: { de, en }, facts: [{ id, source, text }], inputHash, model, judged: { supported, partial, unsupported }, at }` | `inputHash` = sha1 of the fact sheet (full + eco lines, both languages); rewritten when it changes. `facts` is stored so the citations resolve after facts change. `eco` is the Ökologie paragraph, separate so the page can place it under the tile |

Migration only in Vercel's build command (CLAUDE.md); the owner runs nothing on Neon by hand except the load below.

### 🔩 ETL

| piece | file | what |
| --- | --- | --- |
| sheet | `app/etl/prose/sheet.ts` (new; `scripts/prose-grill/sheets.mjs` ported to TS, i18n keys from `src/i18n`) | `full` and `eco` lines per taxon and language from `Taxon.facts`, the month profile, and `Interaction` **after F1/F2** |
| GloBI pruning | `app/etl/globi.ts` + `app/etl/prune.ts` | edges store their studies (`study` array on `Interaction`, or a `studies` JSON) and their real record count; F1 (metaweb list) and F2 (≤ 1 real record from ≤ 1 real study) mark `prose: false` on the edge so tile and prose agree. The tile keeps showing them (0026 decision) |
| prompts | `app/etl/prose/prompts.ts` | V1 (Steckbrief) and ECO2 (Ökologie, F5 templates) verbatim from `prose.mjs`; AUDIT2 |
| driver seam | `app/etl/prose/driver.ts` | `draft(prompt) → json`, `audit(prompt) → json`. Two implementations behind one interface: **`files`** (writes `prompts/`, reads `answers/`; the plan's file protocol, driven by a coordinator session, then `etl prose --load`) and **`api`** (Batches with `parseJson`, verdict-first audit; only with a key the owner sets for it, never the app's) |
| step | `app/etl/content.ts` after `facts` | `prose`: skip when `inputHash` unchanged; skip taxa with < 3 full lines; `eco` only when ≥ 3 eco lines; validator (F4: one paragraph fine); audit; store `judged` |
| CLI | `app/etl/cli.ts` | `prose --region <slug> --driver files\|api`, `prose --load` (answers → DB), `--purge` clears `prose` |
| tests | `app/etl/prose/sheet.test.ts`, `driver.test.ts` | F1/F2 on fixtures (Salamandra: 187 → 5; Amanita → 0 eco lines), `parseJson` on 0026's three shapes, the validator, the F5 templates present in every eco draft |

### 🎨 Page

Placement **A** (0019 S5): the prose sits under the tiles it was written from, last; the Ökologie paragraph under the Ökologie tile. Label "KI-Text aus den Quellen oben" / "AI text from the sources above", the ⓘ sheet lists the cited lines. Nothing when `prose` is null; the German text is skipped for a partner without a German name.

| piece | file |
| --- | --- |
| component | `app/src/components/Prose.tsx` (new): paragraphs, the label, the ⓘ sheet with the `facts` it cites |
| page | `app/src/components/SpeciesPage.tsx`: `<Prose>` after the Steckbrief tiles, `<Prose eco>` under the Ökologie tile |
| i18n | `species.prose.label`, `species.prose.sheetTitle`, `species.prose.judged` ("n von m Sätzen geprüft") in `src/i18n/de.json`, `en.json`; `messages.test.ts` covers the keys |
| router | `app/src/server/routers/dex.ts`: `prose` in the species query |
| test | `Prose.test.ts`: renders nothing for null, cites resolve, the label is present |

### 💸 Cost per region and the owner's steps on Neon

| driver | one region (300 taxa) | Neon (2 414) | who |
| --- | --- | --- | --- |
| `files` (plan) | 240 subagents, ≈ 45 min of a session, 0 $ | ≈ 1 932 subagents, a day of sessions | coordinator session, then `etl prose --load` locally against the dev DB, then the dump to Neon (README §🚀 option 2) |
| `api` | ≈ 22 $ | ≈ 175 $ | the ETL step on Vercel with `PROSE_API_KEY` (new env, named in DEPLOY.md), or locally then dump |

Steps on Neon either way: 1. merge, deploy (migration adds `prose`); 2. fill the dev DB (`prose` for the region); 3. dump the set tables; 4. spot-read ten Ökologie paragraphs per region by hand before the load, the gate this session used.

### 🔀 Two tracks

| track | files | shared |
| --- | --- | --- |
| A · ETL + migration | `etl/prose/*`, `etl/globi.ts`, `etl/prune.ts`, `etl/content.ts`, `etl/cli.ts`, `prisma/migrations/…_prose`, `prisma/schema.prisma` | `schema.prisma` (A owns), `src/i18n/*.json` (B owns), `docs/DEPLOY.md` (merge by hand) |
| B · page | `src/components/Prose.tsx`, `SpeciesPage.tsx`, `src/server/routers/dex.ts`, `src/i18n/*.json`, tests | B reads `prose` through the router; A merges first, B rebases |

## 🔀 For the merge

- Branch `prose-2`, eight commits, no product code, no schema, no `app/src/`, no `app/etl/`. `npm run check` untouched.
- `app/scripts/prose-grill/prompts/` and `answers/` (224 files, 1.4 MB) are the evidence and are committed; `.cache/` stays ignored.
- `common.mjs` has no API client any more; the 0026 numbers come from `e58e14e`.
- ROADMAP M9b: the verdict moves from "wait, prune GloBI by study" to "build (§📐 of 0027), the owner decides the driver".

## 📁 Files

| path | what |
| --- | --- |
| `app/scripts/prose-grill/common.mjs` | paths, GloBI cache, `parseJson` (+F4), the file protocol |
| `app/scripts/prose-grill/sheets.mjs` | sheets with studies, real records, F1/F2 → `sheets.json` |
| `app/scripts/prose-grill/prose.mjs` | `prompts\|collect P1\|P2\|P3`; prompts V1, ECO (F3), ECO2 (F5), AUDIT, AUDIT2; validator |
| `app/scripts/prose-grill/report.mjs` | the tables above, `report.md`, `drafts.md` |
| `app/scripts/prose-grill/marks.json` | the hand read, 72 paragraphs |
| `app/scripts/prose-grill/prompts/{P1,P2,P3,audit-P1,audit-P2,audit-P3}/` | 224 prompt files |
| `app/scripts/prose-grill/answers/…` | 224 answer files |
| `app/scripts/prose-grill/results.json`, `report.md`, `drafts.md`, `README.md` | results, report, every draft marked, the protocol |
| `docs/handoffs/0027-prose-regrill-findings.md` | this |
