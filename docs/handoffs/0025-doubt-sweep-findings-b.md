# 🅱️ [0025] Findings — Track B: UI, accessibility, offline

| 🗓️ Done | 🌿 Branch | ✅ Check |
| --- | --- | --- |
| 2026-09-07 | `sweep-b` (worktree `../standkreis-dex-sweep-b`) | `npm run check` green, **61 tests** (59 at the start) |

Driver: `LOCALE=de node scripts/m25b/sweep.mjs ../docs/handoffs/0025-shots` against the production build on **3011** (headless Chrome over CDP, worker sessions auto-attached). Every number below is from `0025-shots/b-sweep-de.json` / `-en.json` of build `mtr680nu`; the en run gave the same numbers.

## 🔁 Decisions

| # | Decision | Why |
| --- | --- | --- |
| B1 | `main.safe-top` (`globals.css`, unlayered, `calc(0.75rem + env(safe-area-inset-top, 0px))`) on the three tab pages without a header of their own: atlas, profile, diary. `layout.tsx` untouched | The pages with a header already pad it; the `li.atlas-group` keeps `top: 0` because the sticky header sits inside the padded `main`, not under the status bar |
| B2 | The `ul` says **"929 Arten"** / "929 species" (`dex.gridLabel`, new key), the header `li` is `role="presentation"`; the `h2` was already there | The brief's wording |
| B3 | `inert={!open}` on the region body and on the folded-rows fold; the animation is the same `grid-rows` transition | React 19 takes the boolean |
| B4 | The row is a text button, no chevron: **"5 weitere Gruppen anzeigen"** / "weniger" ("Show 5 more groups" / "fewer"), `aria-expanded` kept | One chevron per card, and it belongs to the fold |
| B5 | **Counted on the server, not the client.** `setCounts` returns `{ region, total, byTile, seen, studied }` — the brief's client join is impossible: `identity.progress` carries counts, not memberships, and the ids were the only membership the client had. The server intersects the set's `Plausibility` rows with the identity's `Study` and its distinct wild `Sighting` taxa. The cache is per identity already (`watchIdentity` drops the store), the card refetches on mount (`refetchOnMount: 'always'`) so a new sighting shows on the next visit | 832 bytes for two regions instead of ~40 KB per region; one truth, computed where the data is |
| B6 | New token **`--color-amber-deep`**: `#a94c08` light, `#f0a030` dark. Every `text-amber` in the app became `text-amber-deep` (17 files, `sed`); `bg-amber`, rings, bars and the disc keep the brand `--color-amber`. The axis radios in the progress card sit on the deep pair (`bg-moss-deep` / `bg-amber-deep`) because white on brand amber is 4.12 and white on brand moss 3.30 | The lightest shade that passes 4.5 on white, paper **and** `amber-soft` (the banner); `#b45309` (Tailwind's amber-700) fails on paper at 4.49 |
| B7 | `Onboarding.tsx`: the tail is `error.data.code` or `error` | The brief |
| B8 | `OfflineBanner` already keyed on `navigator.onLine` at mount and on the `offline` event (0009 A). The gap was the **reload without network**: under CDP `onLine` reverts to true (0009 A7) and a page whose queries are all fresh has no failing fetch. Fix: the worker answers a navigation from its cache and, 1.5 s later, posts `{ type: 'dex:offline' }` to every window client; the banner listens. The failure key stays | The worker is the one thing that knows the page came from the cache; a phone in a dead zone with `onLine === true` is the same case |
| B9 | Every IDB call in `Queue.ts` races **5 s**; on a hang the row goes to `localStorage['dex.outbox.fallback']`, a warning logs once, and `load()` merges the snapshot back into IDB the moment it answers | A hang becomes a delay, never a lost sighting |
| B10 | `splash.jpg` and `splash-720.jpg` go into the version-free `dex-images` cache at install (`isImage` matches them too), **not the `_next/static` manifest** (`sw-manifest.mjs` untouched): the manifest is per build, the splash never changes. The avatar was already covered by the `/api/photo/` image rule | The precache list is for hashed files |
| B11 | One message per tap: a listed region already carries the "erst online laden" marker, so the tap only sets the line for an unlisted one | Brief |
| B12 | **Accepted, both.** The sighting drawer is modal by design (0014 B: it opens over the diary and closes back to it; a URL would make Back leave the diary). The species page is a leaf reached by a tap, its Back goes to the tab that opened it; a tab bar on a leaf would offer four exits from a page that has one | No fix |
| 0023-2 | `dex.groups` "Gruppen" → **"Arten"** / "Kinds"; `dex.groupTile` "Gruppe" → "Art" / "Kind"; "Gruppieren" with **"Fortschritt · Art · Keine"** stays | Owner decision |
| 0012 T4 | "Alles löschen" wiped `dex.queries` (`qc.clear()` triggers the persister) but **not the outbox**: `IdentityDelete.tsx` now calls `clearOutbox()` (new export of `Queue.ts`: rows, snapshot and the IDB store) | The brief asked to verify; it was half true |

## ✅ Checks

| # | Check | Evidence |
| --- | --- | --- |
| B1 | Atlas `main` has `safe-top pt-3`, `padding-top` 12 px on the desktop (inset 0), `li.atlas-group` `sticky`, `top: 0px`. Safari on the Simulator (iPhone 17 Pro): the sticky header sits under Safari's own toolbar, inset 0 there too | `b1.classes`, [`b-b1-simulator-safari-scrolled-de.png`](0025-shots/b-b1-simulator-safari-scrolled-de.png) · **the installed-PWA shot is the owner's P1** (Add to Home Screen by hand) |
| B2 | `Accessibility.queryAXTree`: **929 listitems, 3 headings** on the exploration grouping (932 `li` in the DOM, 3 presentational); per tile **929 / 7** (936 `li`); none **929 / 0**. The list's name is "929 Arten" / "929 species" | `b2.*`, [`b-b2-sticky-header-de.png`](0025-shots/b-b2-sticky-header-de.png) |
| B3 | Schagen folded: `inert`, **0 listitems, 1 button** (the header) in the tree; Mainz-Bingen open: 2 items, its folded rows inert; Schagen opened: `inert` false, 2 items | `b3.*` |
| B4 | Closed: "5 weitere Gruppen anzeigen", `aria-expanded=false`; open: "weniger", `aria-expanded=true`, 7 listitems | [`b-b4-profile-more-closed-de.png`](0025-shots/b-b4-profile-more-closed-de.png), [`-open-`](0025-shots/b-b4-profile-more-open-de.png) |
| B5 | Batch of two `setCounts`: **832 body bytes, 1 121 on the wire**, keys `region,total,byTile,seen,studied`, no `ids`. Cards vs SQL truth (identity A: Amsel + Grasfrosch wild, Rotkehlchen + Amsel studied): MB **2/929 · 2**, Schagen **2/902 · 2**, SWP **2/583 · 2**, `match: true`. `GroupRows.test.ts`: `rowsOf` keeps the enum order, drops empty tiles and equals `groupsOf` on the same set | `b5.requests`, `b5.match` |
| B6 | Contrast (WCAG relative luminance): `#a94c08` on white **5.64**, paper `#f5f2ea` **5.04**, amber-soft **4.51**, tile 4.36 (no text sits on a tile). Dark `#f0a030` on the dark surfaces **6.3–8.2**. White on brand amber **4.12**, white on brand moss **3.30** → axis radios on `#a94c08` **5.64** and `moss-deep` **5.02**. Live: profile number `rgb(169, 76, 8)`, dark `rgb(240, 160, 48)`, radio text white on the deep fill | `b6.*`, [`b-b6-profile-studiert-light-de.png`](0025-shots/b-b6-profile-studiert-light-de.png), [`-dark-`](0025-shots/b-b6-profile-studiert-dark-de.png), [`b-b6-atlas-dark-de.png`](0025-shots/b-b6-atlas-dark-de.png) |
| B7 | `dex.lookupRegion` forced to a 500 tRPC error via `Fetch.fulfillRequest`; the line reads **"Die Suche ist fehlgeschlagen. Tipp weiter, dann läuft sie erneut. · INTERNAL_SERVER_ERROR"** | [`b-b7-search-error-de.png`](0025-shots/b-b7-search-error-de.png) |
| B8 | Going offline (`Network.emulateNetworkConditions` on page and worker): banner after **5 ms atlas, 2 ms profile, 0 ms sighting**. Reload without network: `onLine` back to true, `fetch` fails, banner after **1 407 / 1 001 / 1 497 ms** (worker signal; the profile is faster because its `setCounts` refetch fails first). Before the fix the reloaded atlas and sighting showed none within 5 s | `b8.*`, [`b-b8-offline-atlas-de.png`](0025-shots/b-b8-offline-atlas-de.png) |
| B9 | `Queue.test.ts` (2 tests, `idb-keyval` mocked with promises that never settle, fake timers): a write lands in `dex.outbox.fallback` after 5 s and `load()` returns it; `clearOutbox()` drops both | `npm run check` |
| B10 | `dex-images` holds `/splash.jpg`, `/splash-720.jpg` and the avatar `/api/photo/<id>` after one online view (110 entries); offline profile: avatar `complete`, `naturalWidth` **720** | `b10.*`, [`b-b10-profile-offline-de.png`](0025-shots/b-b10-profile-offline-de.png) |
| B11 | Offline region sheet: 4 rows, Schagen and Südwestpfalz listed but not cached → **2 markers**; two taps on Schagen: still 2, `region-line` empty, sheet open | `b11.*`, [`b-b11-region-sheet-offline-de.png`](0025-shots/b-b11-region-sheet-offline-de.png) |
| T4 | Before: `dex.queries` **944 741** chars, outbox 1 row, snapshot present. After "Alles löschen" → confirm: `dex.queries` **gone**, outbox **0**, snapshot gone, `dex_id` changed, SQL identity row count **0** | `t4.*` |
| 0023-2 | Drawer sections **Region · Arten · Zeigen · Gruppieren · Sortierung**, chips **Fortschritt · Art · Keine** | [`b-drawer-de.png`](0025-shots/b-drawer-de.png) |

## 🤔 Doubts

| # | Doubt |
| --- | --- |
| D1 | `safe-top` sits only on the three tab pages. Settings, LogSearch and LogSave have headers with their own `pt-3` and no inset either; on an installed PWA their titles may sit under the status bar too. Owner's P1 tells |
| D2 | B8's worker signal is fired 1.5 s after the commit to every window. A second tab that is online sees the banner until its next successful query clears it; rare, self-healing |
| D3 | B5: `refetchOnMount: 'always'` costs one `setCounts` batch per profile visit (~1 KB). Without it a sighting logged since the last visit counts only after `staleTime` |
| D4 | B9: a `remove()` that hangs after a successful send leaves the row in the snapshot; the next `load()` resends it and the server dedupes on the client id (0009 A). Not tested here |
| D5 | B11's check needed the sheet opened once online: `dex.regions` is fetched by the sheet, not the profile. A user who never opened the sheet online sees "Einen Moment" offline (0018's own case) |
| D6 | `#a94c08` is a darker amber than the brand; the profile number and the atlas "studiert" label read as brown-orange next to the amber bars. Owner's eye |

