# 🧹 [0025] Handoff — the doubt sweep

> Build handoff, one large session, three parallel tracks in worktrees plus a coordinator. Every findings file since 0002 left doubts for the owner; the overview of 2026-09-07 sorted them. The stale ones are struck through in place. This session fixes everything that is code, records a decision for everything that is a call, and leaves the owner a phone checklist. Nothing here changes the product contract.

| 🗓️ Written | 👤 Owner | ⬆️ Parent | ⏱️ Budget |
| --- | --- | --- | --- |
| 2026-09-07 | Sven Reiser | Every `*-findings.md` in this folder, [DEPLOY.md](../DEPLOY.md), [ETL README](../../app/etl/README.md) | One session. Coordinator on `main` writes the handoff-level findings; Track A `../standkreis-dex-sweep-a`, Track B `../standkreis-dex-sweep-b`, Track C `../standkreis-dex-sweep-c`, all from `main`. A merges first, then B rebases, then C |

---

## 🎯 Why

About 200 doubts accumulated in 22 findings files. Roughly 40 are real and small enough to close in one sitting; a dozen need the owner; the rest are history. Closing the small ones now keeps the findings honest and takes three security and privacy items off the table before anyone but the owner uses the app.

## 🧭 Rules for this session

| Rule | Detail |
| --- | --- |
| Tracks edit only their file list | Shared files are named per track; the coordinator merges them by hand. `ROADMAP.md` and this pair are the coordinator's |
| Every fixed doubt is struck through **in its original findings file** | `~~old text~~ → fixed in 0025 (<one clause>)`, same as 0024 did. The coordinator does this after the merge from the tracks' findings |
| Every accepted doubt gets its decision written next to it | `→ accepted in 0025: <reason>` in the original file |
| Schema is frozen | One hand-written migration is allowed if a track cannot do without (name it `20260910000000_<slug>`, apply locally with `prisma migrate deploy` only). Prefer none |
| Production build for anything offline | `npm run build` then `next start -p 3002` (the `app-prod` launch config); `npm run check` leaves an export build in `.next`, rebuild before `next start` |
| `npm run check` green per track before the merge | 59 tests today |

## 🅰️ Track A — server, privacy, security

Files: `app/src/app/api/photo/[id]/route.ts`, `app/src/app/api/tiles/**`, `app/src/server/sweep.ts`, `app/src/server/mail.ts`, `app/src/server/routers/identity.ts`, `app/src/server/routers/sighting.ts`, `app/src/server/photos.ts`, `app/src/i18n/*.json` (only the keys named), `app/scripts/m25a/`, plus tests next to them.

| # | Doubt | Fix | Check |
| --- | --- | --- | --- |
| A1 | 0008 A6 · `/api/photo/<id>` is a capability URL, no cookie check | User photos (`origin: 'user'`) answer only to the identity that owns the sighting's asset (the `dex_id` cookie, same resolution as tRPC's context); everyone else 404, never 403 (no existence leak). Sounds stay public. The export lists these URLs for the owner, who has the cookie: unchanged | Own photo 200, other identity 404, no cookie 404, sound without cookie 200 · `m25a/photo-auth.mjs` |
| A2 | 0011 A4 · cross-region Blob read per uncached view | Sounds: `cache-control: public, max-age=31536000, immutable` (they are CC content keyed by GBIF key, nothing private). Photos keep `private`. Confirm the worker's `.mp3` bypass still holds | Header on both routes |
| A3 | 0010 B3 · tile proxy has no rate limit | Same shape as `searchCap.ts`: per-instance token bucket, 600 tiles per minute per IP, 429 with `retry-after` beyond it; plus a `sec-fetch-site` / origin check so only the app's pages pull tiles. Best effort on serverless, say so in the file comment | 601st tile in a minute → 429 · `m25a/tiles.mjs` |
| A4 | 0020 9 · `EmailCode` rows never cleaned | The hourly sweep deletes rows with `expiresAt < now − 1 day` (used or not). Log the count | Sweep log line, a row older than a day gone |
| A5 | 0008 A7 · abandoned uploads linger as Asset rows and files | The sweep deletes `origin: 'user'` assets with no sighting and `createdAt < now − 1 day`, file and Blob object too (`photos.ts` gains `remove` if it has none). Log the count | Upload, abandon, run the sweep → row and file gone |
| A6 | 0020 8 · dev log prints the email address | Mask to `a…@domain` in the `[mail]` line. The code stays readable | Log line |
| A7 | 0020 10 · adopted notice names sightings only | `identity.adopted` text names studies when `studiesMerged > 0`: "n Funde und m Studien übernommen" (`de`, `en`) | Unit test on the message shape |
| A8 | 0008 A5 · fill sheet shows the Latin name until the kick lands | `sighting.create` answers with the name the kick will produce when the taxon is already known (`names.de` from GBIF vernacular is one cached call); if truly new, the sheet polls `taxon.page` once after 8 s | Sheet on a known out-of-set taxon shows the German name at once |
| A9 | 0008 A11 · two taps run two content kicks | A per-process `Set<gbifKey>` of running kicks; a second tap for the same key awaits the first. Best effort across instances, say so | Two parallel `ensure` calls, one job log |
| A10 | 0016 A5 · outside answers create backbone rows | Accept: the rows are the product (a find outside the set is still a find). Write the decision | none |

