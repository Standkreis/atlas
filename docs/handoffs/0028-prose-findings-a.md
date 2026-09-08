# ✍️ [0028] Findings A — ETL, migration, the `files` driver

> Branch `prose-a`, 7 commits on `main`. `npm run check` green: 17 files, **103 tests** (main had 99 on this DB state before the shape test; 32 of them under `etl/prose/`). Nothing calls `api.anthropic.com`; no SDK, no `PROSE_API_KEY` anywhere. Dev DB only.

| 🗓️ | 👤 | ⬆️ |
| --- | --- | --- |
| 2026-09-07 | Sven Reiser | [0028-prose.md](0028-prose.md) Track A |

## 📐 Decisions the handoff left open

| Question | Decision | Why |
| --- | --- | --- |
| Shape of `Taxon.prose` | **Track B's** `src/server/prose.ts`, exactly: `de`, `en`, `eco.{de,en}`, `facts: {de, en}`, `ecoFacts: {de, en} \| null`, `inputHash`, `model`, `judged \| null`, `at` | The handoff's flat `facts: Line[]` cannot serve two languages (the sheets differ in words), and the eco sheet numbers its own lines F1…, so a flat list would collide. The previous agent namespaced cites (`de:E5`); B resolves `eco` cites against `ecoFacts[lang]` instead, so the cites now stay **verbatim** as the model wrote them (`step.ts:assemble`) |
| `ecoFacts` null | When the taxon has no eco text (< 3 eco lines) | B's `parseProse` accepts null; nothing to resolve |
| `judged` | One total over the four audits, never null from the writer | B renders "{n} von {m} Sätzen geprüft"; a per-text split is a later wish |
| `runs/` in git | **Git-ignored** (`.gitignore`: `app/etl/prose/runs/`) | 2 982 prompt files, 14 MB per region, regenerable from the DB in 1.6 s. The answers are the model's output; the texts live in `Taxon.prose` (dumped to Neon), the ten hand-read paragraphs go in the coordinator's findings. The earlier smoke artefact `runs/mainz-bingen/run.json` was untracked and is deleted |
| The seeded row | Overwritten, then purged | Track B seeded `gbifKey` 2431776 with `inputHash: "seed"` for its shots. The hash rule rewrote it on `--load` (sha1 `f1a0675…` ≠ `seed`), `--purge --region mainz-bingen` then set it to null. Restored at the end with the real smoke answers (§✅ 7) so B's Simulator shots after the merge show the true shape |
| A failed taxon in a 3.5 h refetch | `content --force --keys k1,k2` | The refetch logs `✗ <name>` and continues; before, the only way back was the whole region. `selectTaxa` takes `keys` with `force` (`content.ts:57`), the CLI parses `--keys` |
| Region of 929 taxa in one Prisma query | `loadTaxa` in chunks of 40 | The first smoke on the refetched DB died with **P2029** (Postgres's 65 535 parameters: the nested `interactionsFrom → target → plausibility` select runs `IN (…)` over all 123 622 edges). The previous agent's smoke ran on the pre-refetch DB |
| `content --force` on a species cut at 50 pages | One `globiPair` call per **distinct target**, not per kept edge | The uncommitted change the previous agent left; kept, checked green. Daucus carota: 185 pairs instead of 200 calls |

## 🔁 The refetch (`content --region mainz-bingen --force`, 2026-09-07)

The run's stdout is gone with the previous session; the DB and the disk cache give the numbers.

| | value |
| --- | --- |
| Wall time | **3 h 34 min** (cache mtimes 16:51 → 20:37 local) |
| GloBI pages written to `etl/.cache/` | **6 037** files, 8.2 GB, mean 1.3 MB, 3 030 above 1 MB — `includeObservations=true` returns one row per record, a full page of 1 000 is 1–2 MB |
| GBIF match calls that day | 34 538 (target resolution; `hits` in the previous cache were few because 0026's grill cached json.v2 without observations) |
| What dominated | The observation pages by volume (8 GB at 300 ms gaps and single-stream downloads), then the GBIF matches; the 2-hour gap without a GloBI file (18:00–20:00) is the block of truncated plants each asking ≈ 240 pair queries and matching ≈ 200 targets. The README's "≈ 25 min" estimate was wrong by 8×; corrected |
| Taxa | 929 in the set, all `contentAt` set; **897** with at least one edge carrying studies; 17 with no edge at all (Amanita citrina, Carabus auratus, Chorthippus ×2, Grimmia pulvinata, Ophrys holosericea, Tulostoma brumale, … all with `contentAt` 2026-09-05 — GloBI has nothing for them) |
| **15 taxa failed** | Achillea millefolium, Artemisia campestris, A. vulgaris, Bellis perennis, Carduus acanthoides, C. crispus, Centaurea jacea, C. stoebe, Cirsium arvense, C. palustre, C. vulgare, Daucus carota, Erigeron annuus, Tanacetum corymbosum, T. vulgare: 2 623 edges kept `studies {}`, `prose true`. All composites/umbellifers with ≈ 200 edges, i.e. the species GloBI cuts at 50 pages. Cause not recoverable (the ✗ lines are gone); the `--keys` refetch below found no error on Centaurea stoebe (21 edges, 1 s) |
| `--force --keys` on the 15 | Centaurea stoebe: 21 edges, F1 0, F2 14, 7 prose (0.8 s, page from the cache). The other 14: §🔁 result below, 4 min, 0 failed |

F1/F2 recount from the DB (`pruneForProse` over every stored edge; `prose` matches the rule on all 121 000 fetched edges, 0 mismatches):

| kind | F1 | F2 | kept | unfetched |
| --- | ---: | ---: | ---: | ---: |
| eats | 34 066 | 3 009 | 2 379 | |
| eatenBy | 42 212 | 4 905 | 3 324 | |
| hostOf | – | 6 350 | 6 658 | |
| visitsFlowersOf | – | 6 058 | 3 137 | |
| pollinates | – | 6 960 | 1 694 | |
| parasiteOf | – | 190 | 57 | |
| **total** | **76 278** | **27 472** | **17 249** | **2 623** |

`prose = false` on 103 750 of 123 622 (84 %). Salamandra salamandra: 187 edges → **2** prose (Natrix helvetica 10 real records, Felis catus 2); the brief expected ≈ 5.

### 🔁 result of the `--keys` refetch of the other 14

`content --force --keys 3034742,…,3128547`: **14 filled, 0 failed · 4.0 min** · edges 2 538 (F1 1 642, F2 481; **3** species cut at 50 pages: Daucus carota 185 pairs, Tanacetum vulgare 190, Achillea millefolium 190) · 803 GloBI + 122 GBIF requests, 0 retries, 0 429s · new target rows 1 366. Eleven of the fourteen were not even truncated, so the original failure was transient, not the page size. Mainz-Bingen after it: **123 558 edges, 105 887 `prose = false` (86 %), 0 unfetched**; the 15 plants keep 12–57 prose edges each (Achillea 57, Cirsium arvense 49, Daucus 48, Carduus crispus 12).

## ✅ Checks

| # | Check | Evidence |
| --- | --- | --- |
| 1 | `npm run check` | typecheck, lint, **103 tests** in 17 files, export build (3 741 species paths): exit 0 |
| 2 | Smoke `prose --region mainz-bingen --run smoke` | `2982 prompts written · 923 taxa pending · 0 loaded · 0 skipped · 6 thin (< 3 lines) of 929 · 1.6 s`. 923 × de + 923 × en + **568 taxa with an eco prompt** (1 136 files). Warnings: `⚠ 2623 edges without studies entered the sheets`, `⚠ 18 eco prompts hold a line kind without an F5 template (parasiteOf)` (9 taxa: Auricularia auricula-judae, Cuculus canorus, Laetiporus sulphureus, Puccinia coronata, P. lagenophorae, P. malvacearum, Rhytisma acerinum, Senecio inaequidens, Viscum album). `drafts pending: 2982 prompts → 597 subagents of ≤ 5` |
| 2b | Smoke again after the `--keys` refetch, the Salamandra answers in place | `60 prompts written · 922 taxa pending · 1 loaded · 0 skipped · 6 thin of 929 · 1.4 s`; the `⚠ … without studies` warning is gone; `drafts pending: 2974 prompts → 595 subagents`. 60 = the 15 plants × (de, en, de-eco, en-eco); 2 974 = 922 × 2 + 565 × 2, so two taxa lost their eco prompt with the new edges (their old `-eco.md` files stay in `prompts/`; the printed batches are the truth, not the directory) |
| 3 | F5 templates in every eco prompt | `grep -L` for each of the five template strings over `*-eco.md`: **0 files missing** any |
| 4 | Hand-written answers, `prose --load --run smoke` | 8 files (`2431776-{de,en,de-eco,en-eco}.json` + `-audit.json`), every cite a real id of its prompt, one audit sentence `partial` on purpose. `prose: 0 prompts written · 0 taxa pending · 1 loaded · 0 skipped`. Second `--load`: `1 skipped (unchanged)` (hash rule) |
| 5 | Stored shape via SQL | keys `at, de, en, eco, facts, model, judged, ecoFacts, inputHash`; `inputHash f1a067539133675db2f8862ea19b6a1dcf27bcc8`; `model claude-sonnet-5`; `judged {"supported": 21, "partial": 1, "unsupported": 0}`; `facts.de` 12, `facts.en` 12, `ecoFacts.de` 6, `de.paragraphs` 2, `eco.de.paragraphs` 1. `eco.de` sentence 3: `{"text": "Als Fressfeind ist die Barrenringelnatter (Natrix helvetica) verzeichnet, mit 10 GloBI-Belegen.", "cites": ["F5"]}` → `ecoFacts.de[4]` = `{"id": "F5", "source": "GloBI", "text": "wird gefressen von: Barrenringelnatter (Natrix helvetica) — 10 GloBI-Belege."}` |
| 6 | `prose --purge --region mainz-bingen` | `purged 1 taxa`; `count(*) filter (where prose is not null)` = **0** of 31 636 Taxon rows |
| 7 | `assemble` test (`step.test.ts`, 4) | exact key list in B's order; text and cites verbatim; facts per language without the sheet `key`; `judged` summed; `ecoFacts` null without eco; an eco `F2` resolves to the eco line, not the full line |
| 8 | `content --force --keys 3127727` | Centaurea stoebe: `1 filled, 0 failed · edges 21 (F1 0, F2 14) · new target rows 20`, 1 GloBI request (the page was in the cache), 0.8 s |

### The Salamandra salamandra `de` prompt (user part, verbatim)

```
Sprache: Deutsch (kein Du; neutral oder ohne Anrede).
Art: Salamandra salamandra (Feuersalamander).
Region des Lesers: Mainz-Bingen.

FAKTEN:
F1 [GBIF] Wissenschaftlicher Name Salamandra salamandra; Rang Art; Klasse Amphibia, Ordnung Caudata; Gruppe: Amphibie.
F2 [Wikidata] Deutscher Name: Feuersalamander.
F3 [Wikidata] Englischer Name: Fire salamander.
F4 [IUCN Red List] Status: VU (gefährdet).
F5 [AmphiBIO] Nahrung: Gliederfüßer.
F6 [AmphiBIO] Gewicht: 36 g.
F7 [AmphiBIO] Länge: 28 cm.
F8 [AmphiBIO] Lebensraum: an Land, im Wasser, im Boden.
F9 [AmphiBIO] Aktiv: tagsüber, in der Dämmerung, nachts.
F10 [GloBI] wird gefressen von: Barrenringelnatter (Natrix helvetica), Domestic Cat (Felis catus).
F11 [GBIF occurrences] Region Mainz-Bingen: 48 Meldungen in zehn Jahren; Hauptzeit „Mär–Mai · Aug–Dez“; Monatsprofil in % des stärksten Monats: Jan 12, Feb 0, Mär 30, Apr 50, Mai 60, Jun 18, Jul 18, Aug 30, Sep 64, Okt 100, Nov 62, Dez 42.
F12 [GBIF occurrences] Region Südwestpfalz: 106 Meldungen in zehn Jahren; Hauptzeit „Feb–Mär · Sep–Dez“; …
```

The system part is V1 with `Mainz-Bingen` in rule 7; the file head names model, `max_tokens 1200` and the answer path `smoke/answers/2431776-de.json`.

### One eco prompt (Salamandra `de-eco`, the FAKTEN block)

```
F1 [AmphiBIO] Nahrung: Gliederfüßer.
F2 [AmphiBIO] Lebensraum: an Land, im Wasser, im Boden.
F3 [AmphiBIO] Aktiv: tagsüber, in der Dämmerung, nachts.
F4 [GBIF occurrences] Region Mainz-Bingen: 48 Meldungen in zehn Jahren; Hauptzeit „Mär–Mai · Aug–Dez“; Monatsprofil …
F5 [GloBI] wird gefressen von: Barrenringelnatter (Natrix helvetica) — 10 GloBI-Belege.
F6 [GloBI] wird gefressen von: Domestic Cat (Felis catus) — 2 GloBI-Belege.
```

Its system part is ECO2: rule 2 lists the five F5 templates (`"frisst: X" → "wurde beim Fressen von X beobachtet"`, `"wird gefressen von: Y" → "als Fressfeind ist Y verzeichnet"`, host, flower visit, pollinator) and the direction ban.

## 🤔 Doubts

| # | Doubt |
| --- | --- |
| 1 | **`Domestic Cat`** reaches the German sheet: the partner has no `de` name, the sheet falls back to `en`, and rule 8 forbids translating. Fine for the closed world, ugly on the page. A `names` pass for GloBI targets (Wikidata labels for out-of-set targets) is a separate milestone |
| 2 | **parasiteOf has no F5 template** (9 taxa, 18 prompts). The grill never saw the kind. Either add `"Parasit von: Z" → "ist als Parasit von Z verzeichnet" / "is recorded as a parasite of Z"` to `F5_TEMPLATES` before the real run (one line, and the prompts are then "verbatim from prose.mjs" no more), or accept that AUDIT2's direction rule still catches a reversal. I left the prompts verbatim as the handoff says; the CLI warns |
| 3 | **The 15 truncated plants**: the failure cause is lost. If the `--keys` refetch below succeeds, the cause was transient (budget, a 5xx after 5 attempts); if it fails again, look at `fetch.ts` retries on 1–2 MB pages |
| 4 | **2 623 edges are counted per `de` sheet only** (`r.unfetched += sheets.de.unfetched`), which is right (the same edges), but the warning text says "run `content --force` first" while the fix for a partial refetch is `--force --keys` |
| 5 | **`judged` is one total** across de, en and the two eco texts. B's label prints n of m per text; with one total the label under the German text counts English sentences too. B should either show `judged` once or A should store per text — say which before the real run |
| 6 | Salamandra keeps **2** prose edges, not the ≈ 5 the brief expected from the grill: `sheets.mjs` counted metaweb records into the eco threshold, F2 here counts `real` only. Correct by the 0027 rule, worth knowing when the page looks thin |
| 7 | **The dev DB now holds one real `Taxon.prose` row** (Salamandra, the hand-written smoke answers, `judged 21/1/0`) so B's Simulator shots after the merge show the true shape. The coordinator's `prose --region … --run r1` would skip it as unchanged: purge first (real run step 0) so the model writes it |
| 8 | Stale prompt files: the `files` driver never deletes a prompt whose taxon lost its eco sheet. A `--run` name is cheap; use a fresh one per real run |
| 9 | The smoke's `facts` for 6 thin taxa: `thin` means < 3 full lines; with GBIF row + region months every filled taxon has ≥ 2, so thin = no names, no facts, no edges. Expected |

## 🔀 For the merge

Files touched on `prose-a` (all under Track A's list plus the two shared ones):

| File | Change |
| --- | --- |
| `app/prisma/migrations/20260910000000_prose/migration.sql`, `app/prisma/schema.prisma` | `Taxon.prose`, `Interaction.studies/real/prose` |
| `app/etl/globi.ts`, `app/etl/prune.ts` | observations paging, `studies`, `real`, `pruneForProse`, `METAWEB` |
| `app/etl/content.ts`, `app/etl/cli.ts` | `--force` (edges only, by distinct target when truncated), `--force --keys`, the prose step after facts, `prose` CLI |
| `app/etl/prose/{sheet,load,prompts,driver,validate,step}.ts` + `{sheet,driver,prune,step}.test.ts` | the step; `loadTaxa` chunked; `assemble` in B's shape |
| `app/etl/README.md` | prose section, command rows, measured refetch time |
| `app/vitest.config.ts` | `etl/**/*.test.ts` included |
| `.gitignore` | `app/etl/prose/runs/` |
| `docs/DEPLOY.md` (shared, A writes) | one row: `PROSE_API_KEY` never set anywhere; the migration runs in Vercel's build, nothing on Neon by hand |

**Type swap for the coordinator** after B lands: in `app/etl/prose/step.ts` delete the local `ProseFact`, `ProseText`, `Prose` types and `import type { Prose, ProseFact, ProseText } from '../../src/server/prose'`; `assemble` returns `Omit<Prose, 'inputHash'>` unchanged; `judged` is `Record<Verdict, number>`, assignable to B's `ProseJudged`. `step.test.ts` needs no change. Optional: a test that `parseProse(assemble(...))` is not null.

**The real run** (after the merge, dev DB, one session):

| step | command | expect |
| --- | --- | --- |
| 0 | `npm run etl -- prose --purge --region mainz-bingen` (drops the hand-written Salamandra row). Mainz-Bingen's edges are refetched, nothing else to do; a region whose step 1 prints `⚠ n edges without studies` gets `content --force --keys <keys>` for the taxa its refetch logged with ✗ | no warning in step 1 |
| 1 | `npm run etl -- prose --region mainz-bingen --run r1` | ≈ 2 982 prompts, 923 pending, 597 draft batches printed as `agent n: r1/prompts/<key>-<lang>[-eco].md …` |
| 2 | One Sonnet subagent per printed batch (`model: "sonnet"`, five prompt paths under `app/etl/prose/runs/r1/prompts/`), drafts only: "read each file, answer with the JSON object only into the `answers/` path the file head names". Run them 8–10 at a time | every `answers/<key>-<lang>[-eco].json` parses (`parseJson` repairs the 0026 shapes) |
| 3 | `npm run etl -- prose --region mainz-bingen --run r1` again | invalid drafts listed per taxon and pending again; **audit prompts** `<same>-audit.md` written, batches printed |
| 4 | Subagents over the audit batches, never mixed with drafts | |
| 5 | `npm run etl -- prose --load --run r1` | `loaded` ≈ 923 minus invalid, `judged` filled; a taxon with any missing or invalid answer stays pending, not stored |
| 6 | Ten Ökologie paragraphs hand-read in the coordinator's findings; then the Neon dump (README §🚀 option 2; `Taxon.prose`, `Interaction.studies/real/prose` travel with the set tables) | 0 embarrassing |
