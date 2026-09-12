# Post-release workspace reconciliation — 12 September 2026

Owner: Sven Reiser. Delivery: [#111](https://github.com/Standkreis/atlas/issues/111).
This record covers filesystem/Git cleanup only. Runtime fixes belong to #112–#116 and operations
guidance to #117. No database mutation, enrichment or migration change is part of cleanup.

## Preservation and usable checkout

The root began at `bd5fbfa`, 18 unpublished commits ahead and 51 behind refreshed remote main
`fae0c81`. It had 85 modified tracked files and 102 individual untracked files. Before reconciliation,
120 non-environment changed paths matched main exactly, 66 differed, and `.env.example` was
classified as configuration. No different path was absent from remote main. Differences were
archived rather than inferred obsolete from squash ancestry.

The owner confirmed the older Codex session was finished. Root was reconciled through a named
stash and detached checkout/branch update, after verified backup; no blind reset or clean was used.
Root `main` now follows remote main. Its 18 unpublished commits remain reachable at
`recovery/111-root-pre-cleanup`; `prose-a`/`prose-b` remain too. The pinned stash lives at
`refs/cleanup-archive/111/root-stash` and its object ID is in recovery storage. Do not apply that
historical stash wholesale to current main; inspect the classified paths and restore deliberately.

Private recoverable storage is `../atlas-recovery/cleanup-20260912/` (mode 0700):

- `root-snapshot/`: 38,581 files, 2,303,697,461 logical bytes, individually SHA-256 checked against
  the originals. Includes dirty/untracked source, data/photos, ETL and probe caches, prose runs,
  drafts, walk images, environment presence and deployment/certificate configuration.
- `root-manifest.json`, `root-classification.json`: private path/hash/readback evidence;
  configuration contents are never printed or included here.
- `repository.bundle`, `repository-with-recovery.bundle`: verified Git bundles containing branch
  history and the pinned stash. Removed helper heads also retain `refs/cleanup-archive/111/<sha>`.
- Refreshed PR/remote/worktree/process inventories and deletion readbacks retain exact heads.

Regenerable dependency/build outputs were excluded from the root snapshot and retained in root.
All root valuable ignored artifacts remain in place as well as in the snapshot. Removed worktrees
contained only reviewed ignored outputs (`node_modules`, `.next`, `out`, generated Prisma/types
and TypeScript build state); these were removed by named path before ordinary `git worktree remove`.
No force worktree deletion or broad `git clean` was used.

## Ownership and retained exceptions

Process cwd checks preceded removal. Three existing local servers keep their worktrees:
`issue108-species-hydration`, `issue21-provenance-review`, and
`preview-germany-applied-main-20260911`. Their processes were not stopped.
`issue21` and `issue21-provenance-review` keep valuable `app/etl/.cache/` in place.
The HTTP review helper `issue21-http-review-fix` is retained: its bodyless-status validation is
present on main, but `git cherry` is nonidentical and the complete patch's equivalence is not
claimed. This is an intentional retained review artifact, not an unshipped fix assertion.

Cancelled experiments `feature/6-species-image-galleries` (PR #7) and
`task/53-marine-taxon-filter` (PR #55) remain local and remote. They are not counted as delivered.
The #93 agent independently created `issue93-species-groups-audit` /
`task/120-species-groups-audit` during this session; the user confirmed ownership. Cleanup's
fresh registration check stopped before that branch could be removed, and it is explicitly kept.
The active product issue and its PRs are outside this cleanup's ownership.

Private release artifacts are retained untouched, including
`../atlas-worktrees/recovery-germany-release-20260911-9iQvet/native-20260912-01`,
`../atlas-germany-recovery-20260910`, the three `../atlas-germany-recovery.*` directories,
`../recovery-20260910`, `../recovery-20260911`, and `../atlas-provider-ledgers`.
The native plan owns the archive/checkpoint hashes and operator roles. No archive, receipt,
provider ledger, importer/planner/audit code, migration checksum or historical asset was deleted.

## Refreshed per-item worktree decisions

Initial handoff-era inventory refreshed to 67 registrations (28 missing, 39 present including root).
The tables also include current-session worktrees present when classification ran. Missing
registrations were pruned independently of branch disposition; the missing `/private/tmp/atlas-issue21`
registration was not confused with the retained sibling `atlas-worktrees/issue21` directory.
Paths beginning `../` are relative to the root checkout; temporary worktrees retain absolute paths.

| Worktree | Head | Decision and evidence |
| --- | --- | --- |
| `../atlas` | `bd5fbfaf6e71` | reconcile: owner confirmed prior Codex session finished; verified backup required |
| `/private/tmp/atlas-cleanup-handoff.ujhKgi/worktree` | `91c29d607d50` | remove: merged PR #118; merge fae0c81e797f reachable on main |
| `/private/tmp/atlas-epic14-closeout-20260911` | `f096c457b87d` | remove: merged PR #100; merge c406409c167b reachable on main |
| `/private/tmp/atlas-issue-102` | `2873418f35f7` | remove: merged PR #103; merge e96544e5eb90 reachable on main |
| `/private/tmp/atlas-issue-15.K6rMzP` | `5c1172e1f0e1` | prune: missing worktree registration; branch disposition independent |
| `/private/tmp/atlas-issue-16.308rjJ` | `dd6d6a16133d` | prune: missing worktree registration; branch disposition independent |
| `/private/tmp/atlas-issue-17.64e2f78` | `090c71e98d33` | prune: missing worktree registration; branch disposition independent |
| `/private/tmp/atlas-issue-18.2OaAQcx` | `010d56a6753e` | prune: missing worktree registration; branch disposition independent |
| `/private/tmp/atlas-issue-19.785eb24` | `6e7142a9980a` | prune: missing worktree registration; branch disposition independent |
| `/private/tmp/atlas-issue-20.6d61520` | `785eb24a392f` | prune: missing worktree registration; branch disposition independent |
| `/private/tmp/atlas-issue-22.785eb24` | `7979d6444591` | prune: missing worktree registration; branch disposition independent |
| `/private/tmp/atlas-issue-23.NZR21G` | `4ea82bf7a8ed` | prune: missing worktree registration; branch disposition independent |
| `/private/tmp/atlas-issue-25.785eb24` | `8a2327c770e1` | prune: missing worktree registration; branch disposition independent |
| `/private/tmp/atlas-issue-27.TKOJrV` | `3c14e0e11beb` | prune: missing worktree registration; branch disposition independent |
| `/private/tmp/atlas-issue-34.785eb24` | `f240bc001e6c` | prune: missing worktree registration; branch disposition independent |
| `/private/tmp/atlas-issue-87` | `f251fe3c150a` | remove: merged PR #88; merge 36dbc46ac642 reachable on main |
| `/private/tmp/atlas-issue-91` | `45a6de27d25c` | remove: merged PR #92; merge 462f9b82e554 reachable on main |
| `/private/tmp/atlas-issue-98` | `b2c4ae188be8` | remove: merged PR #99; merge 1a6cce3cb968 reachable on main |
| `/private/tmp/atlas-issue21` | `be0804760844` | prune: missing worktree registration; branch disposition independent |
| `/private/tmp/atlas-issue24-onboarding` | `eb7f72412fb3` | prune: missing worktree registration; branch disposition independent |
| `/private/tmp/atlas-issue26` | `ae46f862c045` | prune: missing worktree registration; branch disposition independent |
| `/private/tmp/atlas-issue35.XFmG4n` | `1eea71e0f03e` | prune: missing worktree registration; branch disposition independent |
| `/private/tmp/atlas-issue36` | `cdbceb89fae2` | prune: missing worktree registration; branch disposition independent |
| `/private/tmp/atlas-issue37` | `a96e790dc15c` | prune: missing worktree registration; branch disposition independent |
| `/private/tmp/atlas-issue47` | `b7a5ac3cadaa` | prune: missing worktree registration; branch disposition independent |
| `/private/tmp/atlas-issue53` | `f02cd9b2ab13` | prune: missing worktree registration; branch disposition independent |
| `/private/tmp/atlas-issue57` | `ee51420cf97c` | prune: missing worktree registration; branch disposition independent |
| `/private/tmp/atlas-issue59` | `19525b4e208b` | prune: missing worktree registration; branch disposition independent |
| `/private/tmp/atlas-issue74-reviewfix.5GQZtX` | `11fa23cea84e` | remove: delivered issue74 tree differs only by separately merged contrast fix PR #78 |
| `/private/tmp/atlas-preview-germany` | `23304c19537e` | prune: missing worktree registration; branch disposition independent |
| `/private/tmp/standkreis-audit-onboarding.it43M7` | `278557f0ad70` | prune: missing worktree registration; branch disposition independent |
| `/private/tmp/standkreis-audit-release` | `54e452ef2645` | prune: missing worktree registration; branch disposition independent |
| `/private/tmp/standkreis-audit-wip.gXLRyT` | `9f796766537e` | prune: missing worktree registration; branch disposition independent |
| `/private/tmp/standkreis-branding-pr` | `4c442e7a62e8` | prune: missing worktree registration; branch disposition independent |
| `/private/tmp/standkreis-font-check` | `bd5fbfaf6e71` | prune: missing worktree registration; branch disposition independent |
| `/private/tmp/standkreis-images-handoff` | `b9d6cca582e8` | prune: missing worktree registration; branch disposition independent |
| `../atlas-worktrees/cleanup111-reconciliation` | `fae0c81e797f` | keep: current session worktree |
| `../atlas-worktrees/cleanup112-capture-place` | `fae0c81e797f` | keep: current session worktree |
| `../atlas-worktrees/cleanup113-plant-wildness` | `fae0c81e797f` | keep: current session worktree |
| `../atlas-worktrees/cleanup115-regional-guard` | `fae0c81e797f` | keep: current session worktree |
| `../atlas-worktrees/cleanup116-workflow-scope` | `fae0c81e797f` | keep: current session worktree |
| `../atlas-worktrees/cleanup117-operations` | `fae0c81e797f` | keep: current session worktree |
| `../atlas-worktrees/issue104-bounded-catalogue-transfer-20260912` | `b2d754c53bc2` | remove: merged PR #105; merge 8d6e464c47d6 reachable on main |
| `../atlas-worktrees/issue104-unicode-review-20260912` | `070113235577` | remove: all patches represented in delivered bug-fix/104-bounded-catalogue-transfer |
| `../atlas-worktrees/issue106-native-catalogue-replacement` | `670a79e65068` | remove: merged PR #107; merge 45239c589699 reachable on main |
| `../atlas-worktrees/issue108-species-hydration` | `99ec421cd83f` | keep: existing local server has cwd here; ownership retained |
| `../atlas-worktrees/issue21` | `be0804760844` | keep: valuable ETL cache retained in place |
| `../atlas-worktrees/issue21-cross-taxon-exclusions` | `d6c474076b2e` | remove: all patches represented in delivered task/21-german-catalogue-content |
| `../atlas-worktrees/issue21-http-review-fix` | `0904d4c8081c` | keep: nonidentical patch; preserve unresolved semantic review |
| `../atlas-worktrees/issue21-provenance-review` | `ae1fddba2729` | keep: existing local server has cwd here; ownership retained |
| `../atlas-worktrees/issue28-plan` | `9f851d769871` | remove: merged PR #84; merge a8aa2803eb6b reachable on main |
| `../atlas-worktrees/issue29-fixture-diag` | `ab87792fd556` | remove: ancestor of remote main |
| `../atlas-worktrees/issue29-production-release-record-20260911` | `201b16267899` | remove: merged PR #101; merge b656adfb6c43 reachable on main |
| `../atlas-worktrees/issue29-url-refresh-20260911` | `c0b9f7525868` | remove: ancestor of remote main |
| `../atlas-worktrees/issue60` | `67979d53bbeb` | remove: merged PR #66; merge d7555ff39bc4 reachable on main |
| `../atlas-worktrees/issue61` | `2c9205d11e92` | remove: merged PR #68; merge c4a199e6271c reachable on main |
| `../atlas-worktrees/issue62` | `f0bed86b965d` | remove: merged PR #69; merge 400c42ec070f reachable on main |
| `../atlas-worktrees/issue63` | `7ad461158635` | remove: merged PR #70; merge e187e759a62b reachable on main |
| `../atlas-worktrees/issue63-store-scale` | `2181756fdf3b` | remove: all patches represented in delivered task/63-checked-germany-cutover |
| `../atlas-worktrees/issue65` | `b3a1d40d25d5` | remove: merged PR #81; merge ab87792fd556 reachable on main |
| `../atlas-worktrees/issue71` | `b8288e875bef` | remove: merged PR #75; merge 56788470617d reachable on main |
| `../atlas-worktrees/issue72` | `16e5f4d84d5f` | remove: merged PR #76; merge 72ffe91050bd reachable on main |
| `../atlas-worktrees/issue73` | `bf8c6a0d9f3c` | remove: merged PR #79; merge 61a95c5abf46 reachable on main |
| `../atlas-worktrees/issue74` | `d3371c584ecf` | remove: merged PR #80; merge e94804c5b7bf reachable on main |
| `../atlas-worktrees/issue77` | `0c441e217946` | remove: merged PR #78; merge 71adb6340ce8 reachable on main |
| `../atlas-worktrees/issue85-fixture-isolation` | `909549f25963` | remove: merged PR #90; merge c0b9f7525868 reachable on main |
| `../atlas-worktrees/issue86-full-browser-20260911` | `ed749480d160` | remove: merged PR #89; merge 85c4a473ee65 reachable on main |
| `../atlas-worktrees/issue94-catalogue-scale-20260911` | `ac5459d2ad59` | remove: merged PR #96; merge 084e0f612acc reachable on main |
| `../atlas-worktrees/issue95-full-integration-20260911` | `449f3ede0c1e` | remove: merged PR #97; merge 7a777c172690 reachable on main |
| `../atlas-worktrees/preview-germany` | `400c42ec070f` | remove: ancestor of remote main |
| `../atlas-worktrees/preview-germany-applied-20260911` | `56788470617d` | remove: ancestor of remote main |
| `../atlas-worktrees/preview-germany-applied-main-20260911` | `c406409c167b` | keep: existing local server has cwd here; ownership retained |
| `../atlas-worktrees/release-germany-final-20260911` | `8d6e464c47d6` | remove: ancestor of remote main |

## Per-item local branch decisions

An exact merged PR head is eligible only when its squash merge commit is reachable on main.
Ancestry alone was not used to discard unpublished root history, cancelled experiments or active
session work. Expected old object IDs protected ref deletion. Recovery refs preserve removed heads.

| Local branch | Head | Decision and evidence |
| --- | --- | --- |
| `bug-fix/102-importer-transaction-budget` | `2873418f35f7` | remove: merged PR #103; merge e96544e5eb90 reachable on main |
| `bug-fix/104-bounded-catalogue-transfer` | `b2d754c53bc2` | remove: merged PR #105; merge 8d6e464c47d6 reachable on main |
| `bug-fix/104-unicode-review` | `070113235577` | remove: all patches represented in delivered bug-fix/104-bounded-catalogue-transfer |
| `bug-fix/108-species-hydration` | `99ec421cd83f` | keep: current, preserved unpublished, active, cached or cancelled work |
| `bug-fix/112-capture-place` | `fae0c81e797f` | keep: current, preserved unpublished, active, cached or cancelled work |
| `bug-fix/113-plant-wildness` | `fae0c81e797f` | keep: current, preserved unpublished, active, cached or cancelled work |
| `bug-fix/115-regional-catalogue-guard` | `fae0c81e797f` | keep: current, preserved unpublished, active, cached or cancelled work |
| `bug-fix/116-workflow-scope` | `5133f6a6f890` | keep: current, preserved unpublished, active, cached or cancelled work |
| `bug-fix/34-gbif-rate-limit` | `f240bc001e6c` | remove: merged PR #39; merge 9ff6f9f67c5a reachable on main |
| `bug-fix/47-resolve-doubtful-gbif` | `b7a5ac3cadaa` | remove: merged PR #49; merge 55cafe24ccd6 reachable on main |
| `bug-fix/57-onboarding-region-search` | `ee51420cf97c` | remove: merged PR #58; merge 5099472c0fcd reachable on main |
| `bug-fix/77-germany-progress-contrast` | `0c441e217946` | remove: merged PR #78; merge 71adb6340ce8 reachable on main |
| `bug-fix/91-bound-oversized-receipt-test` | `45a6de27d25c` | remove: merged PR #92; merge 462f9b82e554 reachable on main |
| `codex/standkreis-branding` | `4c442e7a62e8` | remove: merged PR #2; merge 151bcf481099 reachable on main |
| `feature/26-germany-progress` | `ae46f862c045` | remove: merged PR #42; merge 809e0c6f026e reachable on main |
| `feature/6-species-image-galleries` | `b9d6cca582e8` | keep: current, preserved unpublished, active, cached or cancelled work |
| `grouping` | `cf667bf51b6d` | remove: ancestor of remote main |
| `m9b-grill` | `058c2e5e947d` | remove: ancestor of remote main |
| `main` | `bd5fbfaf6e71` | keep: current, preserved unpublished, active, cached or cancelled work |
| `progress` | `16cc53b463c3` | remove: ancestor of remote main |
| `prose-2` | `e4f9d9f5284d` | remove: ancestor of remote main |
| `prose-a` | `e97256d03f7b` | keep: current, preserved unpublished, active, cached or cancelled work |
| `prose-b` | `9bb34eaf5925` | keep: current, preserved unpublished, active, cached or cancelled work |
| `prose-grill` | `7e51b427fa46` | remove: ancestor of remote main |
| `recovery/111-root-pre-cleanup` | `bd5fbfaf6e71` | keep: current, preserved unpublished, active, cached or cancelled work |
| `recovery/63-store-inbound-batches` | `2181756fdf3b` | remove: all patches represented in delivered task/63-checked-germany-cutover |
| `repair/74-operator-review-fixes` | `11fa23cea84e` | remove: delivered issue74 tree differs only by separately merged contrast fix PR #78 |
| `sweep-a` | `161ddd195413` | remove: ancestor of remote main |
| `sweep-b` | `0b3311fd1491` | remove: ancestor of remote main |
| `sweep-c` | `172a9d429236` | remove: ancestor of remote main |
| `task/106-native-catalogue-replacement` | `670a79e65068` | remove: merged PR #107; merge 45239c589699 reachable on main |
| `task/110-post-release-cleanup-handoff` | `91c29d607d50` | remove: merged PR #118; merge fae0c81e797f reachable on main |
| `task/111-workspace-reconciliation` | `fae0c81e797f` | keep: current, preserved unpublished, active, cached or cancelled work |
| `task/117-current-operations` | `fae0c81e797f` | keep: current, preserved unpublished, active, cached or cancelled work |
| `task/12-adhd-friendly-agent-output` | `1666ae82b145` | remove: merged PR #13; merge 62f78bc0e398 reachable on main |
| `task/120-species-groups-audit` | `fae0c81e797f` | keep: other active #93 session; user confirmed |
| `task/14-germany-atlas-closeout` | `f096c457b87d` | remove: merged PR #100; merge c406409c167b reachable on main |
| `task/15-germany-atlas-contract` | `5c1172e1f0e1` | remove: merged PR #30; merge 3c18a2871923 reachable on main |
| `task/16-german-region-registry` | `dd6d6a16133d` | remove: merged PR #31; merge 64e2f7896ab8 reachable on main |
| `task/17-composite-region-calculation` | `090c71e98d33` | remove: merged PR #32; merge 6d61520d9c3f reachable on main |
| `task/18-nationwide-etl` | `010d56a6753e` | remove: merged PR #33; merge 785eb24a392f reachable on main |
| `task/19-germany-index-audit` | `6e7142a9980a` | remove: merged PR #50; merge c4fca71c5ce7 reachable on main |
| `task/20-gallery-closeout` | `6c21df184f91` | remove: merged PR #52; merge da0a20abdd88 reachable on main |
| `task/20-germany-galleries` | `785eb24a392f` | remove: ancestor of remote main |
| `task/21-german-catalogue-content` | `be0804760844` | keep: current, preserved unpublished, active, cached or cancelled work |
| `task/22-region-search` | `7979d6444591` | remove: merged PR #40; merge 4e3b4d693ddb reachable on main |
| `task/23-reusable-region-picker` | `4ea82bf7a8ed` | remove: merged PR #43; merge 67bcbb0a1959 reachable on main |
| `task/24-welcome-region-discovery` | `42af0bcb5cff` | remove: merged PR #46; merge eb7f72412fb3 reachable on main |
| `task/25-profile-region-management` | `8a2327c770e1` | remove: merged PR #54; merge 2ad232abb275 reachable on main |
| `task/27-germany-profile-progress` | `3c14e0e11beb` | remove: merged PR #48; merge 1241032fdd32 reachable on main |
| `task/28-reviewed-production-migration-plan` | `9f851d769871` | remove: merged PR #84; merge a8aa2803eb6b reachable on main |
| `task/29-production-release-record` | `201b16267899` | remove: merged PR #101; merge b656adfb6c43 reachable on main |
| `task/35-ordered-licensed-gallery-storage` | `1eea71e0f03e` | remove: merged PR #41; merge eb35e07c48f6 reachable on main |
| `task/36-global-gallery-enrichment` | `cdbceb89fae2` | remove: merged PR #44; merge 72796aba8f4c reachable on main |
| `task/37-gallery-read-contract` | `a96e790dc15c` | remove: merged PR #45; merge 5db62a6f805a reachable on main |
| `task/38-accessible-offline-gallery` | `c7f5007a59b1` | remove: merged PR #51; merge bbd5b17a7f82 reachable on main |
| `task/4-atlas-docs` | `3fd60aff3e77` | remove: merged PR #5; merge d1d6a0afc3a8 reachable on main |
| `task/53-marine-taxon-filter` | `f02cd9b2ab13` | keep: current, preserved unpublished, active, cached or cancelled work |
| `task/59-preview-migration-guard` | `19525b4e208b` | remove: merged PR #64; merge 23304c19537e reachable on main |
| `task/60-dormant-migration-history` | `67979d53bbeb` | remove: merged PR #66; merge d7555ff39bc4 reachable on main |
| `task/61-preserve-target-galleries` | `2c9205d11e92` | remove: merged PR #68; merge c4a199e6271c reachable on main |
| `task/62-safe-catalogue-cutover` | `f0bed86b965d` | remove: merged PR #69; merge 400c42ec070f reachable on main |
| `task/63-checked-germany-cutover` | `7ad461158635` | remove: merged PR #70; merge e187e759a62b reachable on main |
| `task/65-privacy-safe-analytics` | `b3a1d40d25d5` | remove: merged PR #81; merge ab87792fd556 reachable on main |
| `task/71-validate-frozen-catalogue` | `b8288e875bef` | remove: merged PR #75; merge 56788470617d reachable on main |
| `task/72-plan-catalogue-target` | `16e5f4d84d5f` | remove: merged PR #76; merge 72ffe91050bd reachable on main |
| `task/73-guarded-catalogue-store` | `bf8c6a0d9f3c` | remove: merged PR #79; merge 61a95c5abf46 reachable on main |
| `task/74-checked-catalogue-transfer-operator` | `d3371c584ecf` | remove: merged PR #80; merge e94804c5b7bf reachable on main |
| `task/8-audit-reliability-ux` | `4c7e2174484e` | remove: merged PR #9; merge 54e452ef2645 reachable on main |
| `task/85-fixture-isolation` | `909549f25963` | remove: merged PR #90; merge c0b9f7525868 reachable on main |
| `task/86-full-catalogue-browser` | `ed749480d160` | remove: merged PR #89; merge 85c4a473ee65 reachable on main |
| `task/87-remediate-tooling-dependency-advisories` | `f251fe3c150a` | remove: merged PR #88; merge 36dbc46ac642 reachable on main |
| `task/94-catalogue-scale-overhead` | `ac5459d2ad59` | remove: merged PR #96; merge 084e0f612acc reachable on main |
| `task/95-full-integration-fixtures` | `449f3ede0c1e` | remove: merged PR #97; merge 7a777c172690 reachable on main |
| `task/98-release-spot-checks` | `b2c4ae188be8` | remove: merged PR #99; merge 1a6cce3cb968 reachable on main |

## Per-item remote branch decisions

Remote deletion used explicit expected-head leases and was verified by a separate `ls-remote`.
The two cancelled branches and main remain. New cleanup/other-session branches are not legacy
cleanup candidates; their post-merge disposition is recorded in the session inventory below.

| Remote branch | Head | Decision and evidence |
| --- | --- | --- |
| `bug-fix/102-importer-transaction-budget` | `2873418f35f7` | remove: merged PR #103; merge e96544e5eb90 reachable on main |
| `bug-fix/104-bounded-catalogue-transfer` | `b2d754c53bc2` | remove: merged PR #105; merge 8d6e464c47d6 reachable on main |
| `bug-fix/108-species-hydration` | `99ec421cd83f` | remove: merged PR #109; merge 49bbcf9e6f39 reachable on main |
| `bug-fix/112-capture-place` | `fae0c81e797f` | keep: ancestor of remote main |
| `bug-fix/113-plant-wildness` | `fae0c81e797f` | keep: ancestor of remote main |
| `bug-fix/115-regional-catalogue-guard` | `fae0c81e797f` | keep: ancestor of remote main |
| `bug-fix/116-workflow-scope` | `fae0c81e797f` | keep: ancestor of remote main |
| `bug-fix/47-resolve-doubtful-gbif` | `b7a5ac3cadaa` | remove: merged PR #49; merge 55cafe24ccd6 reachable on main |
| `bug-fix/57-onboarding-region-search` | `ee51420cf97c` | remove: merged PR #58; merge 5099472c0fcd reachable on main |
| `bug-fix/77-germany-progress-contrast` | `0c441e217946` | remove: merged PR #78; merge 71adb6340ce8 reachable on main |
| `bug-fix/91-bound-oversized-receipt-test` | `45a6de27d25c` | remove: merged PR #92; merge 462f9b82e554 reachable on main |
| `codex/standkreis-branding` | `4c442e7a62e8` | remove: merged PR #2; merge 151bcf481099 reachable on main |
| `feature/26-germany-progress` | `ae46f862c045` | remove: merged PR #42; merge 809e0c6f026e reachable on main |
| `feature/6-species-image-galleries` | `b9d6cca582e8` | keep: not merged |
| `main` | `fae0c81e797f` | keep: ancestor of remote main |
| `task/106-native-catalogue-replacement` | `670a79e65068` | remove: merged PR #107; merge 45239c589699 reachable on main |
| `task/110-post-release-cleanup-handoff` | `91c29d607d50` | remove: merged PR #118; merge fae0c81e797f reachable on main |
| `task/111-workspace-reconciliation` | `fae0c81e797f` | keep: ancestor of remote main |
| `task/117-current-operations` | `fae0c81e797f` | keep: ancestor of remote main |
| `task/12-adhd-friendly-agent-output` | `1666ae82b145` | remove: merged PR #13; merge 62f78bc0e398 reachable on main |
| `task/14-germany-atlas-closeout` | `f096c457b87d` | remove: merged PR #100; merge c406409c167b reachable on main |
| `task/15-germany-atlas-contract` | `5c1172e1f0e1` | remove: merged PR #30; merge 3c18a2871923 reachable on main |
| `task/16-german-region-registry` | `dd6d6a16133d` | remove: merged PR #31; merge 64e2f7896ab8 reachable on main |
| `task/17-composite-region-calculation` | `090c71e98d33` | remove: merged PR #32; merge 6d61520d9c3f reachable on main |
| `task/18-nationwide-etl` | `010d56a6753e` | remove: merged PR #33; merge 785eb24a392f reachable on main |
| `task/19-germany-index-audit` | `6e7142a9980a` | remove: merged PR #50; merge c4fca71c5ce7 reachable on main |
| `task/20-germany-galleries` | `785eb24a392f` | remove: ancestor of remote main |
| `task/21-german-catalogue-content` | `be0804760844` | remove: merged PR #56; merge c48d7d5c1009 reachable on main |
| `task/22-region-search` | `7979d6444591` | remove: merged PR #40; merge 4e3b4d693ddb reachable on main |
| `task/23-reusable-region-picker` | `4ea82bf7a8ed` | remove: merged PR #43; merge 67bcbb0a1959 reachable on main |
| `task/24-welcome-region-discovery` | `42af0bcb5cff` | remove: merged PR #46; merge eb7f72412fb3 reachable on main |
| `task/25-profile-region-management` | `8a2327c770e1` | remove: merged PR #54; merge 2ad232abb275 reachable on main |
| `task/28-reviewed-production-migration-plan` | `9f851d769871` | remove: merged PR #84; merge a8aa2803eb6b reachable on main |
| `task/29-production-release-record` | `201b16267899` | remove: merged PR #101; merge b656adfb6c43 reachable on main |
| `task/35-ordered-licensed-gallery-storage` | `1eea71e0f03e` | remove: merged PR #41; merge eb35e07c48f6 reachable on main |
| `task/36-global-gallery-enrichment` | `cdbceb89fae2` | remove: merged PR #44; merge 72796aba8f4c reachable on main |
| `task/37-gallery-read-contract` | `a96e790dc15c` | remove: merged PR #45; merge 5db62a6f805a reachable on main |
| `task/4-atlas-docs` | `3fd60aff3e77` | remove: merged PR #5; merge d1d6a0afc3a8 reachable on main |
| `task/53-marine-taxon-filter` | `f02cd9b2ab13` | keep: not merged |
| `task/59-preview-migration-guard` | `19525b4e208b` | remove: merged PR #64; merge 23304c19537e reachable on main |
| `task/60-dormant-migration-history` | `67979d53bbeb` | remove: merged PR #66; merge d7555ff39bc4 reachable on main |
| `task/61-preserve-target-galleries` | `2c9205d11e92` | remove: merged PR #68; merge c4a199e6271c reachable on main |
| `task/62-safe-catalogue-cutover` | `f0bed86b965d` | remove: merged PR #69; merge 400c42ec070f reachable on main |
| `task/63-checked-germany-cutover` | `7ad461158635` | remove: merged PR #70; merge e187e759a62b reachable on main |
| `task/65-privacy-safe-analytics` | `b3a1d40d25d5` | remove: merged PR #81; merge ab87792fd556 reachable on main |
| `task/71-validate-frozen-catalogue` | `b8288e875bef` | remove: merged PR #75; merge 56788470617d reachable on main |
| `task/72-plan-catalogue-target` | `16e5f4d84d5f` | remove: merged PR #76; merge 72ffe91050bd reachable on main |
| `task/73-guarded-catalogue-store` | `bf8c6a0d9f3c` | remove: merged PR #79; merge 61a95c5abf46 reachable on main |
| `task/74-checked-catalogue-transfer-operator` | `d3371c584ecf` | remove: merged PR #80; merge e94804c5b7bf reachable on main |
| `task/8-audit-reliability-ux` | `4c7e2174484e` | remove: merged PR #9; merge 54e452ef2645 reachable on main |
| `task/85-fixture-isolation` | `909549f25963` | remove: merged PR #90; merge c0b9f7525868 reachable on main |
| `task/86-full-catalogue-browser` | `ed749480d160` | remove: merged PR #89; merge 85c4a473ee65 reachable on main |
| `task/87-remediate-tooling-dependency-advisories` | `f251fe3c150a` | remove: merged PR #88; merge 36dbc46ac642 reachable on main |
| `task/94-catalogue-scale-overhead` | `ac5459d2ad59` | remove: merged PR #96; merge 084e0f612acc reachable on main |
| `task/95-full-integration-fixtures` | `449f3ede0c1e` | remove: merged PR #97; merge 7a777c172690 reachable on main |
| `task/98-release-spot-checks` | `b2c4ae188be8` | remove: merged PR #99; merge 1a6cce3cb968 reachable on main |

## Counts, disk measurement and session inventory

Legacy cleanup removed **33 present worktrees**, pruned **28 missing registrations**, removed
**60 verified delivered/incorporated local branches** and separately verified removal of
**47 remote branches**. The 33 deleted directories measured 54,580,616 KiB allocated beforehand
(52.05 GiB). APFS cloning/snapshots and concurrent agent builds mean that number is not a promise
of physical reclaim. Filesystem available space rose from 19,419,424 KiB to 66,284,340 KiB at the
post-worktree-removal reading, a measured increase of 44.69 GiB; this includes concurrent activity.

## Final session inventory (2026-09-12T16:16:07.300347+00:00)

All seven worktrees created by this cleanup session are accounted for below. Removed session
worktrees passed fresh clean-tree/process-cwd checks, exact merged-PR head and merge reachability
verification. Their remote branches were deleted with expected-head protection and read back.

| Issue / PR | Session worktree under `../atlas-worktrees/` | Head / merge | Disposition |
| --- | --- | --- | --- |
| #112 / [PR #122](https://github.com/Standkreis/atlas/pull/122) | `cleanup112-capture-place` | `b359a2801490` / `8ce5b3acbac8` | Removed; local and remote branches removed |
| #113 / [PR #124](https://github.com/Standkreis/atlas/pull/124) | `cleanup113-plant-wildness` | `c56a16424442` / `47b19cea7341` | Removed; local and remote branches removed |
| #114 / [PR #129](https://github.com/Standkreis/atlas/pull/129) | `cleanup114-progress-sync` | `23e2e7f1b3d1` / `b51bfcb70576` | Removed; local and remote branches removed |
| #115 / [PR #125](https://github.com/Standkreis/atlas/pull/125) | `cleanup115-regional-guard` | `9e78b9516c4e` / `d1606a6dfa59` | Removed; local and remote branches removed |
| #116 / [PR #119](https://github.com/Standkreis/atlas/pull/119) | `cleanup116-workflow-scope` | `5133f6a6f890` / `f0c74601a347` | Removed; local and remote branches removed |
| #117 / [PR #123](https://github.com/Standkreis/atlas/pull/123) | `cleanup117-operations` | `3c9a469e6ed4` / `c8966900a577` | Removed; local and remote branches removed |
| #111 / [PR #126](https://github.com/Standkreis/atlas/pull/126) | `cleanup111-reconciliation` | This record’s PR head | Keep clean local review worktree and branch; delete its remote branch after checked merge |

This brings actual removals to **39 present worktrees** (33 legacy + six session),
**28 stale registrations**, **66 local branches** (60 legacy + six session), and
**53 remote branches before #126 closes** (47 legacy + six session).
After #126 merges, its own expected-head remote deletion brings that total to **54**;
the final delivery readback records that last action.

At this inventory read there are **8 present worktrees**, **11 local branches** and
**6 live remote branches**. All registrations exist; root is clean on current main.
The finalizer removes only #126’s remote branch, leaving 5 live remote branches.
The resulting local worktrees are:

| Retained worktree | Reason |
| --- | --- |
| `../atlas` | Clean, usable root main checkout |
| `../atlas-worktrees/cleanup111-reconciliation` | Clean local reconciliation review record |
| `../atlas-worktrees/issue108-species-hydration` | Existing local server |
| `../atlas-worktrees/issue21` | Valuable source ETL cache |
| `../atlas-worktrees/issue21-http-review-fix` | Retained HTTP helper; full patch equivalence unproven |
| `../atlas-worktrees/issue21-provenance-review` | Existing local server; provenance tree also retains ETL cache |
| `../atlas-worktrees/issue93-species-groups-audit` | Separate active #93 session; now owns #120 and #121 branches/PRs |
| `../atlas-worktrees/preview-germany-applied-main-20260911` | Existing local server |

The concurrently created `task/121-species-groups-browse-contract` is retained alongside
`task/120-species-groups-audit`; both belong to the other #93 session. Its single worktree
changed branches during cleanup. Neither branch/PR was reviewed, merged or removed by cleanup.
The root recovery, two prose and two cancelled experiment branches remain unchanged.

Final measured filesystem availability is **73,522,028 KiB**, a **51.60 GiB**
increase from the initial reading. This is a filesystem delta during concurrent agent work,
not an isolated APFS reclaim claim. Private `verification-evidence/` retains 269 files
(49,090,905 bytes) of this session’s local logs/screenshots; all copied hashes match originals.
Its manifest is separate from the 38,581-file root snapshot. `repository-final.bundle` additionally
pins both initial and final inventoried worktree heads, including stale detached registrations,
through recovery refs; it was refreshed after final inventory review.

The five disposable local verification databases are retained for reproducibility:
`dex_check_cleanup112`, `dex_check_cleanup112_browser`, `dex_check_cleanup113_20260912`,
`dex_check_cleanup115`, and `dex_check_cleanup115_staging` on local Postgres. No production
data was transformed and no enrichment or production model key was used.

Final combined application verification for the separately delivered runtime issues passed on
#114’s checked head: **625 unit tests**, **109 local Postgres integration tests**, both builds,
and the full production-browser suite (EN/DE capture-place, plant wildness and mounted Profile
sync, analytics privacy, offline worker/cache and identity isolation). #111 itself is documentation
and operational cleanup only: harness structure/link checks and all **36 harness tests** pass.
Production verification is separately recorded by exact-main deployment, alias and read-only
HTTP/health checks; local mutation regressions are not represented as production data operations.

There are no unresolved cleanup blockers. Retained ambiguous/active artifacts are intentional,
with disposition stated above. Attribution: Codex primary agent; implementation/reviews by
`sighting_sync`, `plant_wildness`, and `etl_ci`. The #93 session is independently owned.
