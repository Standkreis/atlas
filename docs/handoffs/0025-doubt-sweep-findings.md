# 🧹 [0025] Findings — the doubt sweep, coordinator

| 🗓️ Done | 🌿 Branch | ✅ Check | 📄 Tracks |
| --- | --- | --- | --- |
| 2026-09-07 | `main` (A, C, B merged in that order) | `npm run check` green, **70 tests** (59 + 7 A + 2 B + 2 C) | [A](0025-doubt-sweep-findings-a.md) · [B](0025-doubt-sweep-findings-b.md) · [C](0025-doubt-sweep-findings-c.md) |

## 🔀 The merge

| Step | Result |
| --- | --- |
| A onto `main` | one merge commit over the 0026 docs commit, no conflicts |
| C rebased, fast-forward | no conflicts (i18n keys append-only, `package.json` one devDependency) |
| B rebased, fast-forward | no conflicts; the expected `de.json`/`en.json` clash did not happen (the keys live in different objects) |
| Hand-merged files | none needed. Both locales checked: 20 habitat keys, `settings.identity.adoptedStudies`, `dex.gridLabel` present |
| `npm install` | `ffmpeg-static` 5.3 pulled its binary (70 MB); Vercel builds without it (the ETL never runs there, the import is dynamic) |
| Files outside a track's list | A: `routers/taxon.ts`, `LogSave.tsx`, `IdentitySettings.tsx` · B: `tokens.css`, `routers/dex.ts`, `Onboarding.tsx`, `RegionSheet.tsx`, `IdentityDelete.tsx`, `Journal.tsx`, nine components with the `text-amber-deep` rename only. No two tracks touched the same file |

## 📊 The sweep in numbers

| Track | Fixed | Accepted | Tests | Evidence |
| --- | --- | --- | --- | --- |
| A server | A1–A9 (A5 was already built, check added) | A10 | +7 | photo matrix 7/7 · 602 of 640 tiles then 429 · masked mail line · two parallel `ensure` → one row |
| B UI | B1–B11, 0023-2 "Arten", 0012 T4 `clearOutbox` | B12 | +2 | `0025-shots/b-*` de + en on build `mtr680nu`; amber-deep 5.64 white · 5.04 paper · 4.51 amber-soft |
| C ETL | C1 (WAV → MP3, synonym fallback), C2 (stratum word) | C3–C6 | +2 | dev: 3 new clips, 78 habitat rows rewritten |

Struck through in the original findings: 0008 A5 A6 A7 A11 · 0009 A4 · 0010 B3 · 0011 A4 · 0012 T2 T4 T5 · 0013 6 · 0014 A6 C5 · 0018 4 · 0020 8 9 10 · 0021 D E · 0022 1 3 4 6 · 0023 1 2 4. Accepted with the reason written: 0008 A1 · 0009 M2 · 0011 B2 B4 · 0014 A5 B4 · 0016 A2 A5 · 0019 3 7 · 0021 F H and the rest of the owner-decision table.

## 🚑 After the deploy: the profile crashed on updated phones

| What | Detail |
| --- | --- |
| Symptom | `/de/you` and `/en/you` on build `mtr6qvpx` showed Next.js 16's default error page ("This page couldn't load", Reload / Back) in the iPhone 17 Pro Simulator; atlas and journal fine; a fresh Simulator and headless Chrome fine; the server answered 200 for the same cookie |
| Cause | B5 changed the `dex.setCounts` shape; the persisted query store still held the old one (`ids`, no `seen`/`studied`) for the second region, and `rowsOf` read `counts.studied[tile]` on the first render before the `refetchOnMount` answer |
| Fix | `GroupRows.ts:rowsOf` returns null (not loaded) when `seen`, `studied` or `byTile` is missing; test "pre-0025 persisted shape"; 71 tests |
| Lesson | A persisted query's shape change needs a guard on the reader or a persister buster; the tracks' checks ran on fresh stores |

## 🙋 Owner, after the push

| # | What | Command or place |
| --- | --- | --- |
| 1 | Deploy, then on Neon (unpooled URL, `.env.local` loaded, nothing echoed) | `npm run etl -- facts --force` once · `npm run etl -- sounds --region "<name>"` per region |
| 2 | Phone checklist P1–P5 from the [handoff](0025-doubt-sweep.md#-owners-phone-checklist-after-the-merge-and-deploy) | P1 decides B-D1 (Settings, LogSearch, LogSave have no `safe-top` yet) |
| 3 | The eye on the deep amber `#a94c08` (B-D6): the profile number and "studiert" read browner than the bars | profile in light and dark |
| 4 | C-2: "Feuchtgebiet, Boden" on nine waders; a per-class word map would say "am Ufer" | your German |
| 5 | Stale worktrees `../standkreis-dex-{grouping,m9b,progress,sweep-a,sweep-b,sweep-c}` can go (`git worktree remove`) | after the push |

## 🤔 Doubts left open by the tracks (the full lists sit in each file)

| Track | The ones that matter |
| --- | --- |
| A | D1 a static export on another origin loses user photos (no cross-site cookie) · D4 one real Resend mail went to `example.org` during the check · D6 two cold Vercel instances still kick twice |
| B | D1 `safe-top` on three more pages · D4 a hung `remove()` resends once, the server dedupes · D5 offline region sheet needs one online open first |
| C | 1 Erdkröte's clip is 69 s · 3 the 50 % stratum threshold is the track's own · 5 `ffmpeg-static` needs GitHub egress on `npm install` · 6 synonym fallback only on zero recordings |
