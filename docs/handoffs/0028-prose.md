# ✍️ [0028] Handoff — the prose, built with the `files` driver

> [0027](0027-prose-regrill-findings.md) said **build**: V1 on Sonnet at 1.4 % unsupported, the Ökologie paragraph at 0 embarrassing sentences after F1–F5. The owner picked the driver on 2026-09-07: **files**. Every draft and every audit is a Claude Code subagent on the plan; the ETL writes prompt files and reads answer files. Nothing in this milestone calls `api.anthropic.com`.

| 🗓️ Written | 👤 Owner | ⬆️ Parent | ⏱️ Budget |
| --- | --- | --- | --- |
| 2026-09-07 | Sven Reiser | [0027 findings §📐](0027-prose-regrill-findings.md#-build-draft-the-0019-s4s5-shape-with-what-the-grill-changed) · `app/scripts/prose-grill/` (sheets.mjs, prose.mjs, common.mjs, report.mjs) | Two parallel tracks, one session each, worktrees `../standkreis-dex-prose-a` (branch `prose-a`) and `../standkreis-dex-prose-b` (branch `prose-b`) from `main`. **A merges first, B rebases** |

## 🚫 The rule this milestone lives under

| Rule | Detail |
| --- | --- |
| No `api.anthropic.com` | CLAUDE.md "Never". The `api` driver is a **seam only**: same interface, throws `prose: the api driver is off (CLAUDE.md)` unless `PROSE_API_KEY` is set, and no code in this milestone sets it, reads the app's `ANTHROPIC_API_KEY`, or imports the Anthropic SDK. The worktrees' `.env.local` has no `ANTHROPIC_API_KEY` line on purpose |
| No model calls in the tracks | The tracks build the pipe and test it on fixtures and hand-written answer files. The **coordinator session after the merge** runs the subagents for one region (§🚀) |

## 🗄️ Schema (Track A, one migration folder, hand-written, `prisma migrate deploy` locally only)

```sql
-- 20260910000000_prose
ALTER TABLE "Taxon" ADD COLUMN "prose" JSONB;
ALTER TABLE "Interaction" ADD COLUMN "studies" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Interaction" ADD COLUMN "real" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Interaction" ADD COLUMN "prose" BOOLEAN NOT NULL DEFAULT true;
```

| column | shape | rule |
| --- | --- | --- |
| `Taxon.prose` | `{ de: { paragraphs: [{ sentences: [{ text, cites: string[] }] }] } \| null, en, eco: { de, en }, facts: [{ id, source, text }], inputHash, model, judged: { supported, partial, unsupported }, at }` | `inputHash` = sha1 of the sheet (full + eco lines, both languages); the step rewrites when it changes. `facts` stored so the ⓘ sheet resolves after facts change. `eco.de`/`eco.en` null when < 3 eco lines |
| `Interaction.studies` | `{ "<study citation>": records }` from GloBI `includeObservations=true` (`sheets.mjs:studyKey`) | the existing edges of a region keep `{}` until `content --force` or the region is refetched; `real` 0 and `prose` true then, so **F2 does not fire on unfetched edges** (say so in the sheet with a warning count) |
| `Interaction.real` | records not from a metaweb | `sheets.mjs` F1/F2 counts, ported |
| `Interaction.prose` | false when F1 (eats/eatenBy, all studies metawebs) or F2 (≤ 1 real record from ≤ 1 real study) | the tile keeps showing the edge (0026 decision); the sheet skips it |

## 🔩 Track A · ETL + migration

| piece | file | what |
| --- | --- | --- |
| GloBI | `app/etl/globi.ts` | paged fetch with `includeObservations=true` (≤ 50 pages of 1 000 as `sheets.mjs:77`), `Edge` gains `studies: Record<string, number>`, `real`. `METAWEB` list and `isMetaweb` ported verbatim with the comment |
| pruning | `app/etl/prune.ts` | `pruneForProse(edge) → 'F1' \| 'F2' \| null` (pure, tested); `content.ts` writes `prose: false` on the edge |
| sheet | `app/etl/prose/sheet.ts` | `sheetFor(taxon, lang) → { full: Line[], eco: Line[] }`, ported from `sheets.mjs`: facts through the i18n words (`src/i18n/*.json`, `factWords`), month profile, edges with `prose: true`, cap 8. `inputHash(sheet)` |
| prompts | `app/etl/prose/prompts.ts` | V1, ECO2 (F5 direction templates per line kind), AUDIT2 verdict-first, **verbatim** from `prose.mjs` |
| driver | `app/etl/prose/driver.ts` | `interface Driver { draft(job) → Promise<Json \| null>; audit(job) → Promise<Json \| null> }`. **`files`**: `draft` writes `app/etl/prose/runs/<run>/prompts/<gbifKey>-<lang>[-eco].md` and returns the answer file if `answers/<same>.json` exists, else null (pending). `parseJson` from `common.mjs` (+F4) ported. **`api`**: the seam above, off |
| validator | `app/etl/prose/validate.ts` | every sentence cites ≥ 1 known id; one paragraph fine (F4); eco draft carries an F5 template per line kind |
| step | `app/etl/content.ts` after `facts` | `prose`: for each taxon of the region with ≥ 3 full lines: skip when `inputHash` unchanged, `draft` de + en (+ eco when ≥ 3 eco lines), validate, `audit` each, store `Taxon.prose` with `judged`. With `files`, a taxon whose answers are missing is **pending**, counted, not an error |
| CLI | `app/etl/cli.ts` | `prose --region <slug> [--driver files\|api] [--run <name>]` (writes prompts, loads what has answers; prints written · pending · loaded · skipped), `prose --load --run <name>` (answers → DB only), `prose --purge [--region]` |
| README | `app/etl/README.md` | the `prose` section: the file protocol, the subagent batch rule (five prompts per agent, drafts and audits never in one agent), `--load`, the dump to Neon |
| tests | `app/etl/prose/sheet.test.ts`, `driver.test.ts`, `prune.test.ts` | F1/F2 on fixtures from `scripts/prose-grill/sheets.json` (Salamandra 187 → 5 lines; Amanita → 0 eco); `parseJson` on 0026's three shapes; the validator; F5 templates present in every eco prompt; `files` driver round trip on a temp dir |

Track A files: `etl/prose/*`, `etl/globi.ts`, `etl/prune.ts`, `etl/content.ts`, `etl/cli.ts`, `etl/README.md`, `prisma/migrations/20260910000000_prose/migration.sql`, `prisma/schema.prisma`, `docs/DEPLOY.md` (shared, one line: the migration runs in Vercel's build, nothing on Neon by hand).

## 🎨 Track B · the page

Placement **A** (0019 S5). The prose sits after the Steckbrief tiles; the Ökologie paragraph under the Ökologie tile. Label "KI-Text aus den Quellen oben" / "AI text from the sources above"; the ⓘ opens a sheet listing the cited fact lines. Nothing renders when `prose` is null or the language's text is null.

| piece | file |
| --- | --- |
| component | `app/src/components/Prose.tsx` (new): `<Prose text={prose.de} facts={prose.facts} judged={prose.judged} />`, paragraphs, the label, the ⓘ sheet (the `Sheet` the page already uses) with the cited facts in prose order |
| page | `app/src/components/SpeciesPage.tsx`: `<Prose>` after the Steckbrief tiles, `<Prose eco>` under the Ökologie tile |
| router | `app/src/server/routers/dex.ts`: `prose` in the species query, typed `Prose \| null` from `src/server/prose.ts` (the type file B owns; A's `Taxon.prose` writer imports the same type after the merge) |
| i18n | `species.prose.label`, `species.prose.sheetTitle`, `species.prose.judged` ("{n} von {m} Sätzen geprüft" / "{n} of {m} sentences checked") in `src/i18n/de.json`, `en.json`; `messages.test.ts` covers the keys |
| fixture | until A merges, B tests with a hand-written `Prose` object in `Prose.test.ts` and a `?prose` dev-only fixture is **not** added: the page stays empty on the dev DB, the shots come from the test render and from the Simulator after the merge |
| tests | `Prose.test.ts`: null → nothing, cites resolve to the facts in order, the label present, de skipped when `de` is null |

Track B files: `src/components/Prose.tsx`, `SpeciesPage.tsx`, `src/server/routers/dex.ts`, `src/server/prose.ts`, `src/i18n/*.json`, `Prose.test.ts`, `messages.test.ts`. Persisted query: the species query is `meta.persist`; a reader that sees an old cached shape without `prose` must render nothing, not crash (0025 lesson).

## 🚀 After the merge: the coordinator fills one region

| step | command or act | gate |
| --- | --- | --- |
| 1 | `npm run etl -- content --region mainz-bingen --force` on the dev DB (refetches GloBI with studies; the F1/F2 counts printed) | Salamandra 187 → ≈ 5 prose edges |
| 2 | `npm run etl -- prose --region mainz-bingen --run r1` → prompts written, N pending | |
| 3 | Sonnet subagents, five prompts each, drafts first, then audits over the answered drafts (≈ 240 agents, ≈ 45 min) | every answer parses |
| 4 | `npm run etl -- prose --load --run r1` | loaded = drafted, `judged` filled |
| 5 | Hand-read **ten Ökologie paragraphs** in the findings, sentence by sentence | 0 embarrassing |
| 6 | Deploy (migration), dump the set tables to Neon (README §🚀 option 2) | live Feuersalamander shows the prose |

## 📐 Rules

| Rule | Detail |
| --- | --- |
| Data | Dev DB only. `prisma migrate deploy` locally for the new folder; never `migrate dev`, `db push`, `reset` |
| Edit only your track's files | Shared: `docs/DEPLOY.md` (A writes, B leaves), `src/server/prose.ts` (B writes; A types its writer locally as `Prisma.InputJsonValue` and names the file in the findings so the coordinator swaps the import) |
| Check | `npm run check` green before the findings; new tests named with counts |
| Deliverables | `docs/handoffs/0028-prose-findings-a.md`, `-b.md`: decisions the handoff left open, every check with evidence and numbers, doubts, "For the merge". Small commits, `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`, no push |
