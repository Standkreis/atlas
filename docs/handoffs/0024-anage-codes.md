# 🧬 [0024] Handoff — AnAge cells as codes

> Fix handoff. The live Amsel Steckbrief of 2026-09-07 showed **"Alter: 21.8 years (wild)"** and **"Nachwuchs: mature at 365 days"** in the German page: the AnAge scrape (0007 E8) bakes English sentences into the value, the only two Steckbrief cells that do so since 0021 made every other key a code or a metric.

| 🗓️ Written | 👤 Owner | ⬆️ Parent | ⏱️ Budget |
| --- | --- | --- | --- |
| 2026-09-07 | Sven Reiser | [Findings 0021](0021-steckbrief-data-and-voice-findings.md) D2 (values are codes, the page translates) · `etl/prune.ts` `parseAnAge` · `SpeciesPage.tsx` `factWords` | One short session on `main` |

## 📐 What to build

| # | Piece | Detail |
| --- | --- | --- |
| A1 | **Codes in the ETL** | `parseAnAge` writes `lifespan` = `<years> wild\|captivity` (or the bare number) and `reproduction` = `clutch\|litter <n> · perYear <n> · maturity <days>`, parts present in that order |
| A2 | **The page translates** | `factWords` renders both through `species.facts.values.lifespan.*` and `…reproduction.*` in `de` and `en`, numbers through `useFormatter` (German comma). Unknown shapes print as they are |
| A3 | **The data already there** | `npm run etl -- recode`: one pass over every taxon with facts, old English → codes, idempotent, no network. Runs on the dev DB now and on Neon once after the deploy; no content rerun |
| A4 | **Tests** | `parseAnAge` on the new shape, `recodeAnAge` on old and new input; `npm run check` green |
| A5 | **Docs** | ETL README row and Neon note, ROADMAP row, this pair |

## ✅ Checks

| # | Check | Evidence |
| --- | --- | --- |
| C1 | Unit tests for both shapes | `npm run check` |
| C2 | Dev DB recoded, second run changes nothing | counts |
| C3 | A bird with lifespan + maturity renders in German on the production build in the Simulator | shot |
| C4 | Neon recoded after the deploy | owner runs `recode` with the unpooled URL, count |
