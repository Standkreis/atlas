# ✍️ [0028] Findings · Track B — the page

> Branch `prose-b`, worktree `../standkreis-dex-prose-b`. Placement A (0019 S5) built: `<Prose>` after the Steckbrief tiles, `<Prose eco>` under the Ökologie tile, the label, the ⓘ sheet with the cited lines, the judge line. No model call, no `api.anthropic.com`, no schema edit. `npm run check` green (79 tests, 8 new).

| 🗓️ | 👤 | ⬆️ | 🔀 |
| --- | --- | --- | --- |
| 2026-09-07 | Sven Reiser | [0028](0028-prose.md) §🎨 · [0027 §📐](0027-prose-regrill-findings.md) · 0019 S5 | four commits on `prose-b`, no push |

## 🧭 Decisions the handoff left open

| # | Question | Decision | Why |
| --- | --- | --- | --- |
| B1 | Where the species query lives | `app/src/server/routers/taxon.ts` (`taxon.page`), **not** `dex.ts` as the file list says | `dex.ts` has no species query; the page reads `trpc.taxon.page` (`SpeciesPage.tsx:72`) |
| B2 | Reading `prose` before A's Prisma client has it | `parseProse((t as { prose?: unknown }).prose ?? null)` with the "Track A adds Taxon.prose (0028); typed here until the merge" comment | `findUnique` without `select` returns every scalar the client knows: null before the merge, the column after, no swap needed. A raw select would 500 on a DB without the column |
| B3 | `facts` shape | `Prose.facts: { de: Line[]; en: Line[] }`, `ecoFacts` the same or null; `parseProse` **also accepts the handoff's flat `Line[]`** (copied to both languages) | The sheet is bilingual (`sheets.mjs` writes `de.full` and `en.full` with different words) and the eco sheet numbers its lines on its own (F1–F6 in 0027's P3 prompts vs F1–F12 in the full sheet). A flat list would show German lines under the English text and resolve eco cites against the wrong lines. Doubt 1 |
| B4 | Judge line | `n` = `judged.supported`, `m` = supported + partial + unsupported, on the page in the label ("KI-Text aus den Quellen oben · 6 von 6 Sätzen geprüft ⓘ") and repeated in the sheet's hint | One `judged` per taxon in the handoff, so the same count sits under both paragraphs. Doubt 2 |
| B5 | Order inside the Steckbrief section | cells → voice row → "noch keine Angaben" → prose | S5 says "generated prose last and labelled"; the grey line belongs to the tiles |
| B6 | A tile without cells but with prose | `showFacts` is also true when the language has prose, so an insect with enough GloBI lines gets Status + text | Otherwise the section, and with it the prose, is hidden for the tile the prose helps most |
| B7 | The ⓘ sheet | Own `ProseSheet` on the page's `Sheet` (same handle, z, maxH, close button as `SourceSheet`), one row per cited line "F5 · AmphiBIO" over the words, in first-cite order, each once | `SourceSheet` rows are author/licence/source `dl`s; a fact line has none of the three |
| B8 | Test render | `react-dom/server` `renderToStaticMarkup` under `NextIntlClientProvider` in a `.test.ts` (no jsdom, no testing-library in the repo) | Enough for markup, label and the two languages; the sheet's open state is proven in the browser shot instead |

## ✅ Checks

| # | Check | Evidence |
| --- | --- | --- |
| C1 | `npm run check` | typecheck ✓ · lint 0 errors (6 pre-existing warnings in `scripts/`) · **79 tests, 14 files** (71 + 8) · `build:export` ✓ |
| C2 | `parseProse` returns null for 10 old or malformed shapes, round-trips the fixture, copies a flat `facts` to both languages | `Prose.test.ts` "parseProse" ×2 |
| C3 | Cites resolve in prose order, each once, unknown id skipped | `citedFacts` → `['F1','F7','F8','F5','F4']`; `['F5','F99','F5']` → `['F5']` |
| C4 | null → nothing; en null → nothing in en; eco en null → nothing | three empty renders |
| C5 | Paragraphs, label, judge count, ⓘ present; sheet closed until the tap | de render contains `KI-Text aus den Quellen oben · 5 von 6 Sätzen geprüft`, `data-testid="prose-info"`, no `prose-sheet` |
| C6 | `eco` picks the Ökologie paragraph in the reader's language; judge count skipped when `judged` is null | en eco render, `judged: null` render |
| C7 | `messages.test.ts` | de/en same keys; `species.prose.{label,sheetTitle,sheetHint,judged}` with the exact label and judged strings |
| C8 | Production page with `prose` null, nothing broke | `npm run build` + `next start -p 3003`, headless Chrome 390×844 @2: `{"prose":false,"eco":false,"errors":[]}` — `b-null-steckbrief-{de-light,de-dark,en-light}.png` |
| C9 | Production page with the Feuersalamander seeded | `{"prose":true,"eco":true,"label":"KI-Text aus den Quellen oben · 6 von 6 Sätzen geprüft","errors":[]}` — `b-steckbrief-{de,en}-{light,dark}.png`, `b-eco-{de,en}-light.png` |
| C10 | The ⓘ sheet lists the five cited lines in prose order | `sheetRows: 5` (F1, F7, F8, F5, F4) — `b-sheet-{de-light,de-dark,en-light}.png` |

