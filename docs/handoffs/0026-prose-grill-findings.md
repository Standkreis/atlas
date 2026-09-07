# 🔥 0026 · Prose grill · findings

Measurement only, no product code. Everything lives in `app/scripts/prose-grill/`; raw answers in `.cache/` (git-ignored, 254 MB). Spend **4.730 $** of the 8 $ cap, 476 paid calls.

**Verdict P5: wait.** V1 on Sonnet 5 lands at 4.4 % unsupported (threshold 3 %), and the Ökologie paragraph carries 11 embarrassing sentences in the ten hand-read paragraphs. The leak is one input, not the model: GloBI `eats`/`eatenBy` rows from two European *metaweb* datasets (potential links, not observations) plus 1-record in-set pairs. No §📐 in this doc.

## 🧪 Setup

| what | value |
| --- | --- |
| species | the 0019 ten + 10 insects (Bombus terrestris, Melanargia galathea, Mantis religiosa, Aglais io, Vanessa atalanta, Apis mellifera, Polyommatus icarus, Pieris rapae, Bombus pascuorum, Pieris napi), most GBIF observations in Mainz-Bingen with a German name |
| sheets | `sheets.mjs` from the dev DB, read only; `full` = 0019 sheet + GloBI per kind + month profile; `eco` = diet/habitat/activity/pollination lines + month line + **one line per GloBI edge** with its record count |
| eco filter | target has a de or en name, `inSet \|\| records ≥ 2`, sorted in-set then records desc, cap 8 (`sheets.mjs:105-107`) |
| GloBI records | `/interaction?…&includeObservations=true` (without it GloBI dedupes pairs, every count is 1) |
| models | `claude-sonnet-5` 2/10, `claude-opus-5` 5/25, `claude-haiku-4-5-20251001` 1/5 $/MTok; thinking disabled; max_tokens 1 200 |
| audit | one Sonnet 5 call per draft (`prose.mjs:77`): 0019 verdicts per sentence + atomic claims with fact id or `null` (orphan) |
| prompts | V0 = 0019 verbatim (`prose.mjs:25`), V1 closed world (`prose.mjs:38`), V2 extractive (`prose.mjs:53`), ECO (`prose.mjs:65`) |

## 📊 P1 · three variants on Sonnet 5, 20 species × de + en

| variant | validator ✓ | sentences | supported | partial | **unsupported** | texts with ❌ | orphans / 100 claims | words (median) | ¢ / species (de+en+audit) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| V0 0019 prompt | 38 / 40 | 237 | 44.7 % | 37.6 % | **17.7 %** (42) | 28 / 40 | 19.2 | 115 | 4.6 |
| V1 closed world | 33 / 40 | 160 | 85.6 % | 10.0 % | **4.4 %** (7) | 6 / 40 | 3.9 | 84 | 3.6 |
| V2 extractive | 38 / 40 | 302 | 89.4 % | 6.0 % | **4.6 %** (14) | 13 / 40 | 1.2 | 108 | 4.3 |

| split | V0 | V1 | V2 |
| --- | --- | --- | --- |
| de | 15.0 % | 6.0 % | 2.0 % |
| en | 20.5 % | 2.6 % | 7.4 % |
| 0019 ten | 15.2 % | 4.8 % | 3.2 % |
| insects | 20.5 % | 3.9 % | 6.1 % |

- V0 is worse than 0019 measured (12 %) because the judge now sees the claim extractor's output and marks appearance words ("Singvogel", "orange-schwarz") consistently.
- V1's validator failures (7 of 40) are all on thin sheets: 6 × "3 paragraphs", 7 × "paragraph 2 has no sentences" — the model obeys "thin sheet → short" and drops the second paragraph. That is a validator rule to relax, not a text defect.
- V1 and V2 are one sentence apart. V2 orphans are near zero but its en side drifts (7.4 %): it invents connective claims ("this makes it…") when the sheet is short.
- **Hand classification of the seven V1 ❌:** real leaks 3 (Eichhörnchen for *Sciurus* without a de name; "Lausfliegen" plus the wrong direction; "Raupen" as the life stage that feeds), prompt/judge artefacts 2 ("beobachtet" for a GloBI row, see P2), judge self-reversals 2 (the judge writes "eigentlich supported" in its own reason).

