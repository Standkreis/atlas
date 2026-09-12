# 🚢 Germany Atlas: pre-alpha native database replacement

Owner: Sven Reiser. [#106](https://github.com/Standkreis/atlas/issues/106), execution in
[#29](https://github.com/Standkreis/atlas/issues/29), within [Epic #14](https://github.com/Standkreis/atlas/issues/14).

**Prepared under the owner's 12 September replacement authorization; native rehearsal and independent
review are pending. This draft is not evidence of execution.**

## 🧭 Decision and authority

On 12 September Sven explicitly directed a strategy reassessment after three failed production
transfers and reiterated that this pre-alpha has no real users: production data may be removed or
replaced even if it is not restorable. The existing 11 September migration approval authorized the
Germany release and its maintenance fence; this new direction permits replacement rather than
making exact preservation of current personal state a cutover prerequisite.

This is a dated replacement of the transfer/preservation/recovery portions of the
[11 September plan](2026-09-11-germany-production-migration-plan.md), not a silent rewrite.
Historical importer receipts and rollback proofs remain evidence. The user has authorized the
replacement outcome, not inspected future artifact hashes; the operator must verify those exact
bindings and the independently reviewed procedure before acting.

Keep unchanged: 6,874 taxa (six accepted hybrids), 362 Kreisregionen, local regional denominators,
Germany progress rules, all scientific/catalogue/licensing decisions, 36,338 qualified source images,
maximum twelve gallery images, honest missing-content coverage, and actual production acceptance.
Optional new Wikipedia/Steckbrief/voices remain follow-ups. No new paid service or external executor.

## 🔬 Why native restore

Three production importer attempts failed on aggregate interactive-transaction deadlines. On the
third, improved bounded batching still reached 606.624 seconds against a 600-second transaction
limit. It attempted 539,571 mutation rows in 130 DML calls; the last call was rejected as expired.
Independent comparison proved all 31 product tables exactly matched the fresh backup afterward.
The previous service was restored at 11:38:47 UTC. This is not a licensing, catalogue or UI defect.

Build the complete publishable state locally, where the checked importer already succeeds. Transfer
that state with PostgreSQL18 native archive/COPY tooling instead of regenerating and comparing a
634 MB mutation receipt over the production connection. Native restore does not run inside Prisma's
600-second transaction. We are not increasing that application timeout or removing its safety checks.

A plain `TRUNCATE` followed by data-only COPY is not selected: `Identity.avatarAssetId → Asset.id`
and `Asset.ownerId → Identity.id` form a non-deferrable foreign-key cycle. A complete native
pre-data/data/post-data restore loads rows before rebuilding and validating constraints. No trigger
disabling or superuser workaround is needed.

## 🎯 Exact replacement boundary

- Existing Standkreis Vercel project `prj_QkDLo33iixnovjvg5ozYMwBzen9e`, team
  `team_4rVdNuX63Z4XJLBmTsz8GUUa`, existing Neon integration and database `neondb`.
- Resolve the unpooled target from its configured environment and require exact equality to the
  previously approved target descriptor. Never print credentials or accept a generic arbitrary URL.
- Replace only the reviewed application's public-schema objects contained in the native archive:
  application tables and their data, enums, indexes, constraints, the region-summary function and
  exact completed `_prisma_migrations` history. Final inventory and archive hash are mandatory below.
- Preserve the `public` schema itself and its owner/grants. Do not use `DROP SCHEMA ... CASCADE`.
  Do not change roles, extensions or their member objects, provider/internal schemas, database
  settings, integrations, external storage, other databases or other Neon branches.
- No new migration is introduced. Restored schema and the sixteen completed migration names and
  SQL checksums must match the checked release. Future additive changes still run through Vercel.
- Later production personal changes may be discarded by the replacement. This includes progress,
  filters and authentication records changed since the source backup. Users may have to begin again.
  Do not promise exact preservation or automatic inverse to newer production state.
- Existing Blob/reference URLs and rich content from the chosen backup are retained in the candidate.
  Do not copy/delete image or audio bytes, run media cleanup, or use production model keys.

## 🧱 Candidate and native rehearsal

1. Start a new owned local PG18 database from the immutable fresh attempt03 production backup,
   SHA-256 `cf88588605d076df775b10eb03923fbe24e44a79dcacf4ce0a7efee0cf4b41a7`.
   Its 34-table verification covers 92 identities, 1,784 Assets and 24,954 taxa. Do not use a developer
   database, an integration fixture database or a browser-mutated preview as the publishing source.
2. Run the checked, current-head importer **locally only**, using the immutable reviewed Germany
   artifacts and fresh deterministic release-image report. Retain source/config/plan/receipt pins.
   Independently verify the applied candidate, including all 6,874 gallery receipts and rich/audio
   preservation from that source. No tests or browser journeys may mutate this candidate afterward.
3. Inspect its exact public object inventory, extension membership, constraints, indexes and completed
   migrations. Create a private native archive with PG18, no source ownership or ACL restoration.
   Reject unreviewed objects rather than using broad schema/database deletion.
4. Restore the archive into a new empty local database and also rehearse clean replacement of an
   owned old-baseline clone with a non-superuser restoring role that owns the application objects
   and has schema CREATE permission, matching the required production privileges. Use the exact
   chosen production flags and timeout semantics. Compare
   all 34 table fingerprints, schema/function/index/constraint definitions, valid constraint/index
   state and migrations with the audited candidate. Record actual bytes and timings.
5. Freeze and hash the archive. Store a second verified persistent copy outside Git with private
   permissions. Keep native archive, source audit and restored-copy evidence together; they bind
   the actual data, not merely a moving local database name.

## 🔒 Production operation

Before execution, #106's plan/rehearsal PR must have a deliberate independent review, applicable
document checks and a checked merge. #29 remains open. Verify the deployed application code matches
the checked schema/API contract and freeze deployments/migrations and other direct writers.

Use the existing [project-wide maintenance fence](germany-production-http-fence.md), newly bound to
the actual current disabled configuration and immutable deployments. Attempt03 ended at disabled
version4; never rerun its exclusive activation wrapper that assumes version3. Retain the exact sole
deny rule semantics, no bypasses and no unrelated draft. Complete the full **1,830-second drain
after fresh fence verification**, then inspect direct database activity. A failed check blocks replacement, not an
excuse to weaken the fence.

The prior authenticated two-Production-URL responses may be retained as **historical functional
proof** of the exact retained rule, with their original timestamps. Reuse requires verifying the same
project/environment coverage, rule payload/version, protection and bypass invariants, paired with
fresh live configuration, current public/Preview `403` plus `mitigated=deny` and no-invocation evidence.
Never manufacture new owner observations. For a docs-only deployment, independently verify the same
runtime tree/configuration and its project/environment; historical proof is not a direct owner test
of that new URL. Any material enforcement drift requires new functional verification.

Bind an exclusive native-operation intent to the owner directive, checked code, exact target,
archive SHA/size, complete object inventory, source/restored-copy proofs and actual fence evidence.
The restored candidate must contain an open catalogue gate and zero write admissions; the HTTP
fence remains active through native commit and independent readback.

Generate native SQL from the frozen archive with `pg_restore --clean --if-exists --single-transaction
--no-owner --no-privileges --file=RAW_SQL`, without `--create` or parallel jobs. TOC validation rejects
SCHEMA, ACL, extension or unsupported objects and ownership-changing commands. Ordinary owner
metadata on legitimate TOC entries is not an ownership command and is not rejected. If a selected
TOC list is necessary, enumerate/hash it and use it identically in rehearsal and production.

PG18's native restore preamble explicitly resets statement, lock, idle-transaction and transaction
timeouts to zero: `PGOPTIONS` alone does **not** enforce those bounds. A reviewed streaming helper
changes only the exact four initial preamble reset statements, before any DDL/COPY, to **1,800,000 ms
statement / 30,000 ms lock / 180,000 ms idle-transaction / 3,600,000 ms transaction**. Missing or
unexpected header shape fails closed. Hash both SQL files and prove the entire post-header body is
byte-identical; do not perform global replacements that could alter COPY data or function text.

Execute that exact bounded native SQL using PG18 `psql -X --set=ON_ERROR_STOP=on --file=BOUNDED_SQL`
against the resolved direct target. The SQL already contains native BEGIN/COMMIT; do not add another
psql transaction wrapper. Record a separate 60-minute operator watchdog. Rehearse the exact SQL and
timeout enforcement under the non-superuser role before production. A lost connection or watchdog
cancellation near commit requires outcome inspection, not an automatic retry.

The single transaction contains dropping/recreating only the reviewed objects, COPY and constraint
creation. Do not invoke Prisma reset, db-push or migrate-dev. Stream native data; do not reconstruct
a mutation plan on production. Native archive and bounded SQL are private, hash-bound release artifacts.

Retain private stderr and aggregate phase/time/byte observations. Report numerical progress from
actual completed tables or bytes where available, not an invented percentage. Do not keep polling
large snapshots or send upstream biodiversity API requests during transfer.

## ✅ Readback, reopening and delivery

Before lifting the HTTP fence, independently compare all 34 application-table fingerprints to the
frozen native source, plus schema/migration checksums, valid indexes/constraints, open gate/zero
admissions, 362 selectable regions, 6,874 union taxa, 214,321 memberships, 151,680 lookalikes and all
gallery receipts. Internal storage totals are not user-facing denominators.

Restore the prior disabled/zero-rule firewall semantics using only the reviewed temporary rule.
Verify actual public/Preview health and build identity, then run the prepared production media,
onboarding/Profile/search/progress/offline and analytics journeys. Existing complete local UI,
build, integration, cache-transition and scientific/licensing evidence remains required. The owner
did not waive product correctness merely by permitting pre-alpha user-data loss.

Complete #29 only when actual transfer, readback, production journeys and its release record pass.
Complete Epic #14 only after its own outcome review and ADR. This plan and a successful local restore
do not by themselves close either issue.

## 🧯 Failure handling under the new authority

Single-transaction native restore is chosen to avoid exposing a partially rebuilt schema, not to
promise preservation of newer pre-alpha progress. On errors or connection loss, keep maintenance
active and inspect the actual outcome before another command. Never infer commit from a dump file,
absent CLI output or a partially written log. Compare to the candidate or known old state as needed.

The previous exact mutation-receipt inverse is **not** the recovery mechanism for this replacement.
If the target is wrong or incomplete, the authorized recovery is correction of the cause and another
reviewed restore of the same frozen candidate. Do not restore newer personal data or broaden the
target by guesswork. Existing backup evidence is retained, but producing an exact reconstruction of
all later production user changes is not a release requirement.

## 📎 Rehearsal and review evidence — pending

Populate this section with the exact final candidate, native archive, object counts, fingerprints,
copy verification, timeout settings, measured native restore results and independent review before
marking this plan executable. Raw personal data and credentials stay outside Git.
