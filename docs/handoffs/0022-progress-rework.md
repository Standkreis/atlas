# 📊 [0022] Handoff — the progress section, reworked

> Build handoff. Child of [findings 0018](0018-my-regions-findings.md) (several regions, one active) and the owner's annotated shot of 2026-09-07 00:50: *"too noisy … merge region and segmentation, collapsible, a global switch … progress per region."* Replaces the counters card and the groups card on the profile.

| 🗓️ Written | 👤 Owner | ⬆️ Parent | ⏱️ Budget |
| --- | --- | --- | --- |
| 2026-09-07 | Sven Reiser | [Spec 0001](../specs/0001-standkreis-dex-the-first-walk.md) §🧬 two axes · [Findings 0006](0006-etl-and-identity-findings.md) Du · [Findings 0018](0018-my-regions-findings.md) · `IdentityCounters.tsx`, `IdentityGroups.tsx`, `IdentityProfile.tsx:33-79`, `identity.progress`, `dex.set` | 1 session, worktree `../standkreis-dex-progress`, Track B behind 0021 on `main` |

---

## 🎯 Why

Today: one bar with two colours for the region, then seven groups with two hairline bars each. At 2 of 929 every track is empty decoration and the two axes fight for the same pixels. And the profile still shows one region while the identity has several.

## 📐 What to build

| # | Piece | Detail |
| --- | --- | --- |
| P1 | **One section, `ProgressCard.tsx`** | Replaces `CountersCard` and `GroupProgress` on the profile (delete both if nothing else imports them; `AtlasCounters.tsx` stays, it is the atlas header). `data-testid="progress"` |
| P2 | **Axis switch** | A segmented control at the top, `Entdeckt | Studiert`, `role="radiogroup"`, default Entdeckt, remembered in `localStorage['dex.progress.axis']`. It sets which axis every bar and every bold number show. The other axis stays visible as small text on the same line: `2 von 929 entdeckt · 1 studiert`. Colours: moss for Entdeckt, amber for Studiert, as everywhere |
| P3 | **One card per region** | For every id in `me.regionIds`, the active region first and open, the others collapsed to two lines (name, the counts line). Tap the header to open or close, `aria-expanded`, opening animates with the motion tokens of 0014b (`--motion-base`). Counts per region = intersection of the identity's studied and seen taxon ids with that region's set; "von n" is the set size for the identity's tiles (empty tiles = all). Reuse `identity.progress` (already returns both id lists) and a new light query `dex.setCounts({ regionId, tiles })` returning `{ total, byTile: { tile: n } }` without species rows, so opening a collapsed region does not pull 900 species |
| P4 | **Groups inside a card** | One row per tile with a count on the chosen axis: `Vögel  1 von 69 · 0 studiert`. One bar per row, one colour, the bar only when the share on the shown axis is **≥ 5 %**; below that the row has numbers only. Rows with 0 on both axes fold under one line `5 weitere Gruppen` (tap to expand). Fish stays hidden when the set has none, as today |
| P5 | **Region line** | The header of each card: name uppercase as today, then the counts line on the chosen axis. "Ganzes Jahr" goes; the "jetzt" filter is the atlas's business, not the profile's. If a region is not `ready`, the card says "wird vorbereitet" and nothing else |
| P6 | **Offline** | All three queries are in the persisted cache already (0018 R5); the switch and collapsing are client state, so the section works offline exactly as online. Verify |
| P7 | **Empty identity** | No sightings, no studies: the active card shows `0 von 929 entdeckt · 0 studiert`, the seven rows fold under `7 Gruppen`, and one grey line: "Trag eine Sichtung ein oder studiere eine Art, dann füllt sich das hier." |

## 🖼️ Shape

```
[ Entdeckt ● | Studiert ]

MAINZ-BINGEN                             ▾
2 von 929 entdeckt · 1 studiert
Vögel        1 von 69  · 0 studiert
Pflanzen     1 von 388 · 1 studiert
5 weitere Gruppen

SCHAGEN                                  ▸
0 von 902 entdeckt · 0 studiert

SÜDWESTPFALZ                             ▸
1 von 583 entdeckt · 0 studiert
```

## 🔒 Rules

- No schema change. No new router mutation. `identity.progress` and `dex.set` keep their contracts; only `dex.setCounts` is new.
- `AtlasGrid`, `FilterDrawer`, `RegionSheet` untouched: this is the profile only. Shared file with 0021 on `main`: none expected; if `de.json`/`en.json` conflict on rebase, keep both blocks.
- The i18n keys `you.studied`, `you.seen`, `you.possible`, `you.groups`, `you.ofPossible`, `you.wholeYear` are replaced, not left dangling.

## 🧪 Checks

Script `app/scripts/m22/progress.mjs` against the production build (`next start -p 3002`), shots to `docs/handoffs/0022-shots/`, de and en.

| # | Check | Evidence |
| --- | --- | --- |
| C1 | Identity with 3 regions, 2 sightings and 1 study: cards in the right order, counts per region match SQL (`Sighting ∩ set`) | table, shot |
| C2 | Switch to Studiert: every bar and bold number flips, the small text flips, colour amber, survives reload | shot before/after |
| C3 | Bar rule: a seeded identity with 10 % birds seen shows a bar on Vögel, none on a 1 % row | shot |
| C4 | Collapse/expand of a region and of "weitere Gruppen"; `aria-expanded`; `dex.setCounts` fires only on first open | network count |
| C5 | Offline: section identical from cache, switch works | shot |
| C6 | Empty identity, P7 | shot |
| C7 | `npm run check` green; `CountersCard`/`GroupProgress` gone or still imported elsewhere (say which) | exit code |
| C8 | Owner on the phone | owner |

## ⬇️ Output

`docs/handoffs/0022-progress-rework-findings.md` (decisions, C1–C8 with evidence, doubts, "For the merge" naming the files 0021 also touched), `docs/ROADMAP.md` a line under M7/M14 polish. Commit on the worktree branch `progress`; the owner merges after 0021. Do not push.

## 🚫 Not in this build

Atlas header counters · quests · XP · badges · the "jetzt" filter on the profile · share cards.
