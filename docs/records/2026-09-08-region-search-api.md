# German region search API

Implementation decision for [issue #22](https://github.com/Standkreis/atlas/issues/22), refining the
[Germany Atlas contract](2026-09-08-germany-atlas-contract.md). Agent: Codex (GPT-6).

`regions.search` searches only the active German registry. Empty or shorter-than-two-character
normalized queries return no entries. Pages default to 10 and cannot exceed 20; stable canonical
keys order pages. Send the returned `next` as `after` and `registryVersion` on subsequent pages.
A changed registry returns `registry-changed`, requiring a fresh search. Each normalized word can
match a different alias, so constituent names and a Bundesland qualifier can be combined.
The shared importer/search normalizer handles umlauts, their ae/oe/ue spellings, sharp s,
decomposed Unicode, punctuation and whitespace. Results carry the Bundesland, source name and
constituents, never GADM mappings or taxon/gallery payloads.

One bounded entry read and one batch summary read serve a page, with a fixed number of Prisma
relation queries. Counts come exclusively from completed builds in the active catalogue for the
same registry. `CatalogueRegionBuild.nowCounts` stores all twelve seasonal counts at build
completion using the existing `isNow` rule. Older completed builds without those counts report a
stale summary until regenerated. Missing active builds report unavailable; neither case invents
zero counts or publishes a partial/audited candidate. A selectable result requires a ready Region
and an available summary. The summary includes catalogue version, completion time, set size,
per-tile counts and the requested month's count.

`regions.personal` reads the current identity's selected region IDs separately from up to 20
device-supplied recent IDs. Both lists preserve order; duplicates and selected IDs are removed
from recents. References outside the current registry appear in `unavailableIds`. These reads
never infer visits and do not alter the user's selection or store coordinates.

`regions.locate` accepts coordinates only with explicit `permission: granted`. Denied/not-requested
permission returns `permission-required` without a database/provider lookup. Production uses a
server-only, compressed artifact generated from the exact pinned GE250 2025 archive: all 362 KRG250
features are transformed from EPSG:25832 to EPSG:4326 with seven decimal places, without simplifying
boundaries. Islands and holes remain intact. The generator verifies the source archive digest and
the exact registry key set. Its manifest carries licence, attribution, change notice, registry digest
and compressed geometry digest; the public sources page carries BKG attribution. This roughly 4 MB
artifact is server-only and explicitly included in Next.js output tracing, never an offline/client pack.
The adapter requires both the active registry ID and artifact digest to match the pinned geometry.
A missing, corrupted or mismatched geometry artifact returns `geometry-unavailable`, which is a
capability boundary, not evidence that a point is outside Germany.
The server-only containment seam accepts all containing composite keys for the requested registry.
No containing land polygon means `no-result`; multiple boundary matches choose the lexicographically
lowest canonical key and expose `boundaryTie`. A key absent from that registry returns
`registry-mismatch`. No nearest-region, bounding-box or GADM substitution is permitted.

The existing picker continues to use its legacy `dex` response shapes until the presentation migration
in issue #23. `dex.regions` now reads at most 20 selected plus 20 suggested entries, using precomputed
`Region.pickerSummary` counts. The additive migration backfills current prepared regions once;
regional publication refreshes its summary in the same transaction, and content runs and fixture
seeding refresh the derived summaries after writes. Missing summaries are omitted, not zeroed.
Operators changing live Plausibility outside those paths must run `SELECT refresh_region_picker_summary()`
after publication. The later catalogue cutover must invoke that refresh after replacing live sets.
`dex.lookupRegion` uses the new bounded search/land resolver with no external GBIF geocoder; its
deprecated `gadmGid` string carries the public canonical key. New callers must use `regions.*`, whose
summary and location availability states can be rendered honestly. Region preparation remains
operator-only; the deprecated lookup key is not an input to `requestRegion`.
