# 📊 [0022] Findings — the progress section, reworked

> What was built for [0022](0022-progress-rework.md), with evidence. One session on the worktree branch `progress`, Track B behind 0021.

| 🗓️ Done | 👤 Agent | ⬆️ Handoff | 🧪 Checks |
| --- | --- | --- | --- |
| 2026-09-07 | Claude | [0022](0022-progress-rework.md) | C1–C7 ✅ · C8 owner |

## 🛠️ What was built

| # | Done | Where |
| --- | --- | --- |
| P1 | `ProgressCard.tsx` (`data-testid="progress"`) replaces `CountersCard` and `GroupProgress` on the profile. `IdentityCounters.tsx` and `IdentityGroups.tsx` **deleted** (no other importer); `useSetCounters` left `AtlasCounters.tsx` with them. `AtlasCounters.tsx` keeps `useAtlasSet`, `countersOf`, `CountersBar` for the atlas header | `ProgressCard.tsx` · `IdentityProfile.tsx:9-11,76` · `AtlasCounters.tsx` |
| P2 | Segmented control `role="radiogroup"`, two `role="radio"` buttons with `aria-checked`, moss for Entdeckt, amber for Studiert. The pick lives in `localStorage['dex.progress.axis']`, read through `useSyncExternalStore` (server renders "seen", the client takes the stored value on hydration; a module variable keeps the pick where localStorage refuses). The other axis is small text on the same line | `ProgressCard.tsx:18-27,44-52` |
| P3 | One card per entry of `me.regions`, the active one sorted first and open, the others folded to name and counts. Open/close on the header (`aria-expanded`, `aria-controls`), the body a CSS grid `0fr → 1fr` over `--motion-base` (`.fold`), the chevron turns in the same time, both zeroed under reduced motion. Membership: the active region from the grid's `dex.set` entry (no extra request), the others from the new **`dex.setCounts({ regionId, tiles })`** → `{ region, total, byTile, ids }` with the member ids per tile (~40 KB for 929 members, no names, images or month shares). Counts = `identity.progress` ∩ membership, the same `groupsOf` as before, through `membersOf` for the light shape | `dex.ts:121-138` · `GroupRows.ts:21-26` · `ProgressCard.tsx:60-70` · `globals.css` `.fold` |
| P4 | One row per tile on the identity's tiles, `Vögel  1 von 69 · 0 studiert`, the number bold in the axis colour. One bar in one colour, only when share ≥ 5 % on the shown axis (`barWidth`); rows at 0 on both axes fold under `n weitere Gruppen` (`n Gruppen` when every row folds), `aria-expanded`. Fish absent when the set has none (`setCounts` has no key for an empty tile, `set.tiles` drops it) | `GroupRows.ts:36-44` · `ProgressCard.tsx:112-150` |
| P5 | Header: name uppercase as before, then the counts line. "Ganzes Jahr" gone. A region not `ready` shows "wird vorbereitet" and nothing else (toggle disabled, no body) | `ProgressCard.tsx:76-84` |
| P6 | `['dex', 'setCounts']` joined `PERSISTED`; `dex.set`, `identity.progress`, `identity.me` were there. Verified in C5 | `trpc/client.tsx:30` |
| P7 | No sightings and no studies (identity-wide): `0 von 929 entdeckt · 0 studiert`, `7 Gruppen`, the grey hint line under the active card | `ProgressCard.tsx:89` |
| i18n | `you.wholeYear/studied/seen/possible/groups/ofPossible` **removed**; new `you.progress`, `axisSeen`, `axisStudied`, `seenOf`, `studiedOf`, `nOf`, `seenN`, `studiedN`, `moreGroups`, `allGroups`, `emptyHint` in both files | `de.json`, `en.json` |
| tests | `GroupRows.test.ts` gained `membersOf`, `regionOf`/`onTiles`, `barWidth`, `foldRows` (4 tests, 50 in all) | `GroupRows.test.ts:28-75` |

## 🗳️ Decisions the handoff left open

