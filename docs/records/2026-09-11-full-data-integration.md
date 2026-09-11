# Full-data integration fixture and lifecycle evidence

Issue: [#95](https://github.com/Standkreis/atlas/issues/95). Implementation: Codex agent.
Base: `084e0f612accbc339f88266f0ede34de7e57f4a2`, including #85 and #94.

## Boundaries

This change affects test fixtures and the integration test runner only. It does not
change catalogue membership, user-facing quotas, application timeouts, SQL migrations,
or production data. Final production/operator/client-transition acceptance remains
#29; a local seeded browser check is not production verification.

- Gallery tests temporarily select an owned active registry and catalogue with two
  owned member regions. Cleanup removes only their rows and restores each previously
  active registry/catalogue, including the catalogue's original `updatedAt`. All five
  gallery tests retain their filtering, shared-lead, relationship, drift, protected
  asset and 1,000-taxon × 12-image assertions.
- Cutover compatibility captures Mainz's original members and asserts their exact
  union with the added fixture, plus complete legacy/canonical response parity. The
  original 926 members and personal selections are not cleared.
- The prose fixture likewise owns active registry/catalogue membership for its two
  regions, preserving its concurrent-publication, foreign/missing-region and rejected
  publication assertions. Activation cleanup restores the previous active catalogue's
  exact `updatedAt` as well as status. These two named scope additions were confirmed
  on #95 after the first complete run exposed them.
- Reliability captures quota and pending-deletion before-images before each case.
  Only the exact shared global/day/month/network/mail keys used by the fixture are
  temporarily neutralized; newly created keys are identified by exact key difference,
  deleted by that explicit list, and original shared values/expiry restored. Every
  case verifies complete quota and pending-deletion digests after cleanup. A synthetic
  preserved tombstone also exercises this boundary on the empty seeded control.
  Existing pending objects are excluded from the real retry loop by a test-only
  selector; the test's own failed/retried deletion still uses that real loop.
  Storage/concurrency caps give fixture-sized headroom above existing bytes/tombstones
  and active leases. The real global-storage and per-identity rejection assertions
  remain, now checking distinct error bodies. Identity, asset and disk cleanup is
  restricted to owned IDs, with held scan work released and awaited in `finally`.

## Store deadlines and settlement

After #94, one full-data apply/verify/open/recover body measured **48.95 seconds**.
The largest store body exercises three cases. The 18 store tests therefore use a
test-only **180-second failure threshold** (the existing 10,000-key query retains
its shorter 30-second threshold). No production or global Vitest timeout changes.

The wrapper tracks and awaits the entire body before reporting either success,
failure, or deadline failure. Elapsed monotonic time also catches CPU-bound hashing
that delays timer delivery. A body exceeding its budget always fails, even if it
eventually succeeds; a late rejection preserves both failures. Cleanup explicitly
awaits tracked settlement. Native Vitest `timeout: 0` disables **only its competing
per-test abort race** for these 18 tests, not the wrapper's failure threshold.

`npm run test:integration` has a finite **30-minute process boundary**. A genuinely
non-settling body causes a nonzero failure and immediate POSIX process-group kill,
including workers, with no graceful window in which another test could start.
Discard the disposable run after this emergency boundary; do not reuse it as clean
evidence. This runner requires Linux/macOS, matching the repository's check hosts.
All 18 store bodies were inspected: they contain no held test latches. The two
reliability scan barriers release and settle in `finally`.

Five new unit tests cover late resolution with cleanup/next-test ordering, late
rejection, early body failure and ordinary success, child exit-code preservation,
and hard failure of an uncooperative child at the outer process deadline.

## Local verification

Node `24.15.0`; PostgreSQL 18 container `atlas-germany-rehearsal-pg18-20260911`,
local port 5434. No `.env` values, Neon, real provider/model calls, or source-dump
writes were used. All application/model/mail endpoints were local or stubbed.

The private immutable applied dump has SHA-256
`3b78b3ed27f1bed14b2700c92c605f6216ef543a2a3d4915823256b35f47b44b`.
It was restored into fresh owned `dex_check_issue95_*` databases; checked-in
migrations were applied with `prisma migrate deploy`, including #94's indexes.
There was no reset, schema push, migration generation, or deletion of original data.

| Gate | Result |
| --- | --- |
| Full-clone gallery/cutover/reliability, run 1 | 28/28, 5.71 s |
| Same full-clone suites, repeat | 28/28, 5.29 s |
| First fresh full-data complete integration | 97/98, 599.22 s; exposed prose fixture membership gap, no store timeouts |
| Full-data prose/activation repair check | 2/2, 1.22 s |
| Final fresh full-data complete integration at `1e2d47b` | **98/98, 16/16 files, no skips, 603.57 s** |
| Initial fresh seeded complete integration | 98/98, 14.05 s |
| Fresh final seeded complete integration at `1e2d47b` | 98/98, 14.14 s |
| `npm run check` | Typecheck, lint (six existing warnings), 563 unit tests, static export and production server build passed |
| Extra production analytics-context build | Passed |
| Seeded production-server `npm run test:browser` | Passed: locale/phone/desktop UX, offline/navigation, analytics privacy and catalogue transition checks |

`npm run check` passed again at `1e2d47b`, including all 563 unit tests and both
builds. Independent read-only reviews found no defects in the core implementation
or the two additional fixture repairs; the reviewer independently ran all five new
lifecycle/watchdog unit cases. No user-facing code changed after the browser pass.
The complete [PR CI workflow at code head `1e2d47b`](https://github.com/Standkreis/atlas/actions/runs/34619123181)
passed at 16:00:55 UTC, including fresh seeded integration, `check`, the production
analytics-context rebuild and browser suite. The same head's push workflow and
Vercel preview checks also passed; preview success is not production acceptance.

The first complete run also exposed an existing activation-fixture cleanup defect:
it restored the original catalogue's status but not `updatedAt`. The before/after
audit detected this drift; all other non-gate table digests matched. These failed
checks are diagnostic evidence, not a passing acceptance claim.

The previously browser-tested seeded database was not reused as final control:
the browser transition script leaves a different registry cohort, and a probe there
hit Germany-progress fixture setup's unique-version constraint (87 passed, 11 not
executed). That database was preserved, not cleared to manufacture a pass. Final
control uses normal setup/seed in new `dex_check_issue95_seed_final_20260911`.

The final gate exited zero at 16:06 UTC. Raw logs and checkpoints remain private
outside Git; [the curated before/after evidence](2026-09-11-full-data-integration-evidence.json)
contains counts and digests, not personal row contents.

From `app/`, the exact complete full-data invocation is:

```sh
DATABASE_URL=postgresql://dex:dex@localhost:5434/dex_check_issue95_final_20260911 npm run test:integration
```

This is the local disposable container's credential, not a production connection.
The integration config enforces a localhost `dex_check_*` database, serial files,
empty provider keys, local photo storage, and fixture quota settings. No test-name
filter, skip flag, custom timeout CLI flag or global timeout increase is used.
The fresh seeded control runs `db:check:setup`, `db:seed`, `test:integration`, then
`check` against `dex_check_issue95_seed_final_20260911` with the same local/stub
environment as `.github/workflows/check.yml` (local port 5434 instead of 5432).

## Final preservation result

All **33 non-gate public tables** have identical row counts and exact row-content
digests before/after the final 98-test run, including `_prisma_migrations` and the
empty write-admission table. The sole operational difference is
`CatalogueCutoverGate.updatedAt`; all its other fields also match exactly. No
maintenance state or owned admission remains behind.

The complete fixed **31-table protected target snapshot** independently reproduces
the original SHA-256 fingerprint:

```text
c243118fc884e513cc0e761700b5c9ff433b3ba5c3747d10784cc0333262f45d
```

This includes the original 85 identities, 29 sightings, 11 studies, 36,883 assets,
17 quota rows, four scan-work rows, active catalogue/registry metadata and the
full reference graph. The original empty pending-deletion table remains empty;
the reliability fixture additionally proved preservation of a pre-existing
synthetic tombstone during every case. The immutable source-dump SHA-256 was
rechecked unchanged. Owned disposable databases and private baseline checkpoints
were retained; no original personal record or source backup was removed.

Private evidence anchors: `/tmp/issue95-final-integration.log`,
`/tmp/issue95-final-before.txt`, `/tmp/issue95-final-after.txt`,
`/tmp/issue95-final-fingerprint.log`, `/tmp/issue95-fresh-final-seeded-integration.log`,
`/tmp/issue95-final-check.log`, and `/tmp/issue95-browser.log`.