## 🅱️ Track B — UI, accessibility, offline

Files: `app/src/components/ProgressCard.tsx`, `AtlasGrid.tsx`, `FilterDrawer.tsx`, `SightingDetail.tsx`, `OfflineBanner.tsx`, `IdentityProfile.tsx`, `Queue.ts`, `app/src/app/globals.css`, `app/src/app/[locale]/layout.tsx` (safe area only), `app/public/sw.js`, `app/scripts/m8a/sw-manifest.mjs`, `app/src/i18n/*.json` (only the keys named), `app/scripts/m25b/`, plus tests next to them.

| # | Doubt | Fix | Check |
| --- | --- | --- | --- |
| B1 | 0023 1 · atlas title scrolls under the PWA status bar, sticky header stops below | `main` gets `padding-top: env(safe-area-inset-top)` on the atlas (and only where the page has no header of its own); the sticky `li.atlas-group` keeps its `top`. Verify in the Simulator with the PWA installed (`scripts/shot.mjs` cannot; use `xcrun simctl` and Add to Home Screen once by hand) | Shot with the status bar, header below it |
| B2 | 0023 4 · section headers are list items, screen reader counts 932 | `li.atlas-group` gets `role="presentation"` and an inner `h2`; the `ul` gets `aria-label` with the visible count of species, not items | `read_page` tree: 929 items, 3 headings |
| B3 | 0022 3 · folded progress body stays in the a11y tree | `inert` on the body while folded (React 19 supports the attribute); the fold animation is unchanged | Folded rows absent from the tree |
| B4 | 0022 4 · two chevrons per open card, same glyph | The "n weitere Gruppen" row loses its chevron and becomes a text button "n weitere Gruppen anzeigen" / "weniger" | Shot |
| B5 | 0022 1 · `setCounts` ships ~40 KB of ids per region | The router returns `{ region, total, byTile }` only; the client counts seen and studied from its own `identity.progress` join, which it already has. Test on `GroupRows.ts` | Payload size in `read_network_requests`, numbers identical before and after |
| B6 | 0014 A6 · amber under AA at 4.1:1 | `--amber` text colour to a shade that passes 4.5:1 on `--bg-card` in both schemes; the disc and button fills keep the brand amber (they carry white text, check that one too) | Contrast numbers per pair in the findings |
| B7 | 0012 T2 · error line's tail is Prisma's first line | The tail becomes `data.code` only ("INTERNAL_SERVER_ERROR"), nothing else | Shot of a forced error |
| B8 | 0012 T5, 0022 6 · offline banner absent on pages that were offline | Reproduce on the production build with the CDP script (`m8a/offline.mjs`): the banner keys on a failed fetch (0009 A7 says so by design). Fix: also key on `navigator.onLine === false` at mount and on the `offline` event, keep the failure key. The spec's "nothing blocks" holds, the banner is not a block | Banner within 1 s of going offline on the atlas, the profile and a sighting page |
| B9 | 0009 A4 · IndexedDB calls in the outbox can hang | Every IDB call in `Queue.ts` races a 5 s timeout; on timeout the outbox falls back to `localStorage` for that write and logs once. 0009's C8 saw the hang under load once; the fallback makes a hang a delay, not a lost sighting | Unit test with a stubbed IDB that never resolves |
| B10 | 0013 6, 0014 C5 · `splash.jpg` and the avatar not in the precache | Add the splash to the manifest; the avatar is per identity, so the worker caches it on first view under its URL (same rule as species images) | Offline profile shows the avatar after one online view |
| B11 | 0018 4 · "erst online laden" appears twice per tap | One toast per tap | Two taps, one toast each |
| B12 | 0014 B4, 0014 A5 · sighting drawer has no URL, species page hides the tab bar | Accept both: the drawer is modal by design (0014 B), the species page is a leaf with Back. Write the decisions | none |

## 🅲 Track C — ETL and data

Files: `app/etl/sounds.ts`, `app/etl/clip.ts`, `app/etl/traits.ts`, `app/etl/README.md`, `app/etl/data/README.md`, `app/package.json` (one dependency), `app/src/server/steckbrief.test.ts`, `app/scripts/m25c/`.

