# 🗂️ 0023 · Grouping on the atlas — findings

> Built on branch `grouping` (worktree `../standkreis-dex-grouping`, Track C behind 0021 and 0022), 2026-09-07, from [handoff 0023](0023-atlas-grouping.md). Checks C1–C9 on the dev DB and the production build; C10 (the phone) is the owner's. Shots in [`0023-shots/`](0023-shots/), script `app/scripts/m23/grouping.mjs`.

## 🧭 Decisions the handoff left open

| # | Decision | Why |
| --- | --- | --- |
| 1 | The header sticks at **`top: env(safe-area-inset-top, 0px)`**, the viewport's top edge | G5 says "under the atlas header, the same top offset as the search bar", but nothing on the atlas is sticky: the search bar scrolls away and the FAB takes over (`AtlasGrid.tsx:174-180`, `249-252`). There is no offset to share, so the section header is the one thing that stays |
| 2 | One class, **`.atlas-group`** in `globals.css:11-13`: `position: sticky`, the top, `z-index: 10`, `grid-column: 1 / -1`, paper background, `0.5rem 0 0.25rem` padding | G8 wants the header in the same CSS grid; Tailwind's `col-span-full` alone would not carry the sticky top with the env() |
| 3 | Header = `<li data-testid="group-<key>" data-count="n">` with an `<h2>` inside, in the existing `<ul data-testid="grid">` | The `ul` is the grid; a header outside it would split the grid into one per section and lose G8's "one CSS grid". `data-group` on the `ul`, `data-count` on the header for the checks |
| 4 | Chips **Fortschritt · Gruppe · Keine** / **Progress · Group · None** under the title **Gruppieren** / **Group by** | "Exploration" is the owner's word, not the walker's; the sections it makes are Entdeckt · Studiert · Noch nicht, which is the progress bar's vocabulary. See doubt 2 |
| 5 | Section titles are three new keys `sectionSeen · sectionStudied · sectionNew` (Entdeckt · Studiert · Noch nicht), `showNew` stays "Noch nicht entdeckt" | The state chip needs the long form, the header the short one from the handoff's shape |
| 6 | The sections are cut **after** the existing pipeline (`tiles → chip → state → sort → search`), from `visible` (`AtlasGrid.tsx:152-166`) | G4 for free: whatever narrows or orders the grid today does the same inside every section. Out-of-set rows are split off first and trail (G6) |
| 7 | `exploration`: a species is `seen` if in `progress.seen`, else `studied` if in `progress.studied`, else `new` | G2 "seen wins". Seeded with Amsel both seen and studied: it sits in Entdeckt, Studiert counts 1 (C1) |
| 8 | `tile`: `allTiles` (the enum order bird → fungus) cut, empty keys skipped | G3's fixed order is the enum's. Fish is absent for Mainz-Bingen because the set has none, not by a rule |
| 9 | G8's "before" is **`?group=none` on this build**, not a second build of `main` | `none` renders the same DOM as before this handoff: one flat `ul` of 929 `li`, no header. Same device settings, same run, three repetitions each |
| 10 | The roadmap line goes into **"What earlier milestones changed"** as row `0023` | The roadmap has no polish section; that table is where 0018 put its atlas changes |
| 11 | The check drops the persisted query store (`localStorage.clear()`) before a navigation that follows a server-side `setFilter`, and runs the fresh identity in a second browser context | `staleTime` 60 s + persistence in `trpc/client.tsx:95`: the first run showed A's tiles and A's sections for changes made outside the page. A check artefact, not a bug: in the app the drawer writes the tiles through the same cache |

## 🛠️ What was built

| G | Where | Note |
| --- | --- | --- |
| G1 | `FilterDrawer.tsx:15-17` `Group`, `GROUPS`; `AtlasGrid.tsx:73` reads `?group`, `reset` clears it (`AtlasGrid.tsx:186`) | `exploration` is the default and never written to the URL (`onGroup`, `AtlasGrid.tsx:257`) |
| G2, G3, G4, G6 | `AtlasGrid.tsx:152-166` `sections` + `extras` | one `useMemo` after `visible`; `cut()` keeps the incoming order inside each key and drops empty keys |
| G5 | `AtlasGrid.tsx:233-244`, `globals.css:11-13` | `li.atlas-group.col-span-full > h2` uppercase 13 px, count in normal weight; no ancestor of the grid clips (C5 `clippingAncestors: []`) |
| G7 | `FilterDrawer.tsx:102-106`, `groupKey` | `Section` "Gruppieren" between Zeigen and Sortierung, `role="radio"`, `testId="group-<key>"`; `active` unchanged, so the badge ignores it |
| G8 | see C8 | no virtualisation, none was there; numbers below |
| G9 | `.atlas-group` has no transition (C5 `transitionDuration: 0s`); the chips are the existing `Chip` with `.motion-toggle` (C7 `0.15s`) | a regroup is one React commit, nothing animates |
| i18n | `de.json`, `en.json` `dex.*` | 7 keys each, after `showNew`: `group`, `groupExploration`, `groupTile`, `groupNone`, `sectionSeen`, `sectionStudied`, `sectionNew` |

