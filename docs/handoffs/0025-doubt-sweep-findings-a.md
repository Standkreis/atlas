# 🧹 [0025] Findings — Track A · server, privacy, security

| 🗓️ Done | 🌿 Branch | ✅ Check |
| --- | --- | --- |
| 2026-09-07 | `sweep-a` (worktree `../standkreis-dex-sweep-a`) | `npm run check` green, **66 tests** (59 + 7) |

Rows A1–A10 of [the handoff](0025-doubt-sweep.md#-track-a--server-privacy-security). Checks on the production build (`next build`, `next start -p 3010`, dev DB, photos in the Blob store because `.env.local` carries the token), drivers under `app/scripts/m25a/`.

## 🔁 Decisions

| # | Decision | Why |
| --- | --- | --- |
| A1 | The owner is `Asset.ownerId`, read against the `dex_id` cookie parsed in the route; **no identity is minted** for an unknown cookie, the answer is 404 | The upload route already stamps `ownerId` on every user photo (`api/photo/route.ts`); minting on an image request would create a row per scraper hit. The avatar goes through the same route and belongs to the same owner |
| A1 | `vary: cookie` on the photo answer | A cache between the phone and the function must not hand one identity's 200 to another's 404 |
| A2 | Sounds stay behind the photo route (`/api/photo/<id>.mp3`), only the header changes | Moving the URL would invalidate every `Asset.url`; the `.mp3` bypass in `public/sw.js:54` is untouched |
| A3 | The cap counts **before** the tile is validated, and the origin check refuses only `sec-fetch-site: cross-site` or a foreign `origin`/`referer`; header-less requests pass | A scraper of bad URLs is held too; curl, a URL typed into the bar (`sec-fetch-site: none`) and old browsers still get tiles, the bucket is what holds them. Address: `x-real-ip` (Vercel), else the first `x-forwarded-for` hop, else one shared bucket |
| A4 | The code cleanup runs on `db`, not the sweep's transaction, after the content batches | A failing cleanup must not roll the region lock back; the cut-at-deadline loop does not gate it, so a long content backlog on Vercel never starves it |
| A5 | **Nothing new to build**: `deleteAbandonedPhotos` (`photos.ts`, 0009 B with 0014 P2's avatar guard) already deletes row and file; only the check was missing | The doubt in 0008 predates the sweep |
| A6 | `maskEmail`: first letter, `…`, domain (`s…@example.org`) | Enough to tell two test addresses apart in a dev log, not enough to write to |
| A7 | A second key `settings.identity.adoptedStudies` chosen by the client when `studiesMerged > 0`; the wording is **"studierte Arten" / "studied species"**, not "Studien" | The glossary has no "Studie"; the app says "studiert" everywhere. Two keys beat one ICU message with an empty `=0` branch ("Keine Sichtung und  von hier") |
| A8 | The name comes from `taxon.ensure`, not `sighting.create`: GBIF's `species/{key}/vernacularNames` (cached by `etl/fetch`) is written to `commonNames` on the fresh row and on a nameless row without content; the kick overwrites with Wikidata's labels | `sighting.create` returns no name and runs after the sheet already showed one. The sheet re-asks `ensure` once after 8 s only when GBIF had no name either (`LogSave.tsx`) |
| A9 | Already deduped since 0011 (`__dexContentKicks` map); what was missing was the **create race**: two parallel `ensure` calls for a new key both ran `taxon.create`, the second died on the unique key | Now the loser catches `P2002`, reads the row and answers `created: false`. Across serverless instances the dedupe is best effort, said in the file comment |
| A10 | **Accepted**: outside answers create backbone rows | A find outside the set is still a find; the row is what the diary and the trailing atlas block show. Nothing to clean |

## ✅ Checks

| # | Check | Evidence |
| --- | --- | --- |
| C1 | A1 matrix, `m25a/photo-auth.mjs`: own photo + owner cookie **200** (71 254 B, `private, max-age=31536000, immutable`); other identity **404**; no cookie **404**; garbage cookie **404**; unknown id + owner cookie **404**; sound without cookie **200**, sound with another identity **200** | driver output, all 7 rows ✅ |
| C2 | A2: sound answers `cache-control: public, max-age=31536000, immutable` (1 040 071 B from the Blob store), photo stays `private` | same run |
| C3 | A3, `m25a/tiles.mjs`: 640 parallel requests from one address in 292 ms → **602 allowed, 38 × 429**, `retry-after: 1`; the bucket refills 10/s so 600 + 3 is the bound; after 1 s one more passes; `sec-fetch-site: cross-site` **403**, foreign referer **403**; a real tile from a fresh address with the app's referer **200** (52 108 B, `public, max-age=604800`) | driver output |
| C4 | A3 unit: 600 through, 601st refused with retry-after 1, refill after 101 ms, per-address buckets, `clientIp`, `fromOwnPages` 8 cases | `tileCap.test.ts`, 3 tests |
| C5 | A4 A5, `m25a/sweep.mjs`: two uploads and two `EmailCode` rows, one of each aged two days → `npm run etl -- sweep` logs **`1 abandoned photo(s) removed`**, **`1 email code(s) older than a day removed`**, `done: … photos 1 · codes 1 · 0.6 s`; aged row gone, fresh row kept, live code kept | driver output. First attempt was pre-empted by a `next dev` start whose `register()` sweep did the same job and logged the same two lines |
| C6 | A6, `m25a/mail.mjs` against `next dev -p 3011` without the Resend key: `emailStart` 200, log **`[mail] code for m…@example.org: 109447`**, the address itself absent | driver output; `mail.test.ts` covers `maskEmail` on three shapes |
| C7 | A7 shapes: de `Verknüpft. 3 Sichtungen und 2 studierte Arten von hier übernommen.` · `Verknüpft. Keine Sichtung und eine studierte Art von hier übernommen.` · en `Linked. 2 sightings and one studied species from here carried over.` · sightings-only unchanged | `i18n/adopted.test.ts`, 2 tests through `createTranslator` on the real json; `messages.test.ts` still says de and en have the same keys |
| C8 | A8 A9, `m25a/ensure.mjs`, koala 2440012 (not in the dev DB): two `ensure` at once, both **200 in 179 ms**, the same row, answer carries **`{"de":"Koala","en":"Koala"}`** before any kick; server log **1 job start, 1 done** (`[content 2440012] done: 1 filled, 0 failed in 3.5 s`); the row afterwards `{"de":"Koala","en":"Koala","ja":"コアラ"}`, `contentAt` set | driver output |
| C9 | `npm run check`: typecheck, lint (5 pre-existing warnings, 0 errors), **66 tests**, export build | `/tmp/m25a-check.log` |

## 🤔 Doubts

| # | Doubt |
| --- | --- |
| D1 | A1 breaks any client that shows a user photo **without** the owner's cookie: a static export on another origin (Capacitor, `NEXT_PUBLIC_API_URL`) would send `<img>` requests without the SameSite=Lax cookie. Nothing deployed does this today (Vercel is one origin); the day the export ships, the route needs a signed URL |
| D2 | A3's address on `next start` behind no proxy is the client's own `x-forwarded-for`, so a local scraper can rotate it. On Vercel `x-real-ip` is the platform's. The 10 000-bucket clear is the same blunt guard as `searchCap` |
| D3 | A3: the worker caches tiles as images; a 429 or 403 is not `ok`, so `sw.js:167` does not store it — verified by reading, not run |
| D4 | A6's first run sent one real code mail through Resend to `m25a-fwrxnr@example.org` (bounced at example.org): `next dev` loads `.env.local` on its own, which the driver's comment now says. The `EmailCode` row of that run stays until a sweep ages it out |
| D5 | A8: `gbifVernacular` picks the name most checklists repeat; for a species with a regional and a standard German name that can differ from Wikidata's label, which the kick writes a few seconds later. A flicker, not a wrong name |
| D6 | A9 across two cold Vercel instances still runs the job twice; `runContent` serialises its writes (0008 A11), so the cost is two API rounds, not a corrupt row |
| D7 | The koala (2440012) now lives in the dev DB with content, plus a GloBI target or two; test data by the rules, but `sighting.outside` of nobody lists it |

## 🔀 For the merge

| What | Where | Why |
| --- | --- | --- |
| **Outside the track's list**: `app/src/server/routers/taxon.ts` | `gbifVernacular`, `ensure` (names on a fresh or nameless row, `P2002` catch), kick comment | A8 and A9 live in `ensure`, not in `sighting.create`; the handoff's list did not foresee it |
| **Outside the track's list**: `app/src/components/LogSave.tsx` | one `useEffect`: re-ask `ensure` after 8 s when the row has no name and no content | A8's "polls once after 8 s". Not in Track B's list either |
| **Outside the track's list**: `app/src/components/IdentitySettings.tsx` | `adoptedNotice` helper, two call sites | A7's new key needs `studies` from the client. Not in Track B's list |
| i18n keys added | `settings.identity.adoptedStudies` in `de.json` and `en.json` | A7 |
| Tests added | `app/src/app/api/tiles/tileCap.test.ts` (3), `app/src/server/mail.test.ts` (2), `app/src/i18n/adopted.test.ts` (2) | 59 → 66 |
| New files | `app/src/app/api/tiles/tileCap.ts`, `app/scripts/m25a/{lib,photo-auth,tiles,sweep,mail,ensure}.mjs` | |
| Shared with no track | `sweep.ts` (`SweepResult.codes`), `mail.ts`, `photo/[id]/route.ts`, `tiles/[z]/[x]/[y]/route.ts` | `etl/cli.ts`'s summary line does not print `codes`; Track C owns nothing there, the coordinator may add it |
| Strike-throughs for the coordinator | 0008 A5 A6 A7 A11 · 0010 B3 · 0011 A4 · 0016 A5 (accepted) · 0020 8 9 10 | |
