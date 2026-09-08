# 🗺️ Germany Atlas contract — Kreisregionen, catalogue, progress and migration

> **Immutable decision record.** This record supersedes [record 0002 E1](0002-etl-the-plausible-set.md)
> for German region identity and query composition, and refines E2, E3, E10, E11 and E13 for a
> nationwide catalogue. It does not change the plausible-set cut itself.

| 🗓️ Date | 👤 Participants | 🤖 Agent | 🔗 Tracker |
| --- | --- | --- | --- |
| 2026-09-08 | Sven Reiser, with Codex | GPT-5.6 Sol | [Epic #14](https://github.com/Standkreis/atlas/issues/14) · [issue #15](https://github.com/Standkreis/atlas/issues/15) |

## 🎯 Decision

Standkreis launches with Germany as its complete selectable atlas. Its user-facing geography is the
official BBSR **Kreisregion** layer, not a raw GADM list. A Kreisregion contains one or more official
German Kreis units. Those official units are the atoms used to map the product region onto GBIF's
GADM query identifiers.

The current authoritative snapshot contains **362 Kreisregionen**. “Approximately 361” remains a
useful product description, but 362 is the reviewed import count for the BKG/BBSR Kreisregion layer
at 31 December 2024. The number is source-controlled rather than hard-coded as a product invariant.

## 🧭 Region contract

### Sources, licence and refresh

| Purpose | Authority | Pinned input | Licence and attribution |
| --- | --- | --- | --- |
| User-facing Kreisregion membership and geometry | BKG **GE250**, layer `KRG250`, built from BBSR and Destatis classifications | Topic date `31.12.2024`; 362 unique `SN_KRG` rows in the [2025 archive](https://daten.gdz.bkg.bund.de/produkte/sonstige/ge250/2025/ge250.utm32s.shape.zip) downloaded 2026-09-08; archive SHA-256 `ff4e2c3c0e675cc06d8a13f0769fca73ae53b2f8a1bf0b67cb5a30c8a31b51e3` | [Datenlizenz Deutschland – Namensnennung 2.0](https://www.govdata.de/dl-de/by-2-0); publish the BKG source notice and change notice required by the [GE250 product page](https://gdz.bkg.bund.de/index.php/default/gebietseinheiten-1-250-000-ge250.html) |
| Constituent Kreis names, keys and land boundaries | BKG **VG250**, layer `vg250_krs`, aligned to the same reference date | [Pinned 31.12.2024 GeoPackage archive](https://daten.gdz.bkg.bund.de/produkte/vg/vg250_ebenen_1231/2024/vg250_12-31.utm32s.gpkg.ebenen.zip); SHA-256 `07e1342f3e163ebeeaecb6b028914c9fc81e854f10e05633423740a5f074f4e8`; filter `GF = 4` yields 400 unique land rows/AGS values; `GF = 2` water geometries are excluded | Same licence and source-notice obligation; see the [VG250 31.12 product page](https://gdz.bkg.bund.de/index.php/default/verwaltungsgebiete-1-250-000-stand-31-12-vg250-31-12.html) |
| Occurrence-query bridge only | GBIF GADM geocoder and the GADM identifiers accepted by GBIF occurrence search | Explicit mapping evidence stored operationally with the registry version; no GADM geometry or archive is imported | [GADM terms](https://gadm.org/license.html) permit this free, non-commercial product's use but prohibit redistribution/commercial use; a GADM id is never the product's region id or boundary authority |

GE250 and VG250 are reviewed **at least annually**, and whenever BKG publishes a new relevant
release. An update creates a new inactive registry version first. Import checks must report added,
removed, renamed, split, merged and unmapped units; a human reviews that diff before activation.
The exact topic date from the downloaded metadata is stored—never the product page's broader
“last updated” date. The source URLs, download time, file digest, topic date, licence identifier and
required attribution text travel with every imported registry version.

The repository and public APIs do not redistribute a GADM dataset or geometry. The checked-in
registry contains BKG data; a resolver records only the GBIF-supported query identifier and review
evidence in the operational database, where it is used server-side under Standkreis's settled
free/non-commercial boundary. Tests use minimal fixtures, not a copied national GADM crosswalk. If
that commercial status changes, or the identifier mapping itself cannot remain internal, obtain
GADM permission or replace the bridge with GBIF `geometry` queries derived from the openly licensed
BKG polygons before release.

### Identity and hierarchy

- A Kreisregion's immutable public key is `de-krg-<SN_KRG>`, with `SN_KRG` left-padded to eight
  digits. Example: Südwestpfalz is `de-krg-07340000`. The existing internal `Region.id` UUID remains
  stable so filters and regional prose do not need a destructive key rewrite.
- A constituent Kreis has public key `de-krs-<AGS>`, with the official VG250 `AGS` kept as five
  digits.
- Source codes, not names or GADM ids, form public identity. Display-name changes and query
  remappings do not change a public key or its stable internal UUID.
- Every active Kreis unit belongs to exactly one active Kreisregion in a registry version. Every
  Kreisregion belongs to exactly one of Germany's 16 Länder. Geometry remains MultiPolygon.
- A region stores the BBSR source name, an optional product display-name override, aliases, Land,
  constituents, geometry/provenance, and one or more versioned GBIF/GADM query-unit mappings.
- Search aliases include the product and BBSR names, every constituent's official name and common
  spelling variants, and the Land. Aliases aid discovery; they do not create extra selectable regions.
- The source name is the default display name. Reviewed product overrides may make a composite less
  bureaucratic without changing its membership. The first required override displays
  `Südwestpfalz/Pirmasens/Zweibrücken` simply as **Südwestpfalz**.

`Südwestpfalz` is one selectable region consisting of Landkreis Südwestpfalz (`07340`), Pirmasens
(`07317`) and Zweibrücken (`07320`). Searching any of those names returns Südwestpfalz and explains
the composition. The cities are not separately selectable.

Mainz-Bingen is the canonical BBSR Kreisregion `de-krg-07339000`. It is regenerated from the German
registry and current occurrence rules; the old hand-created region is not carried forward as a
second product region.

### Query and aggregation

Each constituent Kreis maps to a disjoint, pinned set of GBIF-supported GADM 4.1 query units. The
reviewed snapshot assigns all **402 land query units** to all 400 Kreise exactly once. Göttingen and
Wartburgkreis each absorb two historical GADM units; every other Kreis has one. Missing units,
duplicate assignments or an unresolved best match are import failures.

The mapping is nevertheless a reviewed **query approximation**, not a claim that GADM and current
BKG boundaries are identical. The crosswalk chooses the current Kreis with the largest polygon
overlap and records its evidence; administrative changes leave some secondary overlap across a
current boundary. Official BKG geometry alone drives display and point-in-region decisions. GADM
drives occurrence queries only because it is the regional key supported by GBIF. A registry audit
reports material overlap changes and coverage limitations rather than silently presenting provider
boundaries as authoritative German geography.

For a singleton region the existing plausible-set algorithm is unchanged. For a composite:

1. Fetch the whole-year species facet, all twelve month facets and monthly regional totals for every
   constituent query unit under one observation window and rules version.
2. Resolve facet taxa to the accepted GBIF **species** key.
3. Sum raw whole-year species counts, raw species-by-month counts and raw region-by-month totals by
   accepted key across all constituents.
4. Only then apply the floor of 10 and the per-tile cumulative 90% cut to the combined whole-year
   counts, ordering equal counts deterministically by accepted GBIF key.
5. Derive month shares/words and same-genus look-alikes from the combined totals and final combined
   set.

No constituent gets its own floor or cut. The union of already-cut constituent lists is not the
composite set. A GBIF occurrence must belong to exactly one mapped query unit; mapping validation
guards that invariant. Synonym facet keys folding to one accepted key are summed before ranking.

The source count is the GBIF occurrence facet's indexed-record count under the pinned predicates.
Those facets expose counts, not occurrence identifiers, so Standkreis does **not** attempt to
deduplicate records repeated or syndicated across GBIF datasets. It does not query iNaturalist again
and add those observations, because iNaturalist research-grade data is already a GBIF dataset. The
only aggregation deduplication is taxonomic: synonymous facet keys resolving to the same accepted
species are summed. Provider duplicates remain a named GBIF coverage limitation; changing to
record-level deduplication would require a new rules version and catalogue audit.

## 🧬 Catalogue contract

The **German catalogue** is the distinct union, by accepted GBIF species key, of every ready
Kreisregion's plausible set in one fully completed catalogue version. It is not a separately cut
national occurrence list. A partial nationwide run can be inspected but cannot become active.

A catalogue version records at least:

- registry version and source topic date;
- plausible-set rules version and tile mapping version;
- inclusive occurrence window (`yearFrom`, `yearTo`) and GBIF predicate set;
- generated/activated timestamps, complete region count and union taxon count;
- source response/cache fingerprints sufficient to explain a rerun.

Regional denominators remain the active region's local plausible set. The Germany denominator is
the active German catalogue union. Refreshes create a new version and activate it atomically after
audit; they never rewrite sightings or studies. Product progress always states the version it was
calculated against, so a catalogue change is visible rather than retroactively hidden.

Registry presence and ETL readiness are separate states. A newly imported region is catalogued but
not runnable or selectable; only explicit nationwide orchestration may queue it. This prevents the
existing stale-job sweep from starting hundreds of cold region jobs immediately after an import.

### Minimum index-ready taxon

A taxon is publishable in the index when it has:

- one accepted GBIF species key, scientific name, species rank and deterministic Standkreis tile;
- one deterministic display-name ladder: requested UI locale, then German, then English, then the
  lexicographically first remaining labelled language, then the scientific name; duplicate values
  are skipped;
- source/provenance sufficient to audit identity and membership;
- a functional card and species page using either one currently usable, attributed image or the
  deterministic tile fallback;
- honest empty states for unavailable optional fields.

An invalid/non-species identity, unresolved duplicate accepted key, missing scientific name/tile,
or a selected asset without valid source/licence/attribution blocks publication and is quarantined.
A missing German common name or photo does **not** block publication when the fallback works.

Rich prose, facts, sounds, interactions, look-alikes and a real image are optional enrichment.
Complete regional prose and interactions for every taxon are not prerequisites for the German
index. Taxonomy and enrichment are global per accepted taxon and reused across regions; only
plausibility and region-specific derived content are regional.

### Reference-image gallery

A publishable taxon has **zero to 12** ordered taxon-owned reference images. Image completeness does
not participate in catalogue membership or catalogue versioning: a valid taxon with zero usable
images remains index-ready through its tile silhouette. Gallery generation has its own selection
rules version, source fingerprint, completion state and refresh timestamp. A completed zero-image
result is distinct from a failed or not-yet-run refresh.

- Reference bytes stay on iNaturalist or Wikimedia Commons. Standkreis stores only the remote URL
  and metadata; permanent mirroring is deferred.
- Every image stores its own renderable URL, author/attribution, exact supported licence, licence
  URL, original source page, source origin and explicit integer position. Incomplete or unsupported
  licence metadata fails closed for that candidate. The accepted iNaturalist codes are `cc0`,
  `cc-by`, `cc-by-sa`, `cc-by-nc`, `cc-by-nc-sa`, `cc-by-nd` and `cc-by-nc-nd`; blank, unknown and
  all-rights-reserved candidates are rejected. Commons accepts only a recognized public-domain/CC0,
  CC BY or CC BY-SA declaration with a licence/mark URL and non-empty author. Exact file terms are
  stored rather than normalized to a taxon-wide licence.
- Position `0` is the lead and preserves the existing ladder: licensed iNaturalist default photo;
  acceptable Commons P18 from the matched species item; another licensed curated iNaturalist photo;
  then no asset and the silhouette fallback.
- After the lead, add the acceptable Commons P18 when not already selected, then the remaining
  licensed iNaturalist `taxon_photos` in curated source order. Deduplicate before the cap by stable
  source identity/page and normalized remote URL. Cross-source perceptual matching is deferred.
- Ordering is persisted and deterministic. Reads use position, then stable tie-breakers; timestamp
  ties never choose the lead.
- Fetch and validate every candidate before one transaction replaces only that taxon's reference
  image rows. A failed refresh preserves the previous gallery. Sound rows, sighting photos, avatars
  and other user assets are never deleted, reordered or rewritten by gallery work.
- The species-page hero may serve and navigate all ordered images, defensively capped at 12, with
  attribution following the visible image. Zero and one image remain functional states.
- Every single-image surface—Atlas cards, onboarding/group previews, search results, look-alikes,
  ecology/fill cards and Profile previews—uses only position `0`. Explicit regional offline packs
  download only the lead image for each taxon; the gallery must not multiply pack size.

Gallery enrichment runs once per global accepted taxon, not once per regional membership. A newer
gallery rules version may queue a taxon for refresh without making it disappear from an active
catalogue. Coverage reports distinguish completed zero-image galleries, rejected candidates,
failures and stale prior versions.

## 📊 Germany-progress contract

Germany progress is a separate aggregate; choosing or downloading a region is never evidence that
the user visited it.

| Measure | Rule |
| --- | --- |
| **Discovered species** | Distinct taxa in the active German catalogue with at least one wild, non-cultivated personal sighting. Like regional collection state, discovery is catalogue-scoped and location-independent; coordinates are not required. |
| **Studied species** | Distinct studied taxa that belong to the active German catalogue. Study is location-independent and catalogue-scoped. |
| **Regions visited** | Distinct active Kreisregion ids containing at least one qualifying German sighting coordinate. |
| **German sightings** | Count of wild, non-cultivated sightings with coordinates inside an active German land Kreisregion. |

Captive and cultivated sightings remain in the journal but never fill a discovery or visit counter.
A coordinate-less wild sighting can fill discovery when its taxon is in the German catalogue, but
selection, place text and legacy region are not promoted to location evidence: it cannot count as a
German sighting or region visit. A sighting outside German land likewise contributes only to the
catalogue-scoped discovery state, not to German sightings or visits. BKG land geometry decides
containment; marine, coastal-water and standalone open-water membership are deferred. Boundary ties
use one deterministic registry lookup and are tested.

Germany progress returns its registry/catalogue version and denominator. A catalogue refresh can
change the denominator and both discovered-in-catalogue and studied-in-catalogue counts; the
underlying studies and sightings never change. Existing per-region progress remains behaviorally
unchanged in this Epic unless a later issue explicitly supersedes it.

## 🔁 Legacy and migration contract

The migration is additive first and operates from an explicit, reviewed successor map:

| Legacy selection | Successor |
| --- | --- |
| Mainz-Bingen | regenerated `de-krg-07339000` |
| Südwestpfalz, Pirmasens or Zweibrücken | composite `de-krg-07340000` |
| Kyoto or Schagen | no German successor; no longer selectable |

- Translate saved and active region references through the successor map, deduplicate, and require
  the active region to be one of the saved active German regions.
- If an active legacy region has no successor, choose another already-saved mapped German region;
  if none exists, clear only the region selection and return the user to region discovery.
- Preserve Identity, Sighting, Study, user Asset/photo, reusable Taxon/content and global reference
  Asset rows. Keep reference ordering and provenance and deduplicate by stable source identity; a
  region transition must never duplicate or discard globally reusable images or sounds. Region
  retirement must not cascade into any of them. Prefer retiring legacy rows over deleting them until
  all server and client references have migrated.
- Regenerate Mainz-Bingen plausibility under the canonical registry; never relabel the old regional
  set as if it were newly calculated.
- Invalidate and regenerate genuinely regional prose, look-alikes and other derived content when
  their region membership, plausible-set rules or input fingerprint changes. Reusing global taxon
  content must not make stale regional claims appear current.
- Version offline-pack/cache keys. Redirect mapped German legacy keys; invalidate retired regional
  catalogue/cache data while preserving the offline outbox, personal photos and unsynced actions.
- Rehearse with representative data and a recovery path on disposable local Postgres before any
  production operation. A separately reviewed migration plan is required before transforming or
  deleting production data.

## 🚫 Explicit deferrals

- German coastal waters, offshore/marine regions and standalone open-water catalogue rules. This
  explicitly includes the unassigned GBIF/GADM Bodensee water-body unit: freshwater observations
  inside official land Kreis boundaries remain eligible, but open-lake records are not arbitrarily
  assigned to one or several shore regions in this Epic.
- Selectable countries or regions outside Germany, including Kyoto and Schagen.
- A global progress surface, even though global taxon identity and user records remain reusable.
- Complete prose, sounds, facts and interactions for every indexed taxon.
- Permanent mirroring of external reference-image bytes, unrestricted Commons search and
  cross-source perceptual image deduplication.
- Changes to user sighting photos, avatars or their privacy/storage lifecycle.
- Public creation of arbitrary regions.

## ✅ Consequences

- The old “one Region equals one GADM level-2 polygon” model is superseded for German product
  identity. GADM stays as a versioned many-query-unit bridge.
- The exact current launch target is 362 regions, not a magic 361-row constant.
- Nationwide generation and enrichment can be resumed and audited by immutable registry/catalogue
  versions, while users continue to see local denominators.
- Gallery completeness is observable and independently versioned but never excludes a valid taxon;
  single-image surfaces and regional offline packs stay bounded to the lead.
- Personal evidence survives both catalogue churn and the removal of legacy selectable regions.

## 🔥 Reasoning and rejected alternatives

- **Raw Kreise:** rejected as the user-facing list. BBSR's composites keep smaller independent cities
  with their surrounding landscape and produce the requested Südwestpfalz shape. Raw official Kreis
  units remain the auditable query atoms.
- **Sixteen Länder:** rejected as too coarse for a walking atlas. They remain hierarchy and search
  context, not collection regions.
- **GADM ids as product identity:** rejected because GADM is a provider-specific, versioned query
  bridge and can lag German administrative changes. BKG source codes remain stable product keys.
- **A national occurrence cut:** rejected because it would erase local plausibility. The national
  catalogue is the union of local cuts, so a locally meaningful species survives low national rank.
- **Cut each constituent, then union:** rejected because repeated floors remove locally sparse counts
  that are plausible in the composite and distort cumulative tile shares. Raw accepted-key counts
  are combined first.
- **Download occurrence rows to deduplicate providers:** rejected for this catalogue version. The
  GBIF facet contract cannot identify repeated records, and adding a record-level pipeline would
  radically increase transfer and checkpoint cost. Disjoint regional query mappings prevent the
  duplicate introduced by Standkreis itself; upstream duplicates are reported as a limitation.
- **Location-only collection state:** rejected for discovered and studied. Existing regional progress
  is a catalogue intersection with personal state, and 166 of 187 audited legacy sightings have no
  coordinates. Physical claims therefore use separate, coordinate-backed German-sighting and
  visited-region measures.
- **Require a photo or rich content:** rejected because source coverage would become hidden taxonomy
  censorship. A valid species identity with an honest visual fallback is index-ready.
- **Mirror or cache every gallery image offline:** rejected for licence/operations and pack size. The
  species detail uses external reference media; bounded regional packs remain lead-only.

## 📚 Evidence and related work

- [BKG GE250 product and licence](https://gdz.bkg.bund.de/index.php/default/gebietseinheiten-1-250-000-ge250.html)
- [BKG GE5000 documentation](https://sgx.geodatenzentrum.de/public/gdz/dokumentation/deu/ge5000.pdf), which defines Kreisregionen as smaller independent cities joined to their assigned Landkreis and documents yearly BBSR delivery
- [BKG VG250 31.12 product and licence](https://gdz.bkg.bund.de/index.php/default/verwaltungsgebiete-1-250-000-stand-31-12-vg250-31-12.html)
- [Record 0002 — plausible set](0002-etl-the-plausible-set.md)
- [Closed draft PR #7](https://github.com/Standkreis/atlas/pull/7), preserving the gallery design
- [Epic #14](https://github.com/Standkreis/atlas/issues/14) and its dependency graph
