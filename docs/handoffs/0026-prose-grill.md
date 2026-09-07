# 🔥✍️ [0026] Handoff — the prose grill, second pass

> A grill, not a build. [0019](0019-steckbrief-grill.md) S3 measured 12 % unsupported sentences and the owner said wait until the data is the best it can be. Since then: 0021 filled the facts, 0024 made every cell a code with a source, 0025 Track C adds a stratum word to bird habitat and mass to amphibians. The owner's question of 2026-09-07: *"we could also get started with the prose content extension for ecology, no?"* This grill answers with numbers on the same species as 0019, and it treats the **Ökologie paragraph** as its own case, because that is where GloBI noise turns into claims.

| 🗓️ Written | 👤 Owner | ⬆️ Parent | ⏱️ Budget |
| --- | --- | --- | --- |
| 2026-09-07 | Sven Reiser | [0019 findings](0019-steckbrief-grill-findings.md) §S3 and doubts 2, 5, 7 · `app/scripts/steckbrief-probe/` (prose.mjs, facts.mjs, drafts.md) · [0021 findings](0021-steckbrief-data-and-voice-findings.md) D2 | One session, worktree `../standkreis-dex-prose` (branch `prose-grill`), parallel to 0025. **Spend cap 8 $** on the API key, log every call's cost |

---

## ❓ The questions

| # | Question | What the answer needs |
| --- | --- | --- |
| P1 | **Does the leak go away with better input and a closed-world prompt?** 0019's unsupported sentences were model knowledge ("glänzend schwarze Haut"), not bad facts | Same 10 species as 0019 plus 10 insects (the 47 % with no facts beyond intro, edges, months), de and en. Three prompt variants on Sonnet 5: **V0** 0019's prompt on today's facts (the baseline moved?), **V1** closed world ("you know nothing about this species beyond the sheet; a claim without a fact id is a defect"; no adjectives of appearance; `en` written from the same sheet, not translated), **V2** extractive (every sentence is a rewrite of exactly one or two fact lines, the model may join and reorder, never add). Judge as in 0019 plus a **claim extractor**: list every atomic claim in the text, match each to a fact line, count the orphans. Report supported · partial · unsupported per variant, and orphans per 100 claims |
| P2 | **Ökologie as its own paragraph.** Input: GloBI edges after a harder filter (both ends with a German or English name, edge kind one of the six the page shows, in-set partner or a partner with ≥ 2 GloBI records, cap 8), the facts `diet`, `habitat`, `activity`, `pollination`, the month profile. Output: one paragraph "Ökologie" per language | Unsupported rate for that paragraph alone; how many of the 20 species have enough input for a paragraph at all (rule: ≥ 3 lines); read ten by hand and mark the ones that would embarrass the app ("Amsel frisst Klatschmohn") |
| P3 | **Which model holds the line?** | The best variant of P1 on Opus 5 and Haiku 4.5 for the same 20: unsupported rate, cost per species, and the dull-vs-readable call (the owner scores three drafts per model blind, findings hold the texts) |
| P4 | **Cost at scale, honestly.** | Per species de + en with judge for the winning variant and model, times 2 414 (Neon's set) and per new region (≈ 300 taxa); the Batches API discount applied; rewrite budget per year when `factsAt` moves (assume 20 % of taxa per year) |
| P5 | **The shape of the build.** | If the winning combination is under **3 % unsupported and 0 embarrassing Ökologie sentences in the ten read**, write the build handoff draft `0027-prose.md` as §📐 of the findings: `Taxon.prose JSONB` as 0019 S4 sketched with `inputHash` so a fact change rewrites, the page placement (0019 S5: A, prose last, labelled "KI-Text aus den Quellen oben"), the ETL step after `facts`, the Batches driver. If not, say which input still leaks and stop |

## 📐 How to run it

| Rule | Detail |
| --- | --- |
| Where | `app/scripts/prose-grill/` in the worktree, ES modules like `steckbrief-probe/`. Reuse `lib.mjs` and `facts.mjs` from there by import, do not copy. `taxa.json` of 0019 names the 10; pick the 10 insects from the dev DB Mainz-Bingen set by most GBIF records with a German name |
| Data | Dev DB `postgresql://dex:dex@localhost:5433/dex` read-only. Facts as the DB holds them today (codes; expand codes to words in the sheet through the i18n files so the model sees "Standvogel", not `resident`) |
| Key | `ANTHROPIC_API_KEY` from the main checkout's `app/.env.local` (`ENV_FILE=/Users/svenreiser/Documents/Develop/standkreis/standkreis-dex/app/.env.local`, read names only, never print). Thinking disabled. `max_tokens` 1 200 |
| Spend | Every call logs input, output, cents; `grill.json` totals. Stop at 8 $ and report what is missing. Order: P1 (60 calls ≈ 1 $), P2 (40 ≈ 0.6 $), P3 (80 ≈ 2.5 $ with Opus), judge and extractor on all (≈ 2 $) |
| Human read | The findings quote the three drafts per model in full, marked sentence by sentence, so the owner reads them without opening JSON |
| Do not | Touch `app/src/`, `app/etl/`, the schema, or Neon. Do not write prose into the DB |

## 📦 Deliverables

| What | Where |
| --- | --- |
| Scripts, `grill.json`, `drafts.md` (all texts with marks), `README.md` | `app/scripts/prose-grill/` (`.cache/` git-ignored) |
| Findings | `docs/handoffs/0026-prose-grill-findings.md`: P1–P5 tables with numbers, cost table, the three drafts per model, decisions for the owner (ship / ship Ökologie only / wait), doubts, and §📐 the build draft if P5 passes |
