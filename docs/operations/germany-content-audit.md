# German index-ready content audit

Execution contract for [#21](https://github.com/Standkreis/atlas/issues/21), alongside the
[regional catalogue audit](germany-catalogue-audit.md). Commands run from `app/` with an explicit
local Postgres `DATABASE_URL`. They do not authorize a production import.

## 🌿 Minimum content and checkpoints

The active German regional union owns catalogue membership. A valid source-ranked species
identity, supported tile, scientific-name fallback and functional page satisfy the minimum;
a missing common name or eligible reference image does not remove a species. Optional facts,
prose, introductions, sounds and interactions have separate coverage counts, not release quotas.

Run one paced `gallery` process, then `names`, over the union. Both work kinds are globally
deduplicated and checkpoint each taxon. Retain stdout JSON reports and stderr progress outside
Git: they contain exact per-run network/cache/retry accounting, unlike checkpoint attempt counts.
Completed zero-image searches are completed coverage gaps, not unfinished work. Failed requests
preserve the previous gallery and retry on the next invocation; an interrupted owner leaves a
15-minute renewable lease before another process can reclaim its unfinished work. Completed
taxa are not repeated. Do not bypass leases or run competing provider processes to speed a job.

Names merge only missing values under the Taxon lock after verifying the original scientific
identity. Ambiguous or non-species Wikidata matches publish no labels. Gallery replacement is
one transaction with its completion checkpoint. It only owns unowned, non-sighting, non-avatar
reference images with origin `inat` or `commons`; sounds and personal media are never replaced.

## 🔬 Whole-union audit

```sh
npx tsx etl/catalogue-content-audit.ts --catalogue <active-id> --output <local-directory>
```

The audit loads its inputs under one repeatable-read read-only transaction. It verifies union
identity, names, current work versions, zero-to-12 consecutive gallery positions, URL/source
provenance, licence evidence, duplicates and completed-work/live-content agreement. Missing,
pending, running and failed checkpoints block transfer; taxonomy quarantines and honest content
coverage limitations are reported separately. Exit 2 means the audit is not yet release-ready.

The output includes `content-audit.json`, `gallery-transfer-manifest.json` and an intentionally
unapproved `network-review-template.json`. Every sample flag starts false. Deterministic samples
cover available tiles, origins, gallery-size buckets and lead/non-lead images.

## 🖼️ External availability and rendered review

```sh
npx tsx etl/gallery-network-audit.ts --catalogue <active-id> \
  --checkpoint <local-checkpoint.jsonl> --output <local-url-report.json>
```

This read-only, resumable check uses only allowlisted HTTPS provider image hosts. HEAD checks
validate HTTP success and image MIME type; selected HEAD rejections fall back to a bounded GET.
Bodies are cancelled rather than mirrored. Redirects stay on the allowlist, requests are paced,
retries are bounded and Retry-After extends the shared cooldown. Positive checks can be reused
for 24 hours; interrupted final JSONL records are ignored without deleting earlier evidence.
`--limit` can bound newly attempted URLs. Final release evidence must cover the frozen complete
asset target set with zero failed or pending checks.

HTTP success is not image decoding, proof of scientific identity or a guarantee of future
availability. Inspect actual locally populated pages on phone and desktop, including a
12-image mixed-origin gallery, single-image gallery and explicit zero-image fallback. Check
navigation, attribution for the selected image, source-page identity and matching licence.
Decode/review the audit's representative image targets as well. Record only checks actually
performed in a copy of the template, with reviewer identity, timestamp and concrete evidence.
On 9 September the owner [approved retained official iNaturalist API evidence](https://github.com/Standkreis/atlas/issues/21#issuecomment-5600270992)
when Cloudflare prevents inspecting a public photo page. Keep `sourcePageChecked: false` in
that case and supply `officialApiEvidence`: provider `iNaturalist`, exact `photoId`,
`sourcePageUrl` and official taxon-detail `requestUrl`, retained JSON `cachePath` and
`cacheSha256`, original `retrievedAt`, and an
official `licenceMappingUrl` establishing the exact family/version (pin GitHub source to a
commit). The audit verifies retained bytes, their taxon/photo identity, render URL, author and
licence code, and the existing 30-day source-cache
freshness window. A reviewer must actually inspect that record and mapping; a licence-family
code alone does not prove its version. This method does not waive attribution/licence checks,
sample decoding or the separate complete 24-hour image-URL audit, and is not a claim that a
blocked public page was viewed. Commons continues to use its file-specific licence evidence.
This API alternative requires a detailed `LocalPhoto` record with explicitly null native-source
fields. The global iNaturalist mapping does not establish an imported Flickr/Commons photo's
original licence version; an abbreviated `default_photo` alone cannot prove native provenance.
Source-linked photographs can depict diagnostic traces rather than an adult animal; do not
silently claim field-identification certainty or introduce an unreviewed visual classifier.

## 📦 Filtered handoff

```sh
npx tsx etl/catalogue-content-audit.ts --catalogue <active-id> --output <local-directory> \
  --network-review <completed-review.json> --url-checks <local-url-report.json>
```

Only an eligible audit emits `gallery-artifact.jsonl`. The companion manifest binds the
catalogue, exact content snapshot, full Taxon-row digest, audit, sample evidence and supplied
URL report. The artifact contains only qualified union reference `Asset` rows and current,
completed `TaxonEnrichmentWork` rows for names/gallery. It excludes personal media, avatars,
sounds, all identity/history tables, outside-union assets and unrelated/incomplete checkpoints.

Names modify the base catalogue's Taxon rows. Freeze enrichment, regenerate the #19 base
artifact and its newly bound representative naming review, then compare its Taxon table digest
with the gallery manifest's `taxonFingerprint`. Retain both artifact hashes as one release set.
Never combine a pre-enrichment Taxon payload with a later gallery artifact. Re-run both exports
from unchanged data to check reproducibility before the reviewed migration rehearsal.

Preservation evidence includes before/after protected-table and unrelated-content hashes in
the local source plus nonempty personal/sound/avatar fixtures in disposable integration tests.
An initially empty source alone cannot demonstrate preservation of production history. The
production importer and rollback rehearsal in #28/#29 must independently prove it.