## 🔀 For the merge

Rebase `sweep-b` on `main` (Tracks A and C are in). Expected conflicts: `de.json`/`en.json` (C2's habitat keys sit next to nothing of mine, but the files are shared), `package.json` none.

| File | In the list? | What |
| --- | --- | --- |
| `app/src/styles/tokens.css` | ✗ | `--color-amber-deep` in the light block and both dark blocks |
| `app/src/server/routers/dex.ts` | B5 allowance | `setCounts` shape `{ region, total, byTile, seen, studied }`, no `ids` |
| `app/src/components/Onboarding.tsx` | ✗ | B7 tail, `text-amber-deep`; the two over-splash errors on `text-[#f0a030]` (dark page in both schemes) |
| `app/src/components/RegionSheet.tsx` | ✗ | B11 one message per tap, `text-amber-deep` |
| `app/src/components/IdentityDelete.tsx` | ✗ | `clearOutbox()` on delete, `text-amber-deep` |
| `app/src/components/Journal.tsx` | ✗ | `safe-top`, `text-amber-deep` |
| `LadderSheet, IdentitySettings, SpeciesPage, LogSave, IdentityEmail, LogSearch, Fill, IdentityAvatar, LogSheet` | ✗ | `text-amber` → `text-amber-deep` only |
| `ProgressCard, AtlasGrid, SightingDetail, OfflineBanner, IdentityProfile, Queue.ts (+test), GroupRows.ts (+test), globals.css, sw.js` | ✓ | as above; `FilterDrawer.tsx`, `layout.tsx`, `sw-manifest.mjs` untouched |

i18n keys: **added** `dex.gridLabel`, `you.fewerGroups`; **changed** `dex.groups`, `dex.groupTile`, `you.moreGroups`, `you.allGroups`; removed none.

Not done here: the ROADMAP line and the struck-through lists in the original findings (coordinator).