## 🌿 P2 · Ökologie paragraph, Sonnet 5, 19 species × de + en

Zoropsis spinimana has one eco line and is skipped by the ≥ 3-lines rule. With lines grouped by kind only 13/20 would pass; one line per edge gives 19/20.

| run | validator ✓ | sentences | supported | partial | **unsupported** | orphans / 100 | words | ¢ / species |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ECO | 38 / 38 | 141 | 83.7 % | 10.6 % | **5.7 %** (8) | 4.1 | 57 | 2.4 |
| de | 19 / 19 | 74 | 83.8 % | 6.8 % | 9.5 % | 3.0 | 56 | 1.3 |
| en | 19 / 19 | 67 | 83.6 % | 14.9 % | 1.5 % | 5.2 | 62 | 1.1 |

All 8 judge ❌ are one artefact: the prompt says "write GloBI lines as observations (*wurde beim Fressen von X beobachtet*)", the judge says "beobachtet ist nicht belegt". Same for "Fressfeinde", "predator", "Falter". Fix the prompt or the judge, and the judged rate is ≈ 0 %. **The judge is blind to the actual problem**, which the hand read finds:

| species · lang | 🙈 sentences | why it is embarrassing |
| --- | --- | --- |
| Feuersalamander · de | s4, s5 | Kranich, Tafelente, Stockente, Silbermöwe, Eichelhäher, Wildschwein as predators; ducks do not eat a toxic salamander |
| Feuersalamander · en | s4 | pochard, mallard, herring gull as predators |
| Kranich · de | s4 | Kranich frisst Feuersalamander — the mirror row |
| Kranich · en | s3 | same |
| Große Brennnessel · de | s3 | Siebenpunkt and Zweipunkt as *Fressfeinde* of the nettle; they eat its aphids; 1 record each, kept because in-set |
| Große Brennnessel · en | s3 | same |
| Hirschkäfer · de | s2, s3 | Hirschkäfer beim Fressen von Vogelkirsche, Schlehdorn, Kirschpflaume; 0019 doubt 2 verbatim, 1 record each, in-set |
| Hirschkäfer · en | s2, s3 | same |
| Rapsweißling · de | — | "frisst Oregano": nectar visit coded as `eats`; odd, not wrong |
| Kleiner Kohlweißling · de | — | "frisst Blutweiderich, Braunelle": same |

**11 embarrassing sentences of 40** in the ten hand-read paragraphs; the judge marked every one of them *supported* — they are faithful to the input.

### 🔍 Where the leak comes from

The record threshold is not the lever. The Feuersalamander's duck predators carry 5–11 records each, from two studies that cite each other:

| pair | records | studies |
| --- | --- | --- |
| Salamandra ← Anas platyrhynchos (eatenBy) | 5–11 | Reji Chacko et al. (European trophic metaweb) + Maiorano et al. (TETRA-EU) |
| Salamandra ← Aythya ferina, Larus argentatus, Grus grus | 5–11 | the same two |
| Lucanus → Prunus cerasifera / spinosa (eats) | 1 | Reji Chacko et al. |
| Urtica ← Coccinella / Adalia (eatenBy) | 1 | Plantentuin Meise "ash forest interactions" (co-occurrence) |
| Urtica ← Aglais io | 2 | Saito 2016 larval host list + Kitching HOSTS: **real** |

