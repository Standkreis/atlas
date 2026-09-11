# ⚡ Catalogue lookup and evidence-ordering costs

11 September 2026 · [#94](https://github.com/Standkreis/atlas/issues/94), a bounded part of [#29](https://github.com/Standkreis/atlas/issues/29).

## Decision

Add `Lookalike(regionId)`, `Lookalike(siblingId)` and `Interaction(targetId)` indexes. The existing composite indexes start with `taxonId`/`sourceId`; they do not provide efficient lookups for these other foreign-key checks. The checked-in migration is `20260914140000_catalogue_reference_lookup_indexes`, after the existing cutover-gate migration. It creates only these three indexes and changes no application rows.

Precompute the existing canonical row key once per row before sorting. Keep `localeCompare`, stable ties, canonical JSON, SHA-256, input row references, table coverage, and projected-row behavior unchanged. This trades temporary storage for one key per row for fewer repeated key constructions. Snapshot, receipt, protection and recovery semantics are unchanged.

## Full-data evidence

A new owned local PostgreSQL 18.3 clone was restored from the immutable applied Germany dump, SHA-256 `3b78b3ed27f1bed14b2700c92c605f6216ef543a2a3d4915823256b35f47b44b`. Node was 24.15.0. Measurements below use that clone; seeded integration results are separate.

The clone contains 27,467 taxa, 214,321 live plausibility rows, 151,680 live lookalike rows, 186,658 interactions and 36,883 assets. The actual `prisma migrate deploy` applied the one new migration in 0.227 seconds, as measured by its migration-ledger timestamps.

| Added index | Measured bytes |
| --- | ---: |
| `Lookalike_regionId_idx` | 1,179,648 |
| `Lookalike_siblingId_idx` | 1,327,104 |
| `Interaction_targetId_idx` | 2,727,936 |
| Total | 5,234,688 (4.99 MiB) |

Rollback-only probes inserted one owned Region and Taxon with no inbound references, ran `EXPLAIN (ANALYZE, BUFFERS)` on their deletion, then rolled back. PostgreSQL reported these constraint-trigger times:

| Foreign-key trigger | Before (ms) | After (ms) |
| --- | ---: | ---: |
| `Lookalike_regionId_fkey` | 7.907 | 0.239 |
| `Lookalike_siblingId_fkey` | 8.540 | 0.053 |
| `Interaction_targetId_fkey` | 8.921 | 0.048 |
| Complete one-Region delete | 8.813 | 1.431 |
| Complete one-Taxon delete | 18.857 | 1.948 |

Independent equality-lookup EXPLAINs selected each new index with `Index Only Scan`, zero heap fetches and execution times of 0.032–0.057 ms. These probes demonstrate lookup cost, not deletion of existing application data or portable wall-clock guarantees. Normal `CREATE INDEX` can block concurrent writers while building; this measured local duration is not a production lock-duration promise.

All 31 snapshot-table fingerprints match the previous comparator exactly, before and after migration. The [curated table fingerprint evidence](evidence/2026-09-11-catalogue-scale-fingerprints.json) records counts and hashes without row contents. The complete target fingerprint remains:

```text
c243118fc884e513cc0e761700b5c9ff433b3ba5c3747d10784cc0333262f45d
```

An independent SQL check hashed every row in each public table before and after migration/probes. All 33 application tables, including gate/admission state and personal records, retained exact counts and digests. Only `_prisma_migrations` changed, from 15 to 16 entries, recording the applied migration. The immutable source dump's hash was rechecked unchanged.

On the same snapshot, the previous comparator and the new implementation were each evaluated and their digests compared table by table:

| Canonicalization and hash work | Previous (ms) | New (ms) |
| --- | ---: | ---: |
| Lookalike, first measurement | 3,817 | 420 |
| Sum over all 31 tables, first measurement | 8,780 | 4,501 |
| Lookalike, after migration | 3,892 | 423 |
| Sum over all 31 tables, after migration | 10,170 | 4,747 |

Timings include sorting and hashing, excluding snapshot reads. The previous implementation ran first in each comparison; cache state and other local work can affect these timings. Equality of every digest was an assertion, not inferred from timing. Import operations still perform the complete repeated snapshot checks; #95 owns fixture lifecycle and measured deadlines.

## Verification and delivery boundary

- Eleven focused cases compare against the previous comparator: scalar and mixed numeric/string composite keys, whole-row fallback for personal and non-writable snapshot tables, stable equal keys, projections omitting all or part of a key, nested content, empty/singleton inputs and unchanged frozen input references/content.
- A fresh, separately owned seeded PostgreSQL 18.3 database passed all 98 integration tests in 18.63 seconds. No integration tests or timeouts changed in this PR.
- `npm run check` passed: typecheck, lint (six existing warnings, no errors), 558 unit tests, static export and production-server build. `prisma validate` and `git diff --check` passed.
- The remaining known full-data fixture failures are tracked in #95. This change's full-data migration/fingerprint/lookup probes do not claim that #29's complete integration or browser release gate has passed.

At preparation of this record, production has not been changed by this work. The indexes reach production only through the reviewed PR and guarded Vercel Production build. This migration does not import or activate Germany data. Raw timing, EXPLAIN and row-digest logs stay outside Git; the summarized measurements and table fingerprints above are the durable evidence.
