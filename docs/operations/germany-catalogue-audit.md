# 🔬 Germany catalogue audit

This runbook implements the reproducible audit gate for [issue #19](https://github.com/Standkreis/atlas/issues/19). It inspects a completed, staged Germany catalogue in local Postgres. The default audit is read-only; the explicit reviewed `--activate-local` step publishes the candidate locally. Neither mode queries GBIF or accesses Neon.

## 🎯 What the gate proves

The automated pass checks facts that can be established mechanically:

- all intended Kreisregion builds completed, with no queued or failed rows;
- stored counts, regional memberships, per-tile summaries and fingerprints agree;
- the national union is the exact accepted-key union of the regional sets;
- accepted taxa have species rank, valid tiles and usable scientific-name fallbacks;
- month arrays, peaks and season words satisfy the shared rules;
- every constituent Kreis has reviewed query units and no query unit is assigned twice; the materialized 400-owner/402-query GADM 4.1 crosswalk must reproduce its operational mapping SHA, including the reviewed Bodensee exclusion;
- Südwestpfalz is exactly `07317` Pirmasens, `07320` Zweibrücken and `07340` Landkreis Südwestpfalz.

The tool does not pretend that an outlier formula establishes ecological credibility. It emits review targets for the five smallest and largest regional sets, every Tukey-fence outlier, and these stable representative samples:

| Lens | Kreisregion |
| --- | --- |
| Urban | Berlin, Stadt |
| Rural | Eifelkreis Bitburg-Prüm |
| Alpine | Garmisch-Partenkirchen |
| Coastal | Nordfriesland |
| Eastern | Görlitz |
| Western/composite | Südwestpfalz |

The reviewer inspects evidence for species plausibility, naming, seasonality and query-boundary fit and records their actual identity; an agent review is labelled as an agent review. A region appearing under several lenses is reviewed once, with every reason retained.

## ▶️ Generate, review, repeat

From `app/`, with an explicit `DATABASE_URL` pointing at the reviewed local development database:

```sh
npx tsx etl/catalogue-audit.ts \
  --catalogue <catalogue-id-or-run-key> \
  --output /tmp/germany-catalogue-audit
```

This writes:

- `audit.json`: deterministic findings, totals, distribution and compact review evidence;
- `review-template.json`: one evidence record per required region;
- `transfer-manifest.json`: deterministic table counts/digests, initially blocked while reviews or activation are missing.

Copy the template outside the repository, name the reviewer, retain an ISO UTC review time and notes, and set each `species`, `naming`, `seasonality` and `boundary` check to `pass` or `fail`. A default `fail` is deliberate: an untouched template cannot authorize transfer. Then rerun:

```sh
npx tsx etl/catalogue-audit.ts \
  --catalogue <catalogue-id-or-run-key> \
  --output /tmp/germany-catalogue-audit-reviewed \
  --review /absolute/path/to/completed-review.json \
  --activate-local
```

`--activate-local` is deliberately unavailable for a non-local database host. Under one serializable transaction it locks the German cutover, verifies the complete candidate and its bound review again, derives any missing `nowCounts` introduced while the long run was in flight, replaces only live regional `Plausibility` and `Lookalike`, copies the staged month totals, refreshes the compatibility picker summary, removes the affected region keys from taxon prose, marks every included `Region` ready, activates the pinned registry/catalogue and retires earlier German active versions. Identity, sightings, studies, reusable taxon content and all assets remain untouched. A non-empty but incorrect `nowCounts` array remains a defect; only the migration-era empty value is backfilled.

The command then performs the required post-activation audit and writes `transfer-artifact.jsonl`. The audit and artifact share one exported repeatable-read snapshot, held open until streaming finishes; concurrent writes cannot slip unreviewed rows into the payload. Active-catalogue audits also verify the live membership and lookalikes against staged rows in both directions, check regional summaries, and require exactly one active German catalogue and its matching active registry. A later live refresh or changed activation state fails the gate instead of being mistaken for an intact cutover.

The artifact uses one forward-only database cursor per table, fetched in batches of 1,000 rows, incrementally hashed and atomically renamed. Each ordered selection runs once; later pages do not repeat increasingly large offset scans or sorts. It contains only the allowlisted registry, region, accepted-taxon and catalogue tables; every completed build includes `completedAt`. Every returned column must exactly match the reviewed allowlist, so schema drift fails the export instead of silently widening it. Its byte digest, row count and per-table digests are recorded in the manifest.

Exit status `0` means the post-activation manifest and payload are eligible. Status `2` means mechanical defects, missing activation, failed reviews or missing reviews still block it. Status `1` means the audit itself could not run.

## 🧪 Reading findings honestly

- `defect` means stored data violates the catalogue contract or a deterministic shared rule. Fix or rerun the responsible pipeline; do not sign it away.
- `coverage-limit` describes known upstream limits without failing an otherwise index-ready catalogue. Missing German common names use the scientific-name fallback. GBIF facet counts cannot remove provider/syndication duplicates. GBIF/GADM query units approximate BKG boundaries and do not prove polygon equivalence. The reviewed national GADM crosswalk remains operational data under its licence; the audit records its digest and findings but does not commit the mapping.

The [9 September scope decision](../records/2026-09-09-germany-without-worms.md)
leaves WoRMS out. Coastal species are retained under the ordinary GBIF rules and
reported as a limitation; no habitat-filtered experimental candidate is eligible
for this release. Regional sizes describe observation-driven sets, and seasonal
labels are observation profiles rather than guarantees of biological absence.

Migration `20260913120000_catalogue_marine_habitat` is retained byte-for-byte because it already
exists in deployment history. Its additive columns and empty batch table are represented in Prisma
only as dormant compatibility objects: active catalogue behavior keeps `habitatRulesVersion=0`,
and no source call, classifier, membership filter or alternative exclusion reads or writes them.
Do not drop the objects, delete the migration, or rewrite its checksum. The v2 transfer uses explicit
catalogue/build projections that exclude these three dormant fields and the table while preserving
strict failure on every selected column outside its reviewed allowlist.

The mechanical outlier fence is a triage device, not a biological acceptance threshold. The attributed review must explain credible extremes or mark the affected check failed.

## 📦 Transfer boundary

The manifest carries metadata only: catalogue identity, the audit fingerprint, artifact byte digest, deterministic row counts and content digests for the exact registry/catalogue/taxon-owned selections. The sibling JSONL file is the checked transfer payload.

Every table entry names the selected columns as well as its row count and digest, so a later dump cannot silently widen the reviewed selection. `Identity`, `Passkey`, `EmailCode`, `Filter`, `Sighting`, `Study` and the mixed-purpose `Asset` table are explicitly excluded. Excluding all `Asset` rows is intentional because it is the only safe default while reference assets and personal photos share a table; gallery transfer gets a separately filtered artifact in #21/#28.

The artifact is not permission to connect to production. Production transformation/import remains subject to the separate migration review required by the repository contract. A proposed region exclusion must be recorded in the review file, but cannot be papered over after the union is built: it fails closed and requires a regenerated candidate with an explicit catalogue-membership decision.
