# 🗂️ [0023] Handoff — grouping on the atlas

> Build handoff. Owner's idea 2026-09-07: *"Group by … by exploration (entdeckt → studiert → grey), by group, no group."* Two corrections agreed the same night: grouping is a **third axis next to state and sort**, not a replacement, and the sort inside a group stays the chosen one, default "jetzt", never alphabetical by default.

| 🗓️ Written | 👤 Owner | ⬆️ Parent | ⏱️ Budget |
| --- | --- | --- | --- |
| 2026-09-07 | Sven Reiser | [Spec 0001](../specs/0001-standkreis-dex-the-first-walk.md) §🎨 atlas · [Findings 0005b](0005b-atlas-grid-findings.md)/[0014](0014-polish-findings.md) grid and drawer · `AtlasGrid.tsx:28-167`, `FilterDrawer.tsx` | 1 session, worktree `../standkreis-dex-grouping`, Track C behind 0021 (`main`) and 0022 (`progress`) |

---

## 🎯 Why

The grid is one flat wall of 929 tiles. The two axes of the product (studiert, entdeckt) are only visible as ring colours, and the seven tile groups only as a filter. Sections give the wall a shape without taking anything away.

## 📐 What to build

| # | Piece | Detail |
| --- | --- | --- |
| G1 | **The axis** | `group` in the URL next to `show` and `sort`: `exploration` (default, absent from the URL), `tile`, `none`. `GROUPS` exported from `FilterDrawer.tsx` like `SORTS`; the grid owns the state, the drawer reports taps, `reset` clears it |
| G2 | **Exploration** | Sections Entdeckt → Studiert → Noch nicht, a species in exactly one (seen wins over studied). From day one, even when the first two are empty: empty sections are **skipped**, never shown with 0 |
| G3 | **Gruppe** | Sections in the profile's fixed order: Vögel, Säugetiere, Amphibien, Reptilien, Fische (only when present), Insekten, Pflanzen, Pilze. Tiles switched off in the filter do not appear |
| G4 | **Inside a section** | The chosen sort applies unchanged: `now` default, `name`, `seen`. The state filter and the search narrow as today; a narrowed grid still shows its section headers (one header over one section is fine) |
| G5 | **Header** | Full-width row in the grid: title, count `· 2`, sticky under the atlas header (`position: sticky`, the same top offset as the search bar; check it on iOS Safari where sticky inside overflow needs the parent to not clip). Not collapsible. `data-testid="group-<key>"` |
| G6 | **Out-of-set finds** | The search's out-of-set results stay a trailing block after every section, as today, never inside one |
| G7 | **Drawer** | A third `Section` "Gruppieren" with three chips between state and sort, radio semantics like the others, `testId="group-<key>"`. The badge counts filters only; grouping, like sort, does not raise it |
| G8 | **Performance** | 929 tiles plus up to 8 headers in one CSS grid; headers `grid-column: 1 / -1`. Measure first paint and scroll on the production build before and after; if the grid is not virtualised today, do not add virtualisation in this build, note the numbers |
| G9 | **Motion** | Switching the grouping reflows without animation (reduced motion is the rule for 900 tiles); the drawer chips use the existing `.motion-toggle` |

## 🖼️ Shape

```
  ENTDECKT · 2                      ← sticky, full width
  [🦋][🌿]
  STUDIERT · 1
  [🌿]
  NOCH NICHT · 926
  [🐦][🐦][🦋][🌿] …               ← "jetzt" order inside
```

## 🔒 Rules

- No schema, no router change. `dex.set` and `identity.progress` untouched.
- Files: `AtlasGrid.tsx`, `FilterDrawer.tsx`, `de.json`, `en.json`, `globals.css` if the sticky header needs a class, the check script, docs. Nothing else. 0021 touches `SpeciesPage`, 0022 the profile; the only shared files are the two i18n JSONs, merged by hand on rebase.
- Never `prisma migrate reset`, `db push`, `migrate dev`. Never read or print `.env*` values. No push.

## 🧪 Checks

Script `app/scripts/m23/grouping.mjs` against the production build (`next start -p 3002`), shots to `docs/handoffs/0023-shots/`, de and en.

| # | Check | Evidence |
| --- | --- | --- |
| C1 | Default grid: three exploration sections with the right counts for a seeded identity (2 seen, 1 studied of 929); the sum equals the set | counts, shot |
| C2 | Fresh identity: only "Noch nicht · 929", no empty headers | shot |
| C3 | `?group=tile`: sections in the fixed order, a switched-off tile absent, fish absent for Mainz-Bingen | shot |
| C4 | Inside a section the order is the "jetzt" order (compare the first 10 taxon ids with `group=none`); `sort=name` alphabetises inside each section | id lists |
| C5 | Sticky header stays under the atlas header while scrolling 300 tiles (CDP `getBoundingClientRect` after `scrollBy`) | numbers |
| C6 | State filter Entdeckt + grouping exploration → one section; search `q=amsel` → headers only where results are | shots |
| C7 | Back button restores the grouping from the URL; `reset` returns to exploration | URL trail |
| C8 | Performance G8: first paint and a 3 000 px scroll, before/after, same device settings | ms |
| C9 | `npm run check` green | exit code |
| C10 | Owner on the phone | owner |

## ⬇️ Output

`docs/handoffs/0023-atlas-grouping-findings.md` (decisions, C1–C10, doubts, "For the merge" naming the i18n merge), `docs/ROADMAP.md` a line under polish. Commit on branch `grouping`; the owner merges after 0021 and 0022. Do not push.

## 🚫 Not in this build

Collapsible sections · virtualisation · alphabetical default · grouping on the diary · counts in the tab bar.