Both metawebs list *potential* trophic links by body size and guild; that is what "a mallard eats a fire salamander" is. `≥ 2 records` keeps them, `≥ 2 studies` keeps them, `≥ 5 records` removes Urtica's and Lucanus's real rows first (Urtica 0, Lucanus 0, Apis 1 edge left). The filter that works is on **source**: drop `eats`/`eatenBy` rows whose only studies are metawebs (GloBI's `study_title` / `source_doi`, Reji Chacko 2023, Maiorano 2020 in this sample), and drop in-set pairs with 1 record and no second study. `visitsFlowersOf`, `pollinates`, `hostOf` did not produce a single embarrassing sentence.

## 🤖 P3 · V1 on three models, 20 species × de + en

Variant choice: V1 was picked at 3.3 % before the JSON repairs landed; after the repairs V1 4.4 % vs V2 4.6 %, one sentence apart, kept V1 (`--variant V1`).

| model | validator ✓ | sentences | supported | partial | **unsupported** | orphans / 100 | words | ¢ / species | ¢ / draft (median) | ms / draft |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude-sonnet-5 | 33 / 40 | 160 | 85.6 % | 10.0 % | **4.4 %** (7) | 3.9 | 84 | 3.6 | 0.74 | 5 485 |
| claude-opus-5 | 40 / 40 | 241 | 83.4 % | 10.8 % | **5.8 %** (14) | 3.2 | 102 | 5.9 | 1.76 | 6 538 |
| claude-haiku-4-5-20251001 | 40 / 40 | 170 | 67.1 % | 20.0 % | **12.9 %** (22) | 9.0 | 77 | 3.0 | 0.32 | 3 613 |

Hand classification of the ❌: Sonnet 3 real (above); Opus 4–5 real ("moths and butterflies" from *Lepidoptera*, "belongs to insects and spiders" from the tile label, "on these visits", "Walkers have recorded"); Haiku ≈ 14 real (life stages, `eats`/`eatenBy` inverted for Gottesanbeterin and Fliegenpilz, "Samen und Blätter", a parasite line read as food, wrong months). Opus writes longer and fuller, never fails the validator, and adds world knowledge at the edges; it does not beat Sonnet on faithfulness.

JSON quirks per model: Sonnet 12/158 drafts needed repair (4 stray `{"paragraphs":[]}[0],` tokens, 8 "Wait, ich korrigiere das Format" with a second JSON), 5/238 audits answered in prose first; Opus 3/40 drafts missing the final `}`; Haiku 0 drafts, 1 audit. `common.mjs:61` `parseJson` handles all of them; a batch driver needs the same.

### 👓 Blind read · V1 de · three species × three models

Marks: `[Fn]` cites, ⚠️ partial, ❌ unsupported, 🟠n orphan claims, judge reason after the dash.

**Amsel (*Turdus merula*)**

Sonnet · 0.83 ¢
> Die Amsel ist ein Vogel aus der Ordnung der Passeriformes, mit einer Spannweite von 36 cm und einem Gewicht um 103 g, und gilt als nicht gefährdet. [F1,F2,F10,F6,F4]
> In Mainz-Bingen liegen 6009 Meldungen aus zehn Jahren vor, ganzjährig, mit den meisten Beobachtungen im Januar und Dezember und weniger im Sommer, etwa im August. [F14] ⚠️ 🟠1 — 'weniger im Sommer' und Hervorhebung August ist Interpretation
> Als Standvogel bleibt sie das ganze Jahr über in der Region und ist tagsüber aktiv, meist in Wald und am Boden. [F11,F8,F7] ⚠️ 🟠1 — 'meist' ist eine unbelegte Häufigkeitsangabe
> Als Allesfresser wurde sie unter anderem beim Fressen von Rotbuche, Klatschmohn, Echtem Beinwell und Echter Nelkenwurz beobachtet. [F5,F13]
> Der Nachwuchs ist mit 365 Tagen ausgewachsen, und Amseln können in freier Wildbahn bis zu 21,8 Jahre alt werden. [F12,F9] ⚠️ — 'ausgewachsen' interpretiert 'reif' anders

Opus · 2.24 ¢
> Die Amsel ist ein Singvogel aus der Ordnung der Sperlingsvögel und gilt als nicht gefährdet. [F1,F2,F4] ⚠️ 🟠1 — Singvogel ist nicht belegt
> Sie wiegt etwa 103 g und erreicht eine Spannweite von 36 cm. [F6,F10]
> Im Landkreis Mainz-Bingen liegen 6009 Meldungen aus zehn Jahren vor, verteilt über das ganze Jahr, mit den meisten Meldungen im Januar, November und Dezember und den wenigsten im August. [F14]
> Als Standvogel bleibt sie in der Region. [F11] ⚠️ 🟠1
> Sie lebt im Wald und am Boden, ist tagsüber aktiv und ernährt sich als Allesfresser. [F7,F8,F5]
> Beobachtet wurde sie unter anderem beim Fressen von Rotbuche, Vogelknöterich, Klatschmohn und Echtem Beinwell. [F13]
> Nachwuchs wird mit 365 Tagen reif, und frei lebende Tiere können bis zu 21,8 Jahre alt werden. [F12,F9]

Haiku · 0.34 ¢
> Die Amsel ist ein Vogel aus der Ordnung Passeriformes und wiegt etwa 103 g bei einer Spannweite von 36 cm. [F1,F6,F10]
> In Mainz-Bingen ist sie das ganze Jahr über zu beobachten, mit den meisten Meldungen von Januar bis Februar und wieder ab November. [F14] ⚠️ 🟠2 — übergeht höhere Werte im Dezember
> Der Status ist nicht gefährdet. [F4]
> Sie lebt in Wald und auf dem Boden, ist tagsüber aktiv und Standvogel. [F7,F8,F11]
> Als Allesfresser wurde sie beim Fressen von Rotbuche, Vogelknöterich, Ranunculus ficaria, Klatschmohn und Gemeinem Flieder beobachtet. [F5,F13]
> Sie wird mit etwa einem Jahr geschlechtsreif und kann frei lebend bis zu 21,8 Jahre alt werden. [F12,F9]

**Feuersalamander (*Salamandra salamandra*)**

Sonnet · 0.78 ¢
> Der Feuersalamander ist eine Amphibie, die als gefährdet eingestuft ist und in Mainz-Bingen vor allem von März bis Mai sowie von August bis Dezember gemeldet wird, mit den meisten Meldungen im Oktober. [F1,F2,F4,F12]
> Er wird etwa 28 cm lang und rund 36 g schwer und ist an Land, im Wasser und im Boden anzutreffen, tagsüber, in der Dämmerung und nachts. [F6,F7,F8,F9]
> Er ernährt sich von Gliederfüßern und wurde beim Fressen von Tigerschnegel, Kleinem Frostspanner, Gemeinem Rückenschwimmer und Mistbiene beobachtet. [F5,F10]
> Er wurde selbst als Beute von Stockente, Eichelhäher, Wildschwein und Barrenringelnatter registriert. [F11] 🙈 metaweb row

Opus · 1.89 ¢
> Der Feuersalamander ist eine Amphibie aus der Ordnung der Schwanzlurche (Caudata) und erreicht eine Länge von 28 cm bei einem Gewicht von etwa 36 g. [F1,F2,F6,F7]
> Die Art gilt als gefährdet (VU). [F4]
> In Mainz-Bingen liegen 48 Meldungen aus zehn Jahren vor, mit den meisten Nachweisen im Oktober und weiteren Schwerpunkten von März bis Mai sowie von August bis Dezember. [F12] ⚠️
> Angetroffen wird er an Land, im Wasser und im Boden, und zwar tagsüber, in der Dämmerung wie auch nachts. [F8,F9]
> Zur Nahrung zählen Gliederfüßer; beobachtet wurde außerdem, wie Tiere Tigerschnegel, Schwarzen Schnegel, Mistbiene und Kleinen Frostspanner fraßen. [F5,F10]
> Als Fresser des Feuersalamanders wurden unter anderem Eichelhäher, Wildschwein, Barrenringelnatter und Hauskatze registriert. [F11]

Haiku · 0.34 ¢
> Der Feuersalamander ist eine Amphibie, die in Mainz-Bingen vor allem von März bis Mai und von August bis Dezember anzutreffen ist. [F1,F2,F12]
> Er wird etwa 28 cm lang und wiegt durchschnittlich 36 g. [F7,F6]
> Die Art ist gefährdet und lebt an Land, im Wasser und im Boden. [F4,F8]
> Der Feuersalamander ist tag- und nachtaktiv und wurde beim Fressen von Schwarzem Schnegel, Italienischer Schönschrecke, Mistbiene und Tigerschnegel beobachtet; er frisst Gliederfüßer. [F9,F10,F5] ❌ — 'beobachtet' artefact
> Er wird von Kranich, Kleinem Wasserfrosch, Hauskatze, Wildschwein, Eichelhäher, Stockente und Barrenringelnatter erbeutet. [F11] 🙈 metaweb row

**Admiral (*Vanessa atalanta*)**

Sonnet · 0.96 ¢
> Der Admiral ist ein Schmetterling aus der Ordnung der Lepidoptera und gilt nach der Roten Liste der IUCN als nicht gefährdet. [F1,F2,F4]
> In Mainz-Bingen liegen die meisten Meldungen zwischen Februar und April sowie zwischen Juni und Oktober, mit den stärksten Werten im Juli und August. [F9] ❌ — judge self-reversal: "… ist dies eigentlich supported"
> Die Raupen wurden unter anderem an Gewöhnlicher Kratzdistel, Gemeinem Flieder, Kulturapfel und Gemeinem Efeu beim Fressen beobachtet. [F5] ❌ 🟠1 — real: "Raupen" is invented, and the adult drinks at Flieder and Efeu
> Als Blütenbesucher wurde der Admiral an Gewöhnlicher Kratzdistel, Kulturapfel, Gänseblümchen und Oregano registriert und bestäubt dabei unter anderem Kulturapfel, Vogelkirsche und Gänseblümchen. [F8,F7]
> Er wurde seinerseits von Tieren wie Rauchschwalbe, Star, Mönchsgrasmücke und Gartenkreuzspinne gefressen. [F6]

Opus · 2.36 ¢
> Der Admiral, englisch Red Admiral, ist ein Insekt aus der Ordnung der Schmetterlinge (Lepidoptera). [F1,F2,F3]
> Die Rote Liste führt ihn als nicht gefährdet. [F4]
> Im Landkreis Mainz-Bingen liegen aus zehn Jahren 594 Meldungen vor, mit einer Hauptzeit von Februar bis April und von Juni bis Oktober. [F9]
> Die meisten Meldungen stammen aus Juli und August, deutlich weniger aus Dezember und Januar. [F9] ❌ 🟠1 — judge over-strict, the profile holds Jul 100 / Aug 98
> Beobachtet wurde er beim Fressen an Gewöhnlicher Kratzdistel, Gemeinem Flieder, Kulturapfel und Gemeinem Efeu. [F5] ❌ 🟠1 — 'beobachtet' artefact
> Als Blütenbesucher wurde er unter anderem an Vogel-Wicke, Scharbockskraut, Kornelkirsche und Oregano notiert. [F8]
> Dabei wurden auch Bestäubungen festgehalten, etwa an Vogelkirsche, Magerwiesen-Margerite, Gänseblümchen und Kulturapfel. [F7]
> Umgekehrt gibt es Nachweise, dass er von Rauchschwalbe, Kleiber, Star und Gartenkreuzspinne gefressen wurde. [F6]

Haiku · 0.34 ¢
> Der Admiral ist ein Schmetterling und in Mainz-Bingen von Februar bis Oktober anzutreffen, mit Schwerpunkt in den Monaten Juni bis Oktober. [F1,F2,F9] ⚠️ 🟠1 — drops Feb–Apr
> Die Art ist nicht gefährdet. [F4]
> Er wurde beim Fressen von Kratzdistel, Distel, Flieder, Apfel und Efeu beobachtet und bestäubt dabei Apfel, Margerite, Gänseblümchen und viele weitere Blütenpflanzen. [F5,F7] ❌ — "Distel" doubled, "viele weitere" invented
> Rauchschwalbe, Saatkrähe, Kernbeißer, Mauersegler und Gartenkreuzspinne sind unter seinen Fressfeinden verzeichnet. [F6]

Reading them blind: Sonnet and Opus are the same register; Opus is longer and adds a taxon word ("Singvogel", "Sperlingsvögel", "Schwanzlurche") the sheet does not carry. Haiku is the one you would notice — flatter and it slips on months and life stages.

## 💸 P4 · cost at scale

Batches −50 % on draft and audit. 2 414 taxa in Neon; one region ≈ 300; rewrite 20 %/yr.

| variant · model | ¢ / species API | ¢ / species Batches | 2 414 taxa | one region | 20 %/yr rewrite |
| --- | --- | --- | --- | --- | --- |
| V1 · Sonnet 5 | 3.6 | 1.8 | **43.58 $** | 5.42 $ | 8.72 $ |
| ECO · Sonnet 5 | 2.4 | 1.2 | 29.48 $ | 3.66 $ | 5.90 $ |
| V0 · Sonnet 5 | 4.6 | 2.3 | 55.32 $ | 6.87 $ | 11.06 $ |
| V2 · Sonnet 5 | 4.3 | 2.1 | 51.77 $ | 6.43 $ | 10.35 $ |
| V1 · Opus 5 | 5.9 | 2.9 | 70.80 $ | 8.80 $ | 14.16 $ |
| V1 · Haiku 4.5 | 3.0 | 1.5 | 35.97 $ | 4.47 $ | 7.19 $ |

The **audit is two thirds of every number**: Sonnet draft 0.73 ¢ avg, Sonnet audit 1.16 ¢ avg. Without the audit V1 on Sonnet is ≈ 1.5 ¢/species API, 0.7 ¢ Batches, 18 $ for all of Neon. Owner's assumption "0019 said 2–3 ¢ per species" holds for the draft alone; the audit doubles it.

| spend this grill | calls | input tok | output tok | $ |
| --- | --- | --- | --- | --- |
| Sonnet 5 draft | 158 | 259 641 | 62 902 | 1.148 |
| Sonnet 5 audit | 238 | 423 357 | 191 980 | 2.767 |
| Opus 5 draft | 40 | 78 133 | 16 773 | 0.690 |
| Haiku 4.5 draft | 40 | 59 104 | 13 139 | 0.125 |
| **total** | 476 | | | **4.730** |

## 🚦 P5 · verdict

| gate | threshold | measured | |
| --- | --- | --- | --- |
| unsupported, best variant, Sonnet | < 3 % | 4.4 % (V1), 4.6 % (V2) | ✗ |
| … real leaks after removing artefacts and judge reversals | | ≈ 1.9 % (3/160) | ✓ by hand, not by the judge |
| embarrassing Ökologie sentences, hand read | 0 | 11 / 40 | ✗ |

**Wait.** Not for a better model or prompt — the text side is close and the artefacts are fixable in an afternoon — but because the Ökologie input leaks metaweb rows and 1-record in-set pairs, and the judge cannot see it. Ship nothing until:

1. `eats`/`eatenBy` edges carry their GloBI studies and metaweb-only pairs are dropped (or shown with a "potential" label, never in prose).
2. In-set pairs with 1 record and one study are dropped for prose (keep them in the Ökologie tile, they are true rows).
3. The prompt stops asking for "beobachtet" or the judge learns that a GloBI row *is* an observation; pick one.
4. The validator accepts one paragraph on thin sheets.

Then re-run P2 on the same 19 × 2 (≈ 0.9 $) and P1-V1 on Sonnet (≈ 1.4 $). If both gates pass, the build §📐 is the 0019 S4/S5 shape (`Taxon.prose JSONB` with `inputHash`, placement A, ETL step after `facts`, Batches driver with `parseJson`), unchanged.

### Decisions

| option | verdict |
| --- | --- |
| ship Steckbrief + Ökologie | no |
| ship Ökologie only | no — that is the part that leaks |
| ship Steckbrief without GloBI lines | possible now at ≈ 2 % real leaks, but the Steckbrief without the food sentences is the fact tile in prose; ask whether anyone wants it |
| wait, fix the four points, re-grill for ≈ 2.5 $ | **yes** |

## 🤔 Doubts for the owner

1. **The brief's gates measure the wrong thing.** "< 3 % unsupported" by an LLM judge caught zero of the 11 embarrassing sentences; "0 embarrassing" by hand caught all of them. The judge measures faithfulness to the sheet, the hand read measures whether the sheet is true. Keep both, but the hand read is the gate.
2. **`≥ 2 GloBI records` is not a quality signal.** Metaweb datasets replicate one potential link into 5–11 records; real single observations (Aglais io on Urtica) have 1–2. Source is the signal.
3. **The "≥ 3 lines" rule** hides how thin most eco sheets are: 13/20 species have < 3 kinds; the rule passes because one edge = one line. The paragraph for a species with 3 edges is three sentences of GloBI and nothing else.
4. **Opus is not the answer** to faithfulness (5.8 % vs 4.4 %); it is the answer to length and validator compliance. Not worth 1.6× the money.
5. **0025 Track C i18n keys** (`ground`, `forest` as `habitat` values) are not in this worktree; `sheets.mjs` falls back to hard-coded German words. After the merge the fallback should go.
6. **Cached answers were paid twice** in a few cases: no-JSON hits were refetched before the repair existed (< 0.1 $).
7. **The judge changes its mind mid-sentence** in 2 of 7 V1 ❌ ("technisch stimmt es überein … ist dies eigentlich supported"). A second pass or a stricter verdict-first output format would fix it; Sonnet at max_tokens 2 000 is enough.

## 🔀 For the merge

- Branch `prose-grill`, three commits, no product code, no schema, no `app/src/`, no `app/etl/`. Safe to merge into `main` at any time; `npm run check` untouched.
- `.gitignore` gains `app/scripts/prose-grill/.cache/`.
- `sheets.mjs` reads the dev DB and GloBI; it is not imported anywhere. After 0025 C is merged, drop the stratum fallback in `sheets.mjs`.
- Re-grill after the four fixes: `node scripts/prose-grill/sheets.mjs && node scripts/prose-grill/prose.mjs P2 && node scripts/prose-grill/prose.mjs P1 --variants V1 && node scripts/prose-grill/report.mjs` from `app/`; the cache makes unchanged calls free.

## 📁 Files

| path | what |
| --- | --- |
| `app/scripts/prose-grill/common.mjs` | API client, cache, spend log, `parseJson` repair |
| `app/scripts/prose-grill/sheets.mjs` | fact sheets `full`/`eco` per species and language → `sheets.json` |
| `app/scripts/prose-grill/prose.mjs` | prompts V0/V1/V2/ECO/AUDIT, runs P1–P3 → `results.json` |
| `app/scripts/prose-grill/report.mjs` | tables → `report.md`, marked drafts → `drafts.md` |
| `app/scripts/prose-grill/marks.json` | the hand read of ten Ökologie paragraphs |
| `app/scripts/prose-grill/grill.json` | 476 calls with tokens and cents |
| `app/scripts/prose-grill/README.md` | how to run, key handling |