## ✅ Checks

Production build (`next build` + `next start -p 3002` with the strict env: dev DB, `WEBAUTHN_RP_ID=localhost`, `WEBAUTHN_ORIGIN=http://localhost:3002`, a throwaway `WEBAUTHN_SECRET`, `PHOTO_DIR=/tmp/m23-photos`), headless Chrome 390 × 844 @2x over CDP, `LOCALE=de` and `LOCALE=en node scripts/m23/grouping.mjs ../docs/handoffs/0023-shots`. Identity A: Amsel and Grasfrosch wild, Rotkehlchen and Amsel studied (`seen 2 · studied 2 · overlap 1`). Identity B: fresh. Both in Mainz-Bingen, all tiles. Every number below is identical in de and en unless noted.

| # | Check | Evidence |
| --- | --- | --- |
| C1 | Default grid, identity A | Headers `seen · 2`, `studied · 1`, `new · 926`, sum **929** = set. Entdeckt = Amsel, Grasfrosch; Studiert = Rotkehlchen (Amsel, studied too, is in Entdeckt: seen wins). URL carries no `group`, no badge. [`c1-exploration-de.png`](0023-shots/c1-exploration-de.png), [en](0023-shots/c1-exploration-en.png) |
| C2 | Fresh identity B, own browser context | One header, `NOCH NICHT · 929` / `NOT YET · 929`, sum 929. [`c2-fresh-de.png`](0023-shots/c2-fresh-de.png), [en](0023-shots/c2-fresh-en.png) |
| C3 | `?group=tile`, reptile switched off through `identity.setFilter` | Headers `bird · 69`, `mammal · 8`, `amphibian · 7`, `insect · 429`, `plant · 388`, `fungus · 23` in the enum order (`fixedOrder: true`), reptile absent, fish absent, sum 924, badge `1` (the tile, not the grouping). [`c3-tile-de.png`](0023-shots/c3-tile-de.png), [en](0023-shots/c3-tile-en.png) |
| C4 | Order inside a section | `group=none` first 10: Turmfalke, Zilpzalp, Nosferatu-Spinne, Europäische Gottesanbeterin, Hauhechel-Bläuling, Gartenschläfer, Grüne Reiswanze, Braunbrustigel, Mauerfuchs, Gartenkreuzspinne. `exploration` Noch nicht first 10: the same list (`equalsNoneMinusSeenStudied: true`; the whole 926-id section equals the flat order minus the 3, `wholeSectionKeepsOrder: true`). `tile` Vögel (69 ids) equals the flat order filtered to birds (`equalsNoneBirds: true`). `?sort=name`: every section alphabetical (de: Amsel, Grasfrosch · Rotkehlchen · Achateule, Acker-Gauchheil, Acker-Gelbstern; tile: Amsel, Bachstelze · Braunbrustigel, Eurasisches Eichhörnchen · …), `?sort=name&group=tile` all 7 sections alphabetical |
| C5 | Sticky header, identity A, `group-new` | `position: sticky`, `top: 0px`, `grid-column: 1 / -1`, `z-index 10`, header width 358 = `ul` width 358, no clipping ancestor. Row height 141 px, 300 tiles = 14 100 px. `getBoundingClientRect().top` after `scrollTo`: y 0 → **532** (in flow), y 300 → **232**, y 3 000 → **0** (grid top −2 829), y 14 100 → **0** (grid top −13 929). [`c5-scrolled-de.png`](0023-shots/c5-scrolled-de.png) |
| C6 | Narrowed grids | `?show=seen` → one header `seen · 2` (Amsel, Grasfrosch). `?q=amsel` → one header `seen · 1` (Amsel); `?q=amsel&group=tile` → `bird · 1`; `?show=studied&group=tile` → `bird · 2` (Amsel, Rotkehlchen). [`c6-show-seen-de.png`](0023-shots/c6-show-seen-de.png), [`c6-q-amsel-de.png`](0023-shots/c6-q-amsel-de.png), en likewise |
| C7 | Drawer, back, reset | Drawer sections Region · Gruppen · Zeigen · **Gruppieren** · Sortierung; three chips `role=radio`, Fortschritt checked. Tap Gruppe → URL `/de?group=tile`, chips `tile=true`, **no badge**, 7 tile headers. Tap a species → `/de/species/9616058`; `history.back()` → `/de?group=tile`, the 7 tile headers again. Zurücksetzen → `/de`, chip Fortschritt checked, headers `seen · 2 · studied · 1 · new · 926`. Trail: `/de → /de?group=tile → /de/species/9616058 → /de?group=tile → /de`. [`c7-drawer-de.png`](0023-shots/c7-drawer-de.png), [en](0023-shots/c7-drawer-en.png) |
| C8 | Performance, see the table | 929 → 932 → 936 `li`; grid-up, FCP and the scroll do not move |
| C9 | `npm run check` | **exit 0**: typegen + tsc clean, eslint 0 errors (5 warnings, all in older scripts `m8b`/`steckbrief-probe`, the same 5 on `main`), vitest 9 files · 53 tests passed, export build with the worker manifest (19 files, 990 KB) |
| C10 | Owner on the phone | open; the sticky header on iOS Safari (D1) is the thing to look at |

