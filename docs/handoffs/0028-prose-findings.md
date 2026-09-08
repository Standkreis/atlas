# ✍️ [0028] Findings — the prose, coordinator

| 🗓️ Done | 🌿 Branch | ✅ Check | 📄 Tracks |
| --- | --- | --- | --- |
| 2026-09-07 | `main` (A merged, B rebased and fast-forwarded) | `npm run check` green, **111 tests** (71 + 32 A + 8 B) | [A](0028-prose-findings-a.md) · [B](0028-prose-findings-b.md) |

## 🔀 The merge

| Step | Result |
| --- | --- |
| A onto `main` | one merge commit, no conflicts |
| B rebased, fast-forward | no conflicts; `src/server/prose.ts` only B wrote |
| Type swap | `etl/prose/step.ts` imports `Prose`, `ProseFact`, `ProseText` from `src/server/prose.ts`; `routers/taxon.ts` reads `parseProse(t.prose)` without the cast |
| Prisma client | the main checkout's client was stale after the merge (`prose` unknown): `npx prisma generate`; `migrate status` up to date (the dev DB got `20260910000000_prose` from Track A's `migrate deploy`) |
| Track A stalled | the first A agent stopped while its 3 h 34 min GloBI refetch ran and never woke; a second agent finished the smoke, the load, the type alignment and the findings |
| Files outside a track's list | A: `.gitignore` (`app/etl/prose/runs/`), `etl/prose/{step,load}.ts` (its own split) · B: `routers/taxon.ts` instead of `dex.ts` (the species query lives there) |

## 🩹 After the merge, from the tracks' doubts

| Doubt | Fix |
| --- | --- |
| A 2: `parasiteOf` has no F5 template (9 taxa, 18 eco prompts) | `F5_TEMPLATES.parasiteOf` ("ist als Parasit von Z verzeichnet"), ECO2 lists it, AUDIT2 names the direction; the pinned-prompt tests expect the grill's text plus this one line |
| A 5 · B 2: one `judged` total, printed per paragraph | printed once, under the Steckbrief text; the eco paragraph carries the label only |

## 📊 The region by the numbers (dev DB, Mainz-Bingen)

| What | Number |
| --- | --- |
| Taxa · with edges carrying studies | 929 · 929 (15 transient failures healed with `content --force --keys`) |
| Edges · `prose=false` (F1 · F2) | 123 558 · 105 887 (F1 76 278 · F2 27 472 before the heal) |
| Draft prompts (de + en + eco) | 2 982 → **597 batches** of five; 568 taxa get an eco prompt; 6 thin |
| Refetch wall time | 3 h 34 min (≈ 6 000 GloBI observation pages, 8.2 GB) |

## 🚀 Run r1: five species on the plan (the owner's slice: "5 examples, then we review")

| What | Number |
| --- | --- |
| Taxa | Feuersalamander 2431776 · Fliegenpilz 8168319 · Eisvogel 2475532 · Kleiner Feuerfalter 1929697 · Hirschkäfer 5743122 |
| Prompts | 18 drafts (5 × de + en, 4 × eco de + en; the Fliegenpilz has < 3 eco lines) → 4 draft agents · 18 audits → 4 audit agents |
| Wall time | ≈ 6 min drafts, ≈ 3 min audits; ≈ 0.42 M subagent tokens, 0 $ |
| Validator | 0 invalid answers |
| Judge | **76 supported · 2 partial · 0 unsupported** (Eisvogel de: "bleibt ganzjährig in der Region" for `Standvogel`, "geschlechtsreif" for `reif`) |
| Loaded | 5 rows, `judged` per taxon, eco on 4 |
| Page | [`c-salamander-de-top.png`](0028-shots/c-salamander-de-top.png), [`c-salamander-de-eco.png`](0028-shots/c-salamander-de-eco.png) on `next start` in the Simulator |
| CLI fix | `prose --keys` was parsed for `content` only; the first `prose --region … --run r1` wrote all 2 978 prompts. Wired in `cli.ts`, the run dir recreated |

### 🔎 The coordinator's read of the nine German texts

| Text | Read | Note |
| --- | --- | --- |
| Feuersalamander · eco | clean | "Domestic Cat" in a German sentence (A doubt 1); "Er wird 28 cm lang" reads a maximum as typical (the 0024 "bis" family) |
| Fliegenpilz | clean, ugly | three Latin-only slug predators; "Der Speisewert ist giftig" is stiff |
| Eisvogel · eco | clean, readable | the best of the nine |
| Kleiner Feuerfalter · eco | clean, dull | a list of record counts |
| Hirschkäfer · eco | clean | "Quercus" without a German name |

No direction reversal, no invented claim. What hurts is data, not the model: partner names without a German label, and maxima written as typical values.

### 📏 The whole region, sized from r1

2 978 prompts → 597 draft + 597 audit agents at ≈ 23 k tokens each ≈ **28 M tokens**, ≈ 9 min per 8 agents ⇒ **≈ 2 h 15 min** with 8 in parallel. Steps: `prose --purge --region mainz-bingen` is **not** needed (the five rows are real); `prose --region mainz-bingen --run r2` → draft agents → the command again → audit agents → `prose --load --run r2` → dump to Neon.

## 🙋 Owner

| # | What |
| --- | --- |
| 1 | **Review the five** (the texts above and in the Simulator), then say: the whole region (≈ 2 h 15 min, 28 M tokens) · a larger slice · fix the data first (partner names, maxima) |
| 2 | Deploy adds the `prose` column and the three `Interaction` columns; nothing on Neon by hand. The live page shows nothing until the dump |
| 3 | B 3: "geprüft" vs "belegt" for the judged count, your German |
| 4 | A 1: "Domestic Cat" in German sheets for partners without a `de` name; a names pass for GloBI targets is its own small milestone |

## 🤔 Doubts left open by the tracks

| Track | The ones that matter |
| --- | --- |
| A | 1 English partner names in German sheets · 6 Salamandra keeps 2 prose edges (F2 counts real records only) · 4 the unfetched warning names `content --force`, the fix is `--force --keys` |
| B | 4 the insect page with Status + prose and no other cell is unseen · 5 the en label wraps at 390 px in dark |
