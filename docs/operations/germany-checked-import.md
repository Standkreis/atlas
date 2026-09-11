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

The original network review and URL report remain bound to the frozen content audit. A distinct current URL report may renew availability without rewriting that scientific/content approval. Before apply, every unique source image URL must have a successful current check within the documented 24-hour window. Hash equality alone does not make an old report fresh. Recheck after any long operator-paced drain.

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

The fixed snapshot contains 31 product/data tables. Gate/admission rows are operational state managed through their advisory-lock protocol, not part of the immutable target fingerprint. `_prisma_migrations` is checked as schema preflight, not rewritten by the catalogue importer.

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

Receipt JSONL records are header, indexed protected scopes, indexed mutations and footer. The
footer binds the logical receipt and pre-footer stream; the plan record binds the exact whole-file
SHA-256 and size. The writer refuses existing paths, writes mode 0600, and fsyncs the file and parent
directory. The reader rejects truncation, noncanonical/extra/reordered records, stale hashes and size
mismatches before database work. Keep the receipt and plan record together; partial output is not an
approved plan. Apply regenerates the exact target plan and refuses any mismatch. Its durable release
intent precedes database writes but is explicitly not a success receipt.

## Client and cache checks

The compatibility deployment must precede catalogue activation. Check catalogue identity changes from the legacy null identity to the new version and on recovery to the old version. Verify TanStack live/persisted query invalidation, IndexedDB pack metadata/readiness, `dex-region-*` CacheStorage cleanup, service-worker interruption/reload, cross-tab invalidation and old-controller behavior. A cache read must not recreate a deleted pack.

Keep sighting/outside caches and queued scan UUID handling consistent with the new catalogue identity. A queued canonical scan whose region disappears after rollback must retain its photo/draft and offer explicit region recovery. Batch validation must not prevent unrelated valid queue work. Private-photo cleanup owns the legacy private image cache; it must not open removed public pack names. Do not clear all site data as a substitute for these checks.

## Abort and recovery

- Before any database writes: discard an incomplete staging attempt only after identifying its exact disposable files. Keep immutable source, review and backup evidence.
- After maintenance closure but before commit: inspect the failure and operation ownership. A stale target requires a new plan; a failed transaction leaves product rows unchanged. Reopen only after independently proving the intended old catalogue is intact and no transaction outcome is uncertain.
- After commit or ambiguous connection loss: inspect exact before/after receipts and database state first. Do not blindly retry apply. Leave maintenance closed until the committed outcome is proven.
- Recovery uses the exact retained receipt, locks/gate and compare-and-swap guards. It refuses any changed imported after-image or newer inbound reference rather than overwriting user work. Reverse publication must deactivate the successor before restoring the predecessor. Delete only rows proved newly inserted by this operation and still matching its after-images.
- New sightings, studies, photos, scan results, filter region arrays, prose region references or other inbound references may make the inverse unsafe. That is a stop-and-review condition, not permission to disable constraints or restore an old backup over new user data.
- After a successful inverse, verify original mutation images, preserved scopes and the complete committed target state before reopening; repeat client identity/cache and region-recovery journeys.

## Rehearsal and release evidence

The #63 close-out must include the exact checked code and input pins, production-copy backup/restore proof, full-sized plan/apply/recovery results, fault-injection results, final gallery and personal-content audits, before/live/index/recovery storage peak, write-pause measurement, and comparison with the verified hosting limit. The #28 close-out turns these into the concrete owner-reviewable production plan. #29 refreshes time-sensitive evidence and the production snapshot, executes only the approved plan, and independently verifies the deployed system.

Do not substitute the development source database size for the final target footprint: it may include source-only historical versions. Conversely, do not count only logical payload bytes and omit indexes, retained global content or transaction/recovery overhead.
