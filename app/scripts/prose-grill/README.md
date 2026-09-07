# 🔥✍️ prose-grill · the 0026 grill

Throwaway measurement, no product code. Findings in [docs/handoffs/0026-prose-grill-findings.md](../../../docs/handoffs/0026-prose-grill-findings.md). Run from `app/`, in this order; every Anthropic and GloBI answer is cached under `.cache/` (git-ignored), so a rerun costs nothing.

| Script | Does | Out |
| --- | --- | --- |
| `common.mjs` | paths, cache, prices per model, the Messages API call with `thinking: disabled`, the cost log and the 8 $ cap. Imports env handling and helpers from `../steckbrief-probe/lib.mjs` | `grill.json` (every paid call: model, tokens, cents; total) |
| `sheets.mjs` | the 0019 ten (`../steckbrief-probe/facts.json` keys) + ten Mainz-Bingen insects from the dev DB, read only. Codes → words per language through `src/i18n/{de,en}.json` with the page's rules (`SpeciesPage.tsx:112-141`). `full` sheet for P1/P3, `eco` sheet for P2 (hard GloBI filter, record counts from `includeObservations=true`) | `sheets.json` |
| `prose.mjs [P1\|P2\|P3\|all]` | drafts per variant × model × species × language, the 0019 validator, one Sonnet 5 audit per draft (judge + claim extractor). `--only '<sciName>'`, `--variants V1,V2`, `--variant V1` (P3 choice), `--concurrency 3` | `results.json` |
| `report.mjs` | the P1–P4 tables, the spend, `drafts.md` with every sentence marked; merges `marks.json` (hand read of the Ökologie paragraphs) | `report.md`, `drafts.md` |

Key: `ANTHROPIC_API_KEY` from `app/.env.local` (`ENV_FILE=` when elsewhere), name and length printed, never the value. `steckbrief-probe/facts.mjs` is not imported: it runs on import (DB, Wikidata, writes `facts.json`); its ten names are read from `facts.json` instead. The 0019 prompt is quoted in `prose.mjs` as V0 so the baseline is the same text.

Marks in `drafts.md`: `[F3,F7]` cites · ⚠️ partial · ❌ unsupported · 🟠 orphan claim · 🙈 hand mark.
