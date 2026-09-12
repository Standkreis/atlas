# 🚢 Germany Atlas: pre-alpha native database replacement

Owner: Sven Reiser. [#106](https://github.com/Standkreis/atlas/issues/106), execution in
[#29](https://github.com/Standkreis/atlas/issues/29), within [Epic #14](https://github.com/Standkreis/atlas/issues/14).

**Prepared under the owner's 12 September replacement authorization. Both native rehearsals and
independent operator review passed; execution requires this plan's checked merge and fresh production
preflight after the full drain. This record is not evidence of production execution.**

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

## 📎 Rehearsal and review evidence — 12 September

Checked application commit: `8d6e464c47d68ed45689600b4968e75f5bfe0d74`. The source was built in a
new local `dex_check_issue29_native_candidate_20260912_01` from the backup pinned above. Local plan
and apply exited zero in 176.104 and 417.256 seconds. Independent applied audit passed all catalogue,
gallery and preservation checks; fixed development identities, negative test taxon keys, fixture
catalogues/sources and example.test assets were absent. Candidate state is frozen, not a preview DB.

| Artifact | Bytes / result | SHA-256 |
| --- | --- | --- |
| Independent local applied audit | Passed | `b337ea2fde6ac7d805a2f0fe79db3068db1c5675a12a41c8b98c1e6b47590ee1` |
| Final application archive | 87,757,467 | `02f81429a0aa8a77c97fe7d1309793a65157f7a021b44df6692ebe94658fdeb0` |
| Archive TOC | Exact inventory below | `21d3e9f499690e60af0ba36ba739effefd8e396d852dc48ce403a69c05523e92` |
| Raw native SQL | 435,123,835 | `bbea19162c2a01fffc04221ddb0d37ff270bf6e29a01df57380ed5d48b175548` |
| Bounded native SQL | 435,123,856 | `b8e9d2873ca630f56646ef3b11dae49d868ad45246385e6d0efa85c158725f29` |
| Unchanged post-header SQL body | 435,123,497 | `e9f1a3fa07589508744d471971b39b09bfec34080adbd3e2b7f263723e9b89f0` |
| Frozen candidate snapshot v2 | 242,814 | `62d20ce73629c1870dac338d1a7e10dd0125559bd4bf8309156903d7f5f6282e` |
| Empty native restore snapshot v2 | All 34 tables and raw schema equal | `94fad34fd56a44d367a56a0047af483b978cc7bc23e17c75feb8ea1c1a213019` |
| Restricted replacement before | Old-state local clone | `4ac23b65b3e5172d6273e6e1f4216838fd440dd292155c891e6db58a8608640c` |
| Restricted replacement after | All 34 tables equal candidate | `62e189562dc6e158037f574158e7f90bb1b397450df15051b9149d983955a754` |
| Persistent checkpoint manifest | 6,074; 18 payload files | `1b80776cc8fc6764299f027173300b63e1e3ffae53150e1f48a48b54cd47d32c` |
| Detailed rehearsal report | Commands and timings | `ab30194f00aaa10c2a460a97095d34619a767b83f67b154f4e95e20fcf859b67` |

The private persistent checkpoint is `atlas-worktrees/recovery-germany-release-20260911-9iQvet/native-20260912-01`
outside Git: 1,593,117,253 payload bytes, directory 0700 and files 0600. Every destination was
hash-reread and fsynced; the directory was fsynced. The rejected earlier schema-scoped archive is
not included. No credentials or personal rows are published here.

Final TOC inventory: **13 types, one function, 34 tables, 34 table-data entries, 34 constraints,
68 indexes and 51 foreign keys**. There are no schema, ACL, ownership-changing, extension, comment
or sequence entries. The 34 application tables contain 1,085,601 stored rows; this is not a species
denominator. The audited candidate contains 362 canonical German regions (363 total stored regions),
6,874 German taxa, 214,321 regional memberships, 151,680 lookalikes, 36,338 eligible images and
6,874 gallery receipts. Existing content retained from the source includes 34,104 rich values,
3,586 nonempty names, 1,784 Assets and all 24,954 prior global taxa; final storage is 36,881 Assets
and 27,467 global taxa. Gate open, zero admissions.

Native empty restore passed in **8 seconds**. Clean replacement of an old-baseline clone using the
exact bounded SQL passed in **7.69 seconds** under an object-owning role with NOSUPERUSER,
NOCREATEDB, NOCREATEROLE, NOREPLICATION and NOBYPASSRLS. These are local timings, not a production
runtime promise. All 34 table digests matched the candidate, all 51 foreign keys were valid and
nondeferrable, and before/after schema/security metadata were identical. The Identity/Asset
SET NULL/CASCADE cycle was exercised inside a rolled-back transaction; final counts were unchanged.

The four-header-line transformer passed 18 tests and root review. Its SHA-256 is
`fc0638506f68a6644abec63ec826f668c1cc1d62124503a9b5b3149b7c88f4a9`.
The native operator wrapper, SHA-256
`ea9a82ee5c5a0cdd658a0d35f2c3bdec00555bbb3029d13fdaf93f9267edbc1e`, passed independent
review and four stubbed failure/success simulations. No simulation connected to production.
Review findings concerning native timeout resets, cyclic foreign keys, credential-safe errors,
freshness after the live firewall read and child-process supervision were resolved before this record.

### 🔎 Production preflight: physical slots are not logical schema

Read-only Production inspection confirms the expected PG18 object-owning principal, schema CREATE
and USAGE, 136 public tables/indexes, no applicable default grants, and all sixteen finished migration
SQL checksums. Source-to-Production logical application schema matches after normalizing the expected
owner (`dex` to `neondb_owner`). The only additional difference is ten historical dropped-column
slots: Filter four, Identity one, Plausibility four, Taxon one. All 311 visible columns retain their
names, types, defaults, nullability, collation and relative order.

Native recreation intentionally compacts those invisible physical ordinals. Pre-validation compares
visible columns using dense per-table ordinal rank; it does not ignore column order. Post-validation
requires exact candidate ordinals/schema and all 34 data fingerprints. Production BEFORE→AFTER
namespace owner/ACL, grants, extensions/members and complete security metadata must remain exact.
The pure validator SHA-256 is `fce74e3e333a225e480acd2b96f07df6bebf947697acd58478e7c18744cbd2cf`;
its passing pre-validation proof SHA-256 is
`b17c82f4115c51d841d14983cf16c256fd392e90217df3bec96d3727129ec4a6`.
This is physical slot compaction, not a new logical schema migration or relaxed data check.

Fresh activity, fence and deployment invariants remain mandatory immediately before execution.
Initial native fence verification was at 11:59:50.025 UTC; its full drain ends at 12:30:20.025 UTC.
Final execution/readback, firewall reopening and live journeys are recorded under #29, not inferred
from this preparation record.