| # | Doubt | Fix | Check |
| --- | --- | --- | --- |
| C1 | 0021 E · four grasshoppers have WAV-only A recordings, three taxa ND-only | WAV: transcode with `ffmpeg-static` (npm, no brew) to MP3 128 kbps mono, same clip rule, `meta.transcoded: true`. ND: stays out (the licence forbids the crop and the format change); the row says so in the findings | `npm run etl -- sounds --region "Mainz-Bingen"` fills the 4; 3 remain and are named |
| C2 | 0021 D · bird habitat is AVONET's one primary class | Add EltonTraits' foraging stratum as a second word when it says something the primary class does not (`ground`, `understory`, `canopy`, `aerial`, `water`): "Wald, Boden". Keep the codes, translate on the page (Track B owns `SpeciesPage.tsx`, so C ships the codes and the i18n keys, B renders nothing new: the existing comma-join already prints them) | Amsel "Wald, Boden", Mauersegler "Siedlung, Luft" |
| C3 | 0021 H, 0019 3 · PanTHERIA licence unstated | Accept with the attribution as is; the findings already name it. Write the decision in `data/README.md` | none |
| C4 | 0021 F · every clip is NC | Accept for this app; note in the ETL README that a sold product needs a `licence` filter in `clip.ts` (one line, `licensed.some`) and a refill | README line |
| C5 | 0019 7 · insects have no trait source | Accept. The intro text and the ecology edges carry them; the Steckbrief section already hides itself for an empty insect | none |
| C6 | 0011 B4, 0011 B2 · region job needs ~20 h via `waitUntil`, two instances both kick | Accept: regions are filled locally and dumped (CLAUDE.md rule). Write the decision | none |

## 🅾️ Owner decisions, recorded here so the session does not stall

| Doubt | Decision for this session | Why |
| --- | --- | --- |
| 0008 A1, 0009 M2 · out-of-set finds fill the cell but count nowhere | **Unchanged.** The counter reads "n entdeckt · 929 möglich" over the set; a find outside the set shows in the diary and the trailing atlas block | The set is the game; the counter over it must stay true |
| 0016 A2 · genus-only answers surface wrong genera | **Unchanged.** The threshold stays; the ladder's genus rung is labelled as a guess | Product call, a grill first |
| 0022 2 · profile rows follow the atlas filter | **Unchanged.** One truth for both counters | Consistency beats completeness |
| 0023 2 · Gruppen · Gruppieren · Gruppe | **Rename the drawer's filter section to "Arten"** (it filters tiles by kind) and keep "Gruppieren" with chips "Fortschritt · Art · Keine". Track B, one i18n edit | Ends the double meaning without a new word |
| 0013 4 · tile thumb changes with the month | **Unchanged.** It tells the month's story | Design |
| 0012 T4 · thirty exact points in localStorage in clear | **Unchanged**, but Track B verifies that "Alles löschen" wipes `dex.queries` and the outbox (0002 33), and the findings say so | The walk must open offline (0012 F2); the phone is the user's |
| 0021 F · NC sounds | Accepted, see C4 | Personal project |

## 📱 Owner's phone checklist (after the merge and deploy)

| # | Check | Doubt |
| --- | --- | --- |
| P1 | Atlas as installed PWA: scroll a grouped grid, the section header sits below the status bar | 0023 1, 0023 7 |
| P2 | Airplane mode: log a sighting with a photo, back online, it appears on the second device | 0009 M3, 0016 B2 |
| P3 | Airplane mode on the atlas, on the profile, on a sighting: the banner shows within a second | 0012 T5, 0022 6 |
| P4 | Settings → Bewegung reduzieren on the phone: no slide, no fill animation | 0016 B6 |
| P5 | Amsel voice with the silent switch on | 0021 |

## 📦 Deliverables

| What | Where |
| --- | --- |
| Three track findings | `0025-doubt-sweep-findings-a.md`, `-b.md`, `-c.md`: decisions, every check with numbers, doubts, "For the merge" |
| Coordinator findings | `0025-doubt-sweep-findings.md`: the merge order, the struck-through list per original file, what the owner still has to decide, P1–P5 |
| ROADMAP row | "What earlier milestones changed": one line per track |
| Shots | `0025-shots/` |

## 🚫 Not in this session

Anything from 0002, 0004–0006, 0010 (Docker path), 0014b, 0015, 0015b: historical or superseded. 0011 B3 (deadline between batches), 0009 A3 (858 KB store rewrite) and 0009 A5 (Wikimedia 429) wait for a measured problem. 0016 A1, A3, A4, A6 (identification model behaviour) wait for the next grill. The GIFT licence mail waits for the project going public.