| Question | Decision | Why |
| --- | --- | --- |
| `setCounts` "without species rows" but the client must intersect | Returns `ids` per tile besides `total`/`byTile` | Without membership the numerators cannot be computed on the client, and the dex router stays identity-free (shared cache entry, persisted like `dex.set`). 929 UUIDs ≈ 40 KB against ~900 KB |
| When does `setCounts` fire | Once per non-active region **on mount**, never on a toggle | A folded card shows its counts line (the handoff's shape), so the data must be there before the first open. C4 counts it: 2 on the first profile load, 0 during six toggles |
| Rows for which tiles | The identity's filter tiles (empty = all), the same set the "von n" uses | The old groups card listed every tile while the counter counted the filter's; the header and the rows would not add up |
| Region-level bar | None | The shape has none, and the ≥ 5 % rule would hide it at 2 of 929 anyway |
| Which card carries the empty hint | The active one, when the identity has no studied and no seen id at all | "No sightings, no studies" is a property of the identity, not of a region |
| Fold state after a region switch | Cards without a tap follow "active = open" | `useState<boolean \| null>`: `null` means "as the role says", so the new active region opens and the old one folds without extra code |
| Tests seeded past the page | The check script clears `localStorage` before loading a second identity's profile | Out-of-band sightings do not invalidate the persisted `identity.progress` (60 s fresh); the app's own paths invalidate it (`SightingDetail`, `SpeciesPage`, `QueueFlusher`) |

## 🧪 Checks

Production build (`next build` + `next start -p 3002`, dev DB), headless Chrome 390 × 844 over CDP, `app/scripts/m22/progress.mjs`, de and en. Shots in `0022-shots/`. Numbers below from the de run; the en run gave the same numbers with English strings.

### C1 · three regions, two sightings, one study

Identity A: list `[Schagen, Mainz-Bingen, Südwestpfalz]`, Mainz-Bingen active. Seen wild: *Phoenicurus ochruros* (Mainz-Bingen ∩ Südwestpfalz), *Ailanthus altissima* (Mainz-Bingen only). Studied: *Nezara viridula* (Mainz-Bingen only).

| Card | Order | Open | Line | SQL `Sighting ∩ set` / `Study ∩ set` / set |
| --- | --- | --- | --- | --- |
| Mainz-Bingen | 1 (active) | ✅ | `2 von 929 entdeckt · 1 studiert` | 2 / 1 / 929 ✅ |
| Schagen | 2 | folded | `0 von 902 entdeckt · 0 studiert` | 0 / 0 / 902 ✅ |
| Südwestpfalz | 3 | folded | `1 von 583 entdeckt · 0 studiert` | 1 / 0 / 583 ✅ |

Rows on Mainz-Bingen: `Vögel 1 von 69 · 0 studiert`, `Insekten 0 von 429 · 1 studiert`, `Pflanzen 1 von 388 · 0 studiert`, then `4 weitere Gruppen`. Requests of the profile load: `dex.setCounts` **2** (Schagen, Südwestpfalz), `dex.set` 0, `identity.progress` 0 (the grid's entries, fresh). Old `[data-testid=groups|counters]` absent. Shot `c1-profile`.

### C2 · Studiert

| | Axis | Radios | Bold numbers | Lines | Stored |
| --- | --- | --- | --- | --- | --- |
| Before | seen | `true, false` | `rgb(21,128,61)` moss-deep | `2 von 929 entdeckt · 1 studiert` | – |
| After tap | studied | `false, true` | **`rgb(196,98,15)` amber** on all three cards | `1 von 929 studiert · 2 entdeckt` · `0 von 902 studiert · 0 entdeckt` · `0 von 583 studiert · 1 entdeckt` | `studied` |
| After reload | studied | `false, true` | amber | | `studied` |

Bars: none on either axis at these shares (rule C3). Shots `c1-profile` (before), `c2-studiert` (after).

### C3 · the bar rule

Identity B, 7 of 69 birds and 4 of 388 plants seen (SQL: 11 seen, 0 studied).

| Row | Share | `data-bar` | Bar element |
| --- | --- | --- | --- |
| Vögel `7 von 69` | 10.1 % | `10%` | ✅ `rgb(22,163,74)` moss |
| Pflanzen `4 von 388` | 1.0 % | `none` | – |

Line `11 von 929 entdeckt · 0 studiert`, `5 weitere Gruppen`. On Studiert every row is `none` (0 studied). Shot `c3-bars`.

### C4 · folds

| Step | Schagen `aria-expanded` · body height | Mainz-Bingen `aria-expanded` · more `aria-expanded` | `setCounts` requests |
| --- | --- | --- | --- |
| load | false · 0 px | true · false | 0 |
| open Schagen | true · 33 px | true · false | 0 |
| close Schagen | false · 0 px | true · false | 0 |
| open again | true · 33 px | true · false | 0 |
| more groups open | true · 33 px | true · **true** | 0 |
| more groups closed | true · 33 px | true · false | 0 |
| close Mainz-Bingen | true · 33 px | **false** · false | 0 |

`.fold` computed transition: `0.22s grid-template-rows` (= `--motion-base`). Shot `c4-folds-open`.

### C5 · without network

Persisted store before: `dex.set:Mainz-Bingen`, `dex.setCounts:Schagen`, `dex.setCounts:Südwestpfalz`, `identity.me`, `identity.progress`. Worker controlling, 3 worker sessions; `Network.emulateNetworkConditions offline` on the page and every worker, `fetch('/api/trpc/identity.me')` → "Failed to fetch".

| | |
| --- | --- |
| Profile after reload | up in **18 ms** from the shell cache |
| Cards (title, line, rows) | **identical** to the online render |
| Tap Studiert | axis `studied`, bold numbers amber on all three cards, stored |

Shot `c5-offline-studiert`.

### C6 · empty identity

Fresh identity, Mainz-Bingen only: `0 von 929 entdeckt · 0 studiert`, `7 Gruppen` (opened: Vögel, Säugetiere, Amphibien, Reptilien, Insekten, Pflanzen, Pilze, all `0 von n · 0 studiert`), hint "Trag eine Sichtung ein oder studiere eine Art, dann füllt sich das hier." Shot `c6-empty`.

### C7 · `npm run check`

Typecheck, lint (0 errors, 5 pre-existing warnings), **50 tests** in 8 files, export build: exit 0 (`/tmp/m22-check.log`). `CountersCard` / `GroupProgress`: **gone**, files deleted, no other importer (`grep` over `src` and `scripts`). `groupsOf` stays (the card and its test use it).

## ❓ Doubts for the owner

1. ~~**`setCounts` carries ids** (~40 KB per region), not just numbers. The alternative, counting the intersection on the server, puts the identity into a dex query and its cache entry; I kept the router pure. If the payload matters on the phone, `identity.progress` could grow a `byRegion` map instead — a contract change the handoff ruled out.~~ → fixed in 0025 (`setCounts` returns `{ region, total, byTile, seen, studied }`, computed on the server, no ids: 832 bytes for two regions instead of ~40 KB per region)
2. **Rows follow the filter tiles.** An identity that switched fungi off in the atlas sees no Pilze row on the profile and a smaller "von n". Consistent with the counter; the old groups card showed every tile. Say if the profile should ignore the filter. → accepted in 0025: unchanged, one truth for both counters, consistency beats completeness
3. ~~**The folded body is not `display: none`**: its rows stay in the accessibility tree while hidden at 0 fr. `aria-expanded` is right; a screen reader may still read the folded rows. `inert` on the body when closed would fix that in one attribute.~~ → fixed in 0025 (`inert` on the region body and the folded-rows fold)
4. ~~**The chevron on the region header points up when open** (rotated 180°), the same glyph as "n weitere Gruppen". Two chevrons per open card: fine at a glance in the shots, tell me if it is one too many.~~ → fixed in 0025 (the "n weitere Gruppen" row lost its chevron and became a text button)
5. **Schagen shows 8 groups** (it has 11 fish) while Mainz-Bingen shows 7: the fish rule per region works, but the number in "n Gruppen" differs between cards. Expected, noting it.
6. ~~**The offline banner was absent in C5** (`[data-testid=offline-banner]` null) although the page was offline. Not this build's business (0009/0012 own the banner); mentioned because the m18 script saw it.~~ → fixed in 0025 (the worker now posts an offline signal to every window on a cached navigation; the banner also listens for it)

## 🔀 For the merge

Branch `progress` on the worktree, one commit, based on `46e0ba6` (before 0021 landed on `main`). Files:

| File | Change |
| --- | --- |
| `app/src/components/ProgressCard.tsx` | new |
| `app/src/components/IdentityCounters.tsx`, `IdentityGroups.tsx` | deleted |
| `app/src/components/IdentityProfile.tsx` | imports, one `<ProgressCard />` |
| `app/src/components/AtlasCounters.tsx` | `useSetCounters` removed |
| `app/src/components/GroupRows.ts`, `GroupRows.test.ts` | `membersOf`, `onTiles`, `regionOf`, `barWidth`, `foldRows` + tests |
| `app/src/server/routers/dex.ts` | `setCounts` |
| `app/src/trpc/client.tsx` | `PERSISTED` + `['dex', 'setCounts']` |
| `app/src/app/globals.css` | `.fold`, `.fold-chevron`, reduced-motion list |
| `app/src/i18n/de.json`, `en.json` | the `you` block only |
| `app/scripts/m22/progress.mjs` | the check |
| `docs/ROADMAP.md` | one row after 0018 in "What earlier milestones changed" |
| `docs/handoffs/0022-progress-rework-findings.md`, `0022-shots/` | this |

**Shared with 0021 on `main`:** `de.json`/`en.json` (0021 edits the species keys, this the `you` block: keep both) and `docs/ROADMAP.md` (0021 changes the M9b row, this adds a row at the end of the table). Nothing else overlaps. `git merge-tree --write-tree main progress` after this commit: **clean, no conflicts** (tree `33d8931`). Still run `npm run check` on the merge: 0021's `de.json`/`en.json` and this build's `you` block never compiled together.
