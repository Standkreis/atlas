# Post-release cleanup handoff — 12 September 2026

Owner: Sven Reiser. Handoff delivery: [#110](https://github.com/Standkreis/atlas/issues/110).

## Next-session entry point

Sven requested a read-only review after #14, then authorized **one handoff and GitHub cleanup
issues**, with execution to start in another session. This delivery prepares the work only.
No cleanup issue has been implemented; no existing branch/worktree has been removed; no database
or production application change is part of this handoff. The only new branch/worktree is the
isolated documentation delivery for #110.

Start by reading root `AGENTS.md`, `app/AGENTS.md` for application work, and the
[GitHub skill](../../.agents/skills/standkreis-github/SKILL.md). Refresh live issue, branch and
worktree state before acting. **Do not start from or reset the dirty shared root checkout.**
Use current remote main and an isolated issue branch until root reconciliation is complete.
The issues below own acceptance criteria and current status; this file preserves review evidence.

## Reviewed baseline and release state

- Reviewed main: `c406409c167b104194a0d5dd805fb2282b3afa32`. Live remote main matched the cached
  remote ref on 12 September; root local main did not.
- #14 is Closed/Completed/Done. [Final closure evidence](https://github.com/Standkreis/atlas/issues/14#issuecomment-5646344905)
  records the exact-main Ready Production deployment and HTTP verification at 14:00:16.796 UTC.
- Shipped catalogue: 362 Kreisregionen, 6,874 taxa including six accepted hybrids, 36,338 eligible
  images, 214,321 regional memberships. There are 424 honest zero-image galleries.
- Frozen catalogue ID: `b59b97f4-6fdd-4900-a263-be2c05d78bbf`; run
  `germany-2016-2026-taxonomy-v2-20260909`; registry `de-krg-2024-12-31`.
- [Release record](../records/2026-09-11-germany-release.md) and
  [adopted Germany ADR](../adr/2026-09-11-germany-atlas.md) own acceptance and operational history.
  Application files at reviewed main are identical to the final hydration fix `49bbcf9`.
- Before this handoff, GitHub had four open issues (#10, #11, #67, #93), all Backlog epics, and
  no open PRs. The documentation task, cleanup issues and handoff PR are subsequent additions.

## Cleanup issues and suggested order

All seven cleanup issues were created in **Backlog**, without starting implementation. No
artificial blocking relationships were added: the order below is a recommendation, and a clean
isolated checkout allows correctness work without waiting for every old worktree to be removed.

| Order | Issue | Outcome / boundary |
| --- | --- | --- |
| 1 | [#111 — Workspace reconciliation](https://github.com/Standkreis/atlas/issues/111) | Preserve unique work and useful artifacts, reconcile root, remove only verified disposable branches/worktrees. |
| 2 | [#112 — Captured place on deferred sync](https://github.com/Standkreis/atlas/issues/112) | Keep a sighting's capture-time place when preferences change before sync. |
| 2 | [#113 — Plant wildness correction](https://github.com/Standkreis/atlas/issues/113) | Allow wild/cultivated corrections consistently on saved sightings. |
| 2 | [#114 — Germany progress after sync](https://github.com/Standkreis/atlas/issues/114) | Refresh national totals after relevant outbox success while Profile stays open. |
| 3 | [#116 — Workflow change detection](https://github.com/Standkreis/atlas/issues/116) | Ensure workflow-only changes execute the application verification job. |
| 3 | [#117 — Current operations guidance](https://github.com/Standkreis/atlas/issues/117) | Consolidate DEPLOY/ETL/roadmap current guidance while preserving history. |
| Before another catalogue refresh | [#115 — Legacy regional ETL guard](https://github.com/Standkreis/atlas/issues/115) | Prevent direct publication from bypassing active catalogue union/version consistency. |

The immediate recommendation is a bounded cleanup/correctness pass, not a general refactor.
The three runtime fixes affect existing functionality independently of rich sightings #10.
Resolve current behavior and meaningful regressions before broadening any issue.

## Workspace inventory and preservation exceptions

This is the read-only inventory **before #110's documentation worktree/branch was created**.
It is not a deletion manifest and must be refreshed in the cleanup session.

| Inventory | Observed |
| --- | --- |
| Worktree registrations | 66: 28 missing/prunable, 38 present including root |
| Present non-root worktrees | 37, all clean for tracked/untracked files |
| Directly delivered worktree heads | 31: 25 exact merged-PR heads, six main ancestors |
| Additional review helpers | Six; disposition below |
| Local branches | 66; 58 straightforward delivered candidates |
| Live remote branches | 49; 46 delivered candidates, main, two cancelled/unmerged branches |
| Non-root worktree disk usage | About 64.8 GiB from allocated-block sums; APFS reclaimed space may differ |

### Shared root: preserve and reconcile

`/Users/svenreiser/Documents/Develop/standkreis/atlas` was at local `main` (`bd5fbfa`),
18 commits ahead and 50 behind origin/main, with **85 modified tracked files and 102 individual
untracked files**. Ahead commits concern 0028 prose, handoffs, ladder layout and the September 8
roadmap. This is not evidence that 18 features remain unshipped: squash merges obscure ancestry.

Of 48 paths touched by the ahead commits, 24 exactly matched reviewed main. Of 186 dirty/untracked
non-environment paths compared, 120 exactly matched origin/main and 66 differed; none were absent
from origin/main. Preserve the differences and unpublished history before deciding what to discard.
Root also has ignored datasets, ETL/prose runs, drafts, images and environment/deployment
configuration. Inspect secret names/presence only; never include secret values in logs or evidence.

### Worktrees and helpers

The 28 missing registrations include an obsolete `/private/tmp/atlas-issue21`; the current
`atlas-worktrees/issue21` exists. Do not confuse registration pruning with deleting that live path.
Unless otherwise specified below, short names are under the sibling `atlas-worktrees/` directory.

| Helper | Evidence / disposition |
| --- | --- |
| `issue104-unicode-review-20260912` | Sole patch represented on the merged parent branch according to `git cherry`. |
| `issue63-store-scale` | Sole patch represented on the merged parent branch according to `git cherry`. |
| `issue21-cross-taxon-exclusions` | Sole patch represented on the merged parent branch according to `git cherry`. |
| `issue21-provenance-review` | Head is an ancestor of the merged issue21 branch; preserve/inventory its ignored ETL cache. |
| `/private/tmp/atlas-issue74-reviewfix.5GQZtX` | Compared with the merged issue74 head, only three files from the separately landed contrast fix differ. Repair appears incorporated; verify before disposal. |
| `issue21-http-review-fix` | Not an exact cherry match; subsequent changes obscure equivalence. Preserve until semantic verification settles it. |

Only four existing non-root worktrees had no ignored artifacts: `/private/tmp/atlas-epic14-closeout-20260911`,
`issue106-native-catalogue-replacement`, `issue28-plan`, and
`issue29-production-release-record-20260911`. The other 33 contain dependency/build outputs;
`issue21` and `issue21-provenance-review` additionally contain `app/etl/.cache/`.
Check ownership and useful ignored contents even when Git status is clean.

### Branch candidates

- Remote: 45 exact heads of merged PRs with merge commits reachable on main, plus the already
  ancestral `task/20-germany-galleries`, give 46 delivered candidates.
- Local: 49 exact merged-PR heads plus nine ancestors give 58 straightforward candidates. The
  nine ancestors are `grouping`, `m9b-grill`, `progress`, `prose-2`, `prose-grill`, `sweep-a`,
  `sweep-b`, `sweep-c`, and `task/20-germany-galleries`.
- Preserve/explicitly classify the cancelled or superseded branches
  `feature/6-species-image-galleries` ([PR #7](https://github.com/Standkreis/atlas/pull/7)) and
  `task/53-marine-taxon-filter` ([PR #55](https://github.com/Standkreis/atlas/pull/55)). They are
  not merged deliveries. WoRMS/habitat exclusion was cancelled, not a missing release step.
- Remaining local branches include main, those two experiments, `prose-a`/`prose-b` (ancestors
  of preserved local main), and repair/recovery helpers. Do not infer safe removal solely from
  ancestry or a closed issue.

## Code review findings and uncertainty

These are source-inspected findings at the pinned commit, **not newly browser-reproduced failures**.
The issues link exact source locations and own the detailed acceptance criteria.

1. **Wrong place after deferred save (#112).** `LogSave` queues capture-time place, but
   `Queue.send` omits it. `sighting.create` instead falls back to the identity's active region at
   synchronization time. With no GPS and a region change before sync, the persisted diary can show
   B for a sighting captured in A. This changes the place label, not coordinates or Germany territory
   evidence. Existing `journal.update` does not let the user correct place.
2. **Cultivated option disappears (#113).** `SightingDetail` offers cultivated only when the stored
   record already has that value, although capture maps kept plants to cultivated. A wild plant
   cannot be corrected; cultivated → wild → save prevents changing back through the editor.
3. **National totals miss synchronization (#114).** `QueueFlusher` invalidates regional progress and
   journal after successful queued sightings/studies, but not `identity.germanyProgress`. A Profile
   whose national request completes before a delayed flush can retain old totals until a later
   refetch trigger. Confirm the timing with a production-build browser regression.
4. **Legacy ETL can bypass catalogue consistency (#115).** `storedRegionTarget` rejects unprepared
   regions but accepts active German regions. Direct publication replaces Plausibility/Lookalike
   without changing the active CatalogueTaxon union/version. Changed provider membership can then
   diverge from national progress and cache versioning. No run was executed and no production drift
   was established; guard this route before another refresh.
5. **Workflow-only check skip (#116).** The workflow triggers on changes to itself, but its inner
   diff considers only app and `.nvmrc`; workflow-only changes therefore skip application checks.
   Preserve intentional agent-document/harness exclusions when correcting the scope.
6. **Conflicting current documentation (#117).** DEPLOY describes runtime region/content jobs and
   immutable private-photo caching, then correctly states CLI-only enrichment and private-photo
   `no-store` later. Its production-transfer entry still points at the superseded release route;
   ETL README calls the importer future work; ROADMAP retains a pre-release reliability handoff
   under a current heading. Consolidate active instructions rather than rewriting old evidence.

### Explicitly keep

- Checked importer/planner/audits: the successful
  [native replacement plan](../operations/2026-09-12-germany-native-replacement.md) uses the importer
  **locally** to build the frozen candidate. It is not dead code merely because direct production
  import timed out.
- Private release/recovery checkpoints, catalogue archives, receipts and hashed operator helpers.
  Inventory them without publishing private contents. The native plan records their roles.
- Dormant migrations/schema history and checked-in checksums; no schema deletion is cleanup scope.
- Historical scripts until callers are checked. `scripts/m8a/build-id.mjs` and `sw-manifest.mjs`
  remain invoked by package build scripts despite their historical directory name.

The one-time pre-alpha data-replacement waiver does not authorize another production replacement.
Local development/verification uses local Postgres. No catalogue enrichment, production model-key
usage or production data transformation is implied by these issues.

## Existing product backlog after cleanup

| Order | Epic | Next reviewable step |
| --- | --- | --- |
| 1 | [#93 — Species groups](https://github.com/Standkreis/atlas/issues/93) | Refresh its provisional baseline to the actual shipped catalogue, audit subgroup/source coverage, then settle the browsing contract. #14's release dependency is satisfied; do not jump directly to classification or UI implementation. |
| 2 | [#67 — External sources](https://github.com/Standkreis/atlas/issues/67) | Approximately ten-species local preview from the shipped catalogue. Catalogue-wide processing still requires Sven's explicit approval of that preview. |
| 3 | [#10 — Rich sightings](https://github.com/Standkreis/atlas/issues/10) | Set photo limits, ordering and offline lifecycle before implementation. Existing correctness fixes stay independently deliverable. |
| 4 | [#11 — Social discovery](https://github.com/Standkreis/atlas/issues/11) | Remains behind #10 and publishing/moderation decisions. |

No product epic was started, moved or rewritten by this handoff. Complete new facts/prose/sounds,
marine filtering and global coverage remain outside the shipped release and this cleanup scope.

## Verification and attribution

The review used live GitHub issues/board/PR/branch reads, Git worktree/status and commit/patch
comparisons, source inspection at the pinned main, and existing release/CI evidence. It did not run
fresh application builds, browser journeys, database checks or provider enrichment. Do not treat
the source review as a new production certification.

For the next session, run each issue's meaningful regressions and applicable gates from
`app/AGENTS.md`. Documentation-only handoff delivery uses whitespace/link review and repository
harness checks; application builds are unnecessary for this file alone. Issue #110's associated
delivery evidence belongs in its actual PR, not in a claim that cleanup has already happened.

Attribution: Codex primary agent; bounded read-only reviews by `code_review`, `etl_cleanup`, and
`worktree_inventory`. Handoff and issue creation by the primary agent.