How C8–C10 ran: the strict production env needs values the worktree does not have, so the server got throwaway ones on the command line (`WEBAUTHN_SECRET` random, `ANTHROPIC_API_KEY=dummy-never-used`, `ANTHROPIC_BASE_URL=http://127.0.0.1:9`, `RESEND_API_KEY=dummy-never-used`); nothing on the species page calls either API. Shot script: a throwaway copy of `scripts/m8a/offline.mjs`'s CDP part in `/tmp`, not committed.

## 🖼️ Shots · `0028-shots/b-*.png`

| shot | what |
| --- | --- |
| `b-null-steckbrief-de-light`, `-de-dark`, `-en-light` | the Steckbrief with `prose` null: unchanged page |
| `b-steckbrief-de-light`, `-de-dark`, `-en-light`, `-en-dark` | two paragraphs after the grey line, the label with the judge count and ⓘ |
| `b-eco-de-light`, `-en-light` | the Ökologie paragraph under the chip grids |
| `b-sheet-de-light`, `-de-dark`, `-en-light` | "Quellen des KI-Texts" / "Sources of the AI text": hint + judge line, F1 · GBIF … F4 · IUCN Red List |

## 🌱 The seed on the dev DB

`Taxon.prose` **already existed** on the dev DB when B got there: `_prisma_migrations` lists `20260910000000_prose`, so Track A had run its migration against the shared dev DB. The `ALTER TABLE … ADD COLUMN IF NOT EXISTS` the brief allowed was a no-op (`NOTICE: column "prose" … already exists, skipping`). One row was seeded by hand: `UPDATE "Taxon" SET prose = '<fixture>' WHERE "gbifKey" = 2431776` (Feuersalamander), `inputHash: "seed"`, `model: "fixture (0027 P3 answers, hand-shaped)"`, `judged 6/0/0`. Left in place: A's step rewrites it (hash mismatch) and `prose --purge` clears it. For the seeded shots the router read the column through a temporary `$queryRaw` (the Prisma client in this worktree has no `prose`); that line was reverted before the check and is not in any commit.

## 🤔 Doubts

| # | Doubt |
| --- | --- |
| 1 | **`facts` needs a language and the eco sheet needs its own list.** The handoff stores one `facts: [{ id, source, text }]`; the sheet is de/en with different words and the eco prompt numbers F1–F6 on its own. If A writes the flat shape, the English ⓘ shows German lines and the eco cites resolve to the wrong full-sheet lines (F1 "Nahrung" vs F1 "Wissenschaftlicher Name"). `parseProse` accepts both, but the correct shape is `facts: { de, en }` + `ecoFacts: { de, en }` as `src/server/prose.ts` types it. The coordinator should check A's writer against the type at the swap |
| 2 | One `judged` per taxon means "6 von 6 Sätzen geprüft" under a two-sentence eco paragraph counts the Steckbrief's sentences too. Per-text `judged` (`de`, `en`, `eco.de`, `eco.en`) would make the line honest per paragraph; a one-line change in `parseJudged` and `Prose.tsx` once A stores it |
| 3 | "geprüft" reads as "passed"; `n` is `supported` only, so a partial sentence is shown but not counted. Alternative wording "n von m Sätzen belegt" would be closer to what the judge says. Owner's call |
| 4 | An insect page with Status + prose and no other cell (B6) has not been seen yet; the dev DB has no such row |
| 5 | The label wraps in en dark at 390 px (`b-steckbrief-en-dark.png`), the ⓘ centres on the two lines. Acceptable; a shorter en label ("AI text from the sources above" is 31 chars) would keep it on one line with the count |

## 🔀 For the merge

| file | state |
| --- | --- |
| `app/src/server/prose.ts` (new) | the type A's writer imports; `parseProse`, `citedFacts` |
| `app/src/components/Prose.tsx` (new), `Prose.test.ts` (new) | component, 7 tests |
| `app/src/components/SpeciesPage.tsx` | `import { Prose }`, `proseLang`, `showFacts` extended, `<Prose prose={s.prose} />` after the missing line, `<Prose prose={s.prose} eco />` after the kinds |
| `app/src/server/routers/taxon.ts` | `import { parseProse }`; `prose: parseProse((t as { prose?: unknown }).prose ?? null)` — **after A's client has `prose`, swap to `parseProse(t.prose)` and drop the comment**; nothing else changes |
| `app/src/i18n/de.json`, `en.json` | `species.prose.{label,sheetTitle,sheetHint,judged}` |
| `app/src/i18n/messages.test.ts` | one test for the keys |
| `docs/handoffs/0028-shots/b-*.png` | 12 shots, 2.6 MB |

Not touched: schema, migrations, `app/etl/**`, `docs/DEPLOY.md`, `dex.ts`. Rebase on A: no shared file except `src/server/prose.ts`, which only B writes.
