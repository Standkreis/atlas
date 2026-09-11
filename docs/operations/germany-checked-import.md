# Checked Germany catalogue import and recovery

Delivery: [#63](https://github.com/Standkreis/atlas/issues/63), under [#28](https://github.com/Standkreis/atlas/issues/28). Production execution and independent release verification belong to [#29](https://github.com/Standkreis/atlas/issues/29).

This process replaces direct-production ETL and whole-table restores for populated targets. It is not an approved production execution plan. The operator must obtain the owner's approval of the concrete source, target, preservation decisions, rehearsal, capacity and recovery plan before a production transformation. A broad permission to deploy is not a substitute.

## Boundaries

- Generate and audit source data in local Postgres only. Never run source collection, enrichment, audit generation, disposable tests or development against Neon.
- Keep the immutable source and production-backup restore unchanged; rehearse on a separate local clone. Production PG18 backups require a compatible client and a PG18 rehearsal, not the usual PG17 development database.
- Keep secrets out of arguments, output and Git. Read configured database credentials without displaying them. Use the unpooled production connection only for the separately approved transfer.
- Use checked-in additive migrations through the Production Vercel build. Never `prisma migrate reset`, `prisma db push` or `prisma migrate dev`.
- Never authorize a paid upgrade or delete historical rows to make capacity pass. An unresolved footprint limit is an owner decision.

## Frozen source and independently reviewed target

The six frozen source files are the base audit, base transfer manifest and JSONL artifact, and the gallery audit, gallery transfer manifest and JSONL artifact. Pin their SHA-256 values and the catalogue/run/registry, taxonomy, union, content and audit fingerprints. The validator checks exact schemas, table order, row hashes, identities and cross-file agreement. Mutation or stale approval fails before target changes.

Source proof is not target proof. The target review separately enumerates every existing in-union global reference image with its exact before-image fingerprint, eligible/hidden decision, licence correction if justified, subject evidence and reviewer. Reuse pairs must identify a reviewed global reference of the same taxon; personal photos, sighting photos and avatars cannot be reuse targets. Existing Asset rows are never rewritten or removed. The #61 receipt selects eligible old references first, then new licensed images up to twelve; hidden and overflow rows remain stored with explicit reasons.

Retained official iNaturalist API records are accepted evidence where public pages are challenged. Imported-source candidates require original-source licence verification. Unverified rights, unsupported custom grants and unresolved subject conflicts do not become display-eligible by being in an old database. Source taxa remain in the catalogue even when images are withheld.

The original network review and **complete successful** URL report remain bound to the frozen content audit. Under the [11 September owner-approved refinement](2026-09-11-germany-production-migration-plan.md#-11-september-addendum-representative-release-availability), release availability may use either the original whole-set-current contract or a separately versioned representative spot report. The latter must cover every deterministic network target already selected by the frozen content audit (all available tile/origin/gallery-size/lead-position strata), never an operator-picked subset. Every selected URL check must be successful and younger than 24 hours, including after any operator-paced drain. The original whole-set report is still validated for exact full coverage, successful checks, hashes and source bindings; an incomplete refresh is never a substitute. Hash equality alone does not make current evidence fresh.

## Identity and transformation contract

| Surface | Approved transformation |
| --- | --- |
| `Taxon` | Match by GBIF key and preserve target UUID. Insert missing taxa. Source owns taxonomy fields; preserve nonempty target Wikidata ID, common names by language and reusable rich content. Cross-identity conflicts abort. |
| `Taxon.prose` | Remap only supported v1 `regions` keys through explicit source/successor identity mappings. Preserve unsupported target shapes and unrelated/retired keys. Target prose wins source overlap; conflicting many-to-one keys within one side abort. |
| `Region` | Reuse exact canonical or one reviewed legacy-successor identity. Keep target UUID/creation time; apply the canonical source fields. No fuzzy-name merge. |
| Registry tables | Materialize the selected registry and children with mapped Region FK; activate only at the final transaction phase. Preserve other registry history. |
| Catalogue tables | Transfer the selected catalogue, region builds, candidate membership/lookalikes, union membership and taxonomy resolutions. Map Taxon FKs. Source generation and review timestamps remain provenance. |
| `TaxonEnrichmentWork` | Transfer approved work versions with mapped Taxon FK. Retain the original source proof as provenance; it does not certify the final merged target gallery. |
| `Asset` | Preserve every existing row. Insert only the approved source references not explicitly reused. No user-photo or sound import, overwrite or deletion. |
| `ReferenceGalleryReceipt`, `ReferenceAssetVisibility` | Store target-specific reviewed receipts and visibility/licence overlays. Logical fingerprints use UTC timestamps; scalar database images match PostgreSQL's UTC timestamp-without-time-zone representation. |
| Live `Plausibility`, `Lookalike` | Replace only the enumerated mapped German regions and reviewed retired legacy region sets. Delete old lookalikes before membership; insert membership before lookalikes. Preserve unrelated regions. |
| `Filter` | Map existing saved/current selections to canonical successors, deduplicate, remove retired/no-successor selections and retain a valid current choice. An empty result is explicit and recoverable through region selection. Preserve identity, tiles and unrelated fields. |
| Personal/global rows | Preserve Identity, EmailCode, Passkey, Sighting, Study, ScanWork, PhotoDeletion, QuotaBucket, Interaction and existing Assets. Protect untouched Taxon/history/out-of-scope rows. |

Südwestpfalz combines Landkreis Südwestpfalz, Pirmasens and Zweibrücken. Mainz-Bingen is a regenerated canonical German region. Kyoto and Schagen have no German successor and leave the selectable catalogue; this is not permission to delete personal records or reusable global taxa. Regional progress uses the local set; Germany progress uses the deduplicated regional union; studying a taxon is independent of location.

## Maintenance and atomic activation

1. Verify the reviewed code pin, clean issue/release checkout, schema migration state and the actually deployed #62 compatibility build. Older authenticated deployments, scheduled ETL/content work and direct SQL writers must not write during the transfer. The new gate cannot protect an old writer that never participates in it.
2. Obtain a fresh secure target backup, verify its digest and restore it to a new local clone. Confirm exact table counts and preservation evidence. Do not reuse an outdated rehearsal snapshot after production writes have continued.
3. Build a deterministic target plan without database writes. Resolve every identity and gallery review, inspect the exact transformation summary, and durably persist private before/after recovery evidence before apply. Large receipts use bounded streaming serialization rather than one giant JavaScript string. Evidence files may contain personal data: mode 0600, outside Git, retained securely.
4. Close the distributed `CatalogueCutoverGate` for the unique operation and target catalogue; inspect `CatalogueWriteAdmission` until all admitted work has drained. Do not delete admissions or override a different maintenance owner. A nonempty drain stops the apply while maintenance stays closed.
5. Revalidate source/release evidence. In one SERIALIZABLE transaction require the same drained maintenance owner, acquire fixed target-table locks, and compare the complete target fingerprint plus every before-image and protected scope. If a writer changed the planned target, stop and replan; never force the stale plan.
6. Materialize mapped rows, reviewed galleries and provenance inside that same transaction. No staging writes become visible in shared Taxon/Asset/Region rows before commit. Rebuild the bounded live regional sets, normalize selections, retire old active German registry/catalogue rows, then activate the successors. Partial unique indexes must remain valid during both forward and inverse ordering.
7. Verify every final after-image and protected scope before commit, then perform independent post-commit readback while maintenance remains closed. Only successful verification reopens writes. Transaction failure, interruption or post-commit uncertainty must not automatically open the gate.
8. Capture the committed outcome and gate state externally, then exercise authenticated browser journeys, offline recovery and production health independently. Repository merge success is not release verification.

The fixed snapshot contains the following 31 product/data tables, defined by
[`CATALOGUE_TARGET_SNAPSHOT_TABLES`](../../app/etl/catalogue-import-plan.ts) and the store's fixed
column contracts:

- Identity, EmailCode, Passkey, Filter, Region.
- RegionRegistryVersion, RegionRegistrySource, RegionRegistryEntry, RegionRegistryAlias,
  RegionSourceUnit, RegionQueryUnit.
- CatalogueVersion, CatalogueRegionBuild, CataloguePlausibility, CatalogueLookalike, CatalogueTaxon,
  CatalogueTaxonomyResolution, CatalogueHabitatBatch.
- TaxonEnrichmentWork, Taxon, Plausibility, Lookalike, Interaction, Asset.
- ReferenceAssetVisibility, ReferenceGalleryReceipt, Sighting, Study, QuotaBucket, ScanWork, PhotoDeletion.

Gate/admission rows are operational state managed through their advisory-lock protocol, not part
of the immutable target fingerprint. The operator must separately verify `_prisma_migrations` as
described below; the CLI does not perform that history check or rewrite it.

### 11 September aggregate transaction budget refinement — #102

Long importer transactions have a fixed **600,000 ms aggregate deadline**: the repeatable
target snapshot, serializable apply/inverse, and their post-commit verification reads.
Each SQL statement remains bounded at **120,000 ms**, lock acquisition at **30,000 ms**,
and Prisma transaction acquisition `maxWait` at **30,000 ms**. Short gate transactions
retain their existing defaults. No environment or operator override bypasses these bounds.

The first production attempt reported Prisma aggregate expiry at 125,939 ms against the old
120,000 ms transaction deadline. That error identifies the aggregate limit, not an individual
slow query or the exact failed phase. Whole-operation network transfer, sequential statements
and before/after-image computation all consume that deadline. Increasing this bounded budget
does not remove any SQL limit, write admission, atomic publication, preservation or inverse check.

After any timeout, keep the HTTP fence and inspect the exact committed state before taking
another action. A missing success log or unchanged physical database size is not rollback proof.
A retry requires the reviewed merged code head, a fresh unchanged checkpoint and regenerated
exact-bound config/plan/receipt/action manifests under #29. The budget refinement changes no
source, gallery, licence, preservation, cost or migration scope, and is not production success.

## Operator commands

Run from the clean checked release worktree's `app/` directory. Securely configure `DATABASE_URL`
in the process environment; the command does not load `.env` files and must never receive a
credential URL as an argument. Confirm the actual target hostname, port and database. Routing
overrides in URL query parameters are rejected; the supported options are `sslmode` and
`channel_binding`. Use Node 24 with sufficient local memory for the full decoded plan.

```sh
npx tsx etl/catalogue-import-cli.ts code-pin
npx tsx etl/catalogue-import-cli.ts plan \
  --config /private/reviewed/config.json \
  --receipt /private/reviewed/receipt.jsonl \
  --plan-record /private/reviewed/plan-record.json
npx tsx etl/catalogue-import-cli.ts apply \
  --config /private/reviewed/config.json \
  --receipt /private/reviewed/receipt.jsonl \
  --plan-record /private/reviewed/plan-record.json \
  --release-record /private/reviewed/release-intent.json
npx tsx etl/catalogue-import-cli.ts recover \
  --config /private/reviewed/config.json \
  --receipt /private/reviewed/receipt.jsonl \
  --plan-record /private/reviewed/plan-record.json
```

These are placeholder paths, not files to execute without review. Only a loopback database named
`dex_check_*` permits these commands without an execution manifest. Every other target additionally
requires `--execution-manifest /private/reviewed/<action>-approval.json`. The strict action-specific
manifest binds the actual code HEAD, config and target; apply/recover additionally bind the reviewed
plan and exact receipt file. Its approval record names the owner, time and review link. A valid file
does not establish human approval: the operator must independently verify it.

The strict `catalogue-import-execution-config` v1 contains `expectedCommit`, `operationId`,
`activationAt`, `frozenBundle`, `releaseEvidence` and `galleryReview`, plus `schemaVersion` and `kind`.
`frozenBundle` carries the six descriptors and catalogue pins; `releaseEvidence` carries
`networkReview`, `auditUrlReport` and `currentUrlReport`; `galleryReview` carries its exact document
descriptor and independently reviewed document/evidence fingerprints. No credentials belong in
this configuration. The explicit target activation timestamp is distinct from historical source
activation and remains fixed between plan and apply.

### Fresh representative release checks

From the checked checkout, use the existing execution config as read-only input; its old
`currentUrlReport` descriptor is not used to select targets. No database is opened. Choose a
new output path (existing reports are never overwritten):

```sh
npx tsx etl/catalogue-release-spots-cli.ts \
  --config /private/reviewed/config.json \
  --checkpoint /private/reviewed/release-spots.jsonl \
  --output /private/reviewed/release-spots.json
```

This validates all six frozen files and the original full URL/scientific review before deriving
the exact reviewed sample. For the approved v7 bundle this is **12 assets / 12 unique URLs**.
It uses one paced worker (at least 200 ms between dispatches), existing allowlisted redirects,
bounded HEAD/GET fallback and retries/Retry-After handling. No provider API calls, paid models,
database writes or permanent image bytes are involved. Successful checkpoint reuse is limited
to 24 hours and the exact source/sample contract; interrupted/failed records are retained.
`--limit <positive integer>` bounds newly attempted URLs. An incomplete or failed sample exits
unsuccessfully and produces no release report; resume the checkpoint without removing targets.

Pin the new report SHA-256 and byte size as `releaseEvidence.currentUrlReport`, then rebind the
execution config and action-specific approval manifests through the normal checked workflow.
The discriminator is `kind: catalogue-release-image-spots`, `schemaVersion: 1`. Its strict
contract binds catalogue/union/content, all source pins and six file hashes, the original full
report hash, the whole gallery target fingerprint and the complete reviewed sample metadata
fingerprint plus exact asset/URL identities. Coverage, timestamps, status, MIME, redirects,
duplicates, unexpected targets and all hashes fail closed. Apply rechecks freshness and frozen
file bytes after drain, immediately before its transaction. The historical full-current-report
format remains accepted without a discriminator.

Availability is external and may change immediately after a successful check. HTTP status and
image MIME are not decoding, scientific identification, licence verification or guarantees of
future availability. Those independent frozen review requirements remain unchanged.

Receipt JSONL records are header, indexed protected scopes, indexed mutations and footer. The
footer binds the logical receipt and pre-footer stream; the plan record binds the exact whole-file
SHA-256 and size. The writer refuses existing paths, writes mode 0600, and fsyncs the file and parent
directory. The reader rejects truncation, noncanonical/extra/reordered records, stale hashes and size
mismatches before database work. Keep the receipt and plan record together; partial output is not an
approved plan. Apply regenerates the exact target plan and refuses any mismatch. Its durable release
intent precedes database writes but is explicitly not a success receipt.

## Client and cache checks

The compatibility deployment must precede catalogue activation. Check catalogue identity changes
from the legacy null identity to the new version and on recovery to the old version. Verify the
following exact surfaces, including interruption/reload, cross-tab and old-controller behavior:

- `localStorage['dex.catalogue.version']`: version ID or `__dex_catalogue_legacy__`; absent means
  not yet observed, not an authoritative legacy catalogue.
- Live TanStack queries and `localStorage['dex.queries']` (buster `dex-cache-v2`). The catalogue-scoped
  paths are `dex.set`, `dex.setCounts`, `dex.regions`, `regions.personal`, `regions.search`,
  `regions.locate`, `identity.germanyProgress`, `identity.me`, `sighting.outside`,
  `sighting.outsideVersioned`, `taxon.page`, `taxon.mapCentre`.
- CacheStorage packs `dex-pack-<region>` and `dex-pack-v2-<encoded-catalogue>-<region>`;
  localStorage readiness `dex.offline.ready.<region>` and
  `dex.offline.ready.v2.<encoded-catalogue>.<region>`. A read must not recreate a deleted pack.
- IndexedDB database/store `dex-outbox`/`outbox`, localStorage fallback `dex.outbox.fallback`, and
  owner marker `dex.persist.identity`. These are not bulk-cleared on catalogue changes.
- Private-photo cache `dex-images`; public pack cleanup must not widen into private data deletion,
  and private cleanup must not open deleted public packs.

The executable definitions are [CatalogueCache](../../app/src/components/CatalogueCache.ts),
[OfflinePack](../../app/src/components/OfflinePack.ts), [Queue](../../app/src/components/Queue.ts),
and [query persistence](../../app/src/trpc/client.tsx).

Keep sighting/outside caches and queued scan UUID handling consistent with the new catalogue identity. A queued canonical scan whose region disappears after rollback must retain its photo/draft and offer explicit region recovery. Batch validation must not prevent unrelated valid queue work. Private-photo cleanup owns the legacy private image cache; it must not open removed public pack names. Do not clear all site data as a substitute for these checks.

## Abort and recovery

- Before any database writes: discard an incomplete staging attempt only after identifying its exact disposable files. Keep immutable source, review and backup evidence.
- After maintenance closure but before commit: inspect the failure and operation ownership. A stale target requires a new plan; a failed transaction leaves product rows unchanged. Reopen only after independently proving the intended old catalogue is intact and no transaction outcome is uncertain.
- After commit or ambiguous connection loss: inspect exact before/after receipts and database state first. Do not blindly retry apply. Leave maintenance closed until the committed outcome is proven.
- Recovery uses the exact retained receipt, locks/gate and compare-and-swap guards. It refuses any changed imported after-image or newer inbound reference rather than overwriting user work. Reverse publication must deactivate the successor before restoring the predecessor. Delete only rows proved newly inserted by this operation and still matching its after-images.
- New sightings, studies, photos, scan results, filter region arrays, prose region references or other inbound references may make the inverse unsafe. That is a stop-and-review condition, not permission to disable constraints or restore an old backup over new user data.
- After a successful inverse, verify original mutation images, preserved scopes and the complete committed target state before reopening; repeat client identity/cache and region-recovery journeys.

## Rehearsal and release evidence

Use a securely configured database client; do not put production credential URLs in command
arguments or captures. Before planning, execute this read-only schema query and compare every
successful migration's checksum with SHA-256 of the checked worktree's corresponding
`app/prisma/migrations/<migration_name>/migration.sql`. Require exactly the expected migration
names, completed/non-rolled-back rows, no failures and matching checksums. Record the comparison
outside Git. A successful table read alone is not schema-history proof.

```sql
SELECT migration_name, checksum,
       finished_at IS NOT NULL AS finished,
       rolled_back_at IS NOT NULL AS rolled_back
FROM "_prisma_migrations" ORDER BY migration_name;
```

Create the secure backup with a client compatible with the source major version and retain its
custom-format archive. Record `shasum -a 256 /private/reviewed/target-before.dump`, bytes and mode
0600. Restore with `pg_restore --exit-on-error --no-owner --no-privileges` into a **new local**
database configured through PostgreSQL environment variables, never over the source or a live
target. Compare table row counts and canonical row digests between the approved backup snapshot
and restored clone; record the restore result before running the importer.

Run these read-only measurements before import, periodically from a second local connection during
apply/recovery, immediately after each commit/readback, and after exact recovery. Save timestamped
samples outside Git. Use a 2-second sampling interval for the rehearsal and capture explicit phase
boundaries; a sampled maximum is a measured lower bound, not a guarantee about an unobserved spike.

```sql
SELECT clock_timestamp() AS measured_at,
       pg_database_size(current_database()) AS database_bytes,
       (SELECT state FROM "CatalogueCutoverGate" WHERE "countryCode"='DE') AS gate,
       (SELECT count(*) FROM "CatalogueWriteAdmission" WHERE "countryCode"='DE') AS admissions;
SELECT relname, pg_total_relation_size(oid) AS total_bytes,
       pg_indexes_size(oid) AS index_bytes
FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r'
ORDER BY pg_total_relation_size(oid) DESC;
```

Report the gate-close and verified-reopen timestamps separately from total CLI runtime: parsing,
hashing and private-file staging happen before the write pause. On failure, report the still-closed
maintenance duration, never a successful pause. External receipt/backup bytes are reported
separately from the database footprint; there is no extra JSONB staging table. Compare the largest
observed live/index/recovery footprint plus prudent headroom with the integration's verified plan
limit. Account for the hosting provider's separate history/WAL accounting and confirm the actual
offer before any paid change. A clone left with aborted/dead rows is not a fresh baseline for a
subsequent rehearsal: retain its evidence and use another fresh restore.

The #63 close-out must include the exact checked code and input pins, production-copy backup/restore proof, full-sized plan/apply/recovery results, fault-injection results, final gallery and personal-content audits, before/live/index/recovery storage peak, write-pause measurement, and comparison with the verified hosting limit. The #28 close-out turns these into the concrete owner-reviewable production plan. #29 refreshes time-sensitive evidence and the production snapshot, executes only the approved plan, and independently verifies the deployed system.

Do not substitute the development source database size for the final target footprint: it may include source-only historical versions. Conversely, do not count only logical payload bytes and omit indexes, retained global content or transaction/recovery overhead.