### C8 · one build, three groupings, median of 3 (de run · en run)

`gridMs` = `Page.navigate` until `[data-testid=grid]` is in the DOM (the queries are persisted, so this is React's render of the set, not the network); `FCP` = `first-contentful-paint`; scroll = 30 `requestAnimationFrame` steps of 100 px (3 000 px), total ms and the longest frame.

| group | `li` | headers | grid-up ms | FCP ms | scroll 3 000 px ms | longest frame ms |
| --- | --- | --- | --- | --- | --- | --- |
| `none` (the pre-0023 DOM) | 929 | 0 | 82 · 75 | 100 · 44 | 473 · 477 | 18 · 18 |
| `exploration` | 932 | 3 | 89 · 87 | 44 · 56 | 483 · 479 | 18 · 18 |
| `tile` | 936 | 7 | 98 · 69 | 44 · 68 | 472 · 484 | 18 · 18 |

30 frames in ~475 ms is 16 ms a frame (60 Hz headless Chrome on the M-series Mac), no frame above 22 ms in any of the 18 runs. The spread between groupings (≤ 20 ms on grid-up) is inside the spread between repetitions of one grouping (58–107 ms). Nothing to virtualise on this evidence; the phone number is C10's.

## 🤔 Doubts for the owner

| # | Doubt |
| --- | --- |
| 1 | ~~**The sticky top on the phone.** The page has no safe-area top padding of its own (`main` is `pt-3`), so in the installed PWA the title scrolls under the status bar while the section header stops below it (decision 1). If that looks odd, the fix is one shared top inset on `main`, out of this build's file list~~ → fixed in 0025 (`safe-top` on the three tab pages without a header of their own: atlas, profile, diary) |
| 2 | **Gruppen · Gruppieren · Gruppe.** The drawer now has a "Gruppen" section (the tile filter) and a "Gruppieren" section with a chip "Gruppe" two blocks below. Same word, two meanings. Alternatives: chip "Nach Tiergruppe" is wrong for plants; "Gruppieren: Fortschritt · Tiere & Pflanzen · Keine"? Your call, one string each in `de.json`/`en.json` → accepted in 0025: the drawer's filter section renamed to "Arten" (Kinds), "Gruppieren" kept with chips "Fortschritt · Art · Keine" — ends the double meaning without a new word |
| 3 | **"Fortschritt" for the exploration axis.** Chosen over "Entdeckung" (misses studiert) and "Erkundung" (nobody says it). 0022 reworks the profile's progress; if that track settles on another word for the two axes, the chip should follow |
| 4 | ~~**Headers are list items.** A screen reader counts 932 items in the list, 3 of them headings. Semantically cleaner would be one `ul` per section under an `h2` outside, which breaks G8's single grid. Left as is~~ → fixed in 0025 (`li.atlas-group` gets `role="presentation"`, the `ul` gets an `aria-label` with the visible species count; 929 listitems, 3 headings) |
| 5 | **`sort=seen` inside Noch nicht** is the "jetzt" order (no `seenAt`, ties break by the server's order), same as before; inside Entdeckt it is the real order. Fine, just naming it |
| 6 | The handoff's parent link `0014-polish-findings.md` does not exist; the grid and drawer findings are [`0014-ui-second-pass-findings.md`](0014-ui-second-pass-findings.md) |
| 7 | The C5 sticky check ran in Chrome only; the iOS condition (no clipping ancestor) is verified, the Simulator was not driven. C10 |

## 🔀 For the merge

Branch `grouping`, one commit, after 0021 (`main`) and 0022 (`progress`).

| File | Change |
| --- | --- |
| `app/src/components/AtlasGrid.tsx` | `?group`, `sections`/`extras`, the header row, `reset`, drawer props |
| `app/src/components/FilterDrawer.tsx` | `Group`, `GROUPS`, `group`/`onGroup` props, the Gruppieren section, `groupKey` |
| `app/src/app/globals.css` | `.atlas-group` (3 lines before the motion block) |
| `app/src/i18n/de.json`, `app/src/i18n/en.json` | **shared with 0021/0022, merge by hand**: 7 keys in `dex` after `showNew` (`group`, `groupExploration`, `groupTile`, `groupNone`, `sectionSeen`, `sectionStudied`, `sectionNew`); nothing else in the files changed, `messages.test.ts` parity green |
| `app/scripts/m23/grouping.mjs` | the check |
| `docs/handoffs/0023-atlas-grouping-findings.md`, `docs/handoffs/0023-shots/*.png` (14) | this file, the shots |
| `docs/ROADMAP.md` | row `0023` in "What earlier milestones changed" |

Not committed: the worktree got a copy of `app/.env.local` (gitignored) so `next start` finds the API keys; the strict production env for a local `next start` is the line under §✅. Test identities A and B live in the dev DB only.
