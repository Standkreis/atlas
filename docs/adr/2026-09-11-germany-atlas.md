# 🗺️ Germany Atlas — regions, catalogue and personal progress

Owner: Sven Reiser. Consolidated 11 September 2026 for [Epic #14](https://github.com/Standkreis/atlas/issues/14).

**Close-out draft: production acceptance PENDING.** This distils agreed product and operational
decisions; it does not certify production activation. Keep the close-out PR draft until
[#29](https://github.com/Standkreis/atlas/issues/29) supplies the final evidence below.

## 🎯 Decision and supersession

Germany is the selectable launch atlas. Its national catalogue is the union of locally plausible
regional sets, not an exhaustive inventory of German biodiversity. Global taxon identities and
personal records remain reusable without adding non-German regions or global progress to this Epic.

This ADR consolidates the [Germany contract](../records/2026-09-08-germany-atlas-contract.md) and
its later reviewed refinements. It supersedes the Germany-specific region, catalogue, gallery,
progress, onboarding and migration descriptions in the [first-walk spec](../specs/0001-standkreis-dex-the-first-walk.md).
The spec, historical records, anchors and screenshots remain at their stable paths. Unrelated
first-walk, identity, quest, recap, XP and future-product decisions are not reopened or closed here.

## 🧭 Regions and plausible sets

The reviewed snapshot has **362 Kreisregionen, composed from 400 official Kreis units**, across
16 Länder. BKG/BBSR owns product geography; the 402 disjoint operational GADM query units are an
internal GBIF query bridge, not the public region identity or boundary authority. The approximate
361-region estimate is superseded by this versioned snapshot, not by a permanent row-count constant.
The registry is `de-krg-2024-12-31`; the frozen catalogue run is
`germany-2016-2026-taxonomy-v2-20260909`.

- Public keys derive from official source codes. Südwestpfalz (`de-krg-07340000`) combines Landkreis
  Südwestpfalz, Pirmasens and Zweibrücken; constituent search returns this one composite region.
- Mainz-Bingen (`de-krg-07339000`) is regenerated canonically. Kyoto and Schagen have no German
  successor and leave selection, while historical records and personal references are preserved.
- Resolve accepted GBIF keys and sum raw annual/monthly counts across all constituents **before**
  applying the floor of 10 observations and each tile's cumulative 90% cut. That percentage covers
  observations among floor-eligible candidates, not 90% of species; include the crossing taxon.
- The frozen window is **2016–2026 inclusive**: eleven calendar-year labels, with the current year
  partial. Month shares, sorting and “now” filtering do not replace the whole-year denominator.
- A regional denominator stays local. The national denominator is the distinct union of completed
  regional cuts; no second nationwide occurrence cut removes locally meaningful taxa.

The [audited index](../records/2026-09-09-germany-index-audit.md) contains **6,874 accepted taxa,
including six accepted hybrids**. The UI's ordinary “species” wording is not a narrower scientific
claim. GBIF facet counts cannot identify syndicated duplicate records; provider effort, identification
uncertainty and the GADM/BKG boundary approximation remain coverage limitations.

There is [no WoRMS exclusion pass](../records/2026-09-09-germany-without-worms.md) or substitute
habitat blacklist. Coastal taxa satisfying ordinary regional observation rules remain eligible.
Offshore/coastal-water regions and the unassigned standalone Bodensee water query are deferred;
freshwater observations inside official land Kreis boundaries remain eligible. This is not a
certified terrestrial-only species checklist.

## 📖 Index-ready content and images

Index-ready means an auditable accepted identity, scientific name, supported tile, deterministic
display-name fallback and functional card/page. Names fall back from requested locale to German,
English, other labelled languages in sorted order, then scientific name. Missing common names or
eligible images never remove an otherwise valid taxon.

Enrichment is checkpointed **once per global accepted taxon**, not per regional membership.
A completed zero-image search is distinct from failed or unfinished work. The
[frozen v7 source review](../reviews/2026-09-10-germany-content-release.md) records 36,338 reference
images for 6,450 taxa and 424 completed zero-image galleries. These are source counts, not a
substitute for the final merged-target audit.

- Galleries hold **zero to 12** ordered, externally hosted eligible references, each with its own
  author, source page and supported exact licence. Active-image attribution follows accessible
  gallery navigation. Failed refreshes preserve existing content.
- Single-image surfaces and explicit regional offline packs use only the eligible position-zero
  lead. Full-gallery navigation does not multiply regional pack image counts.
- Source selection follows the reviewed iNaturalist/Commons lead ladder. Production reconciliation
  is different: eligible existing references lead, then new licensed candidates append up to 12.
  Original Asset rows and evidence remain intact; receipt-bound visibility, order and justified
  licence-link corrections are overlays. Hidden references retain explicit reasons.
- Retained official iNaturalist API evidence is accepted for challenged public pages, but an
  imported photo requires verified original-source rights. Unverified imports and exact reviewed
  ambiguous-photo assignments are withheld without changing species membership or inventing licences.
- The complete frozen URL audit remains mandatory. The owner-approved
  [release refinement](../operations/germany-checked-import.md#fresh-representative-release-checks)
  allows fresh checks of all 12 deterministic reviewed sample URLs, bound to the same frozen inputs,
  instead of repeating 36,338 checks every 24 hours. Each sample must still be fresh after drain.
  HTTP/MIME checks do not establish decoding, species identity, rights or future availability.

Complete Wikipedia introductions, Steckbrief facts, prose, sounds and interactions for every taxon
are **not** index-readiness requirements. The new source's names/gallery work does not populate
those fields; reusable existing rich content and audio remain protected by migration. Broader
coverage needs follow-up work. [#67](https://github.com/Standkreis/atlas/issues/67) specifically owns
a later external-source learning preview, then catalogue-wide enrichment only after owner approval;
it is not a promise to fill every Wikipedia field or bird recording.

## 📊 Four distinct progress measures

| Measure | Meaning |
| --- | --- |
| Discovered | Distinct active-catalogue taxa with a personal wild sighting; location-independent, including coordinate-less sightings. |
| Studied | Distinct studied taxa in the active catalogue; independent of location and discovery. |
| German sightings | Wild sightings with valid coordinates contained in active BKG German **land** regions. |
| Regions visited | Distinct containing regions for those qualifying geographic sightings. Selection, saving or downloading is not a visit. |

Captive/cultivated entries remain in the journal but do not fill discovery or territory counters.
An outside-Germany wild sighting may count towards catalogue discovery without becoming a German
sighting. Unavailable geometry is shown as unavailable, not zero. Catalogue refreshes can change
intersections and denominators; they never rewrite the underlying studies or sightings.

## 🖥️ Discovery, offline continuity and privacy

Welcome precedes region selection. Onboarding and Profile share bounded region search, including
constituent names, and ask for device location only after an explicit action. The index is the
collection view, not the first-launch region list. Current/saved/recent regions, physical visits and
explicit offline downloads are separate concepts; selecting a region does not download its pack.

Catalogue transitions invalidate versioned public queries and regional packs, not personal identity,
photos, outbox drafts or unsynced actions. A fully offline tab can retain its coherent old version
until authoritative synchronization. Missing queued regions require recoverable explicit selection,
not discarded photos or a blanket reset of site storage.

[#65](https://github.com/Standkreis/atlas/issues/65) adds Production-only baseline page-view analytics.
Known public routes are allowlisted, query strings/fragments removed and private sighting IDs
masked. Unexpectedly detailed referrers prevent loading analytics. No custom identity, coordinates,
notes, photo URLs or search-input events are added. Local and Preview contexts do not load the
integration; bilingual disclosure accompanies it. These are verified implementation boundaries,
not a blanket legal-compliance claim or a claim that ordinary application cookies disappear.

## 🛡️ Operational boundaries

Generate and audit in local Postgres; production is a checked transfer, never direct enrichment or
a database wipe. Source, target, approval, executable head and exact receipt are bound before a
write-gated atomic activation. Existing personal/global content survives; guarded inverse recovery
requires unchanged after-images and safe references, not an old backup restored over newer work.

The [approved migration plan](../operations/2026-09-11-germany-production-migration-plan.md),
[HTTP fence procedure](../operations/germany-production-http-fence.md) and
[operator runbook](../operations/germany-checked-import.md) remain normative. Preview build guards
do not isolate Preview runtime credentials or old writers: the temporary Production/Preview fence,
drain and fresh checkpoint are required. Additive SQL runs through the guarded Production build.
No reset/db-push/dev-migration commands, upstream-limit bypass or application model-key experiments
are authorized. Source evidence and recovery files stay private; publish aggregate audit results.

## 🚧 Final production acceptance — PENDING

Code delivery, source review, local rehearsal and owner UI approval are not production proof.
Before adopting this close-out, root must replace the pending entries with the actual #29 record:

| Required evidence | Delivery state |
| --- | --- |
| Final integrated local checks, browser/operator transition and recovery | PENDING final #29 record |
| Fresh target backup/schema/capacity, exact plan/receipt and protected-data audit | PENDING final #29 record |
| Actual production transfer, observed catalogue/region/gallery counts and maintenance duration | PENDING |
| Deployed commit/build plus independent production journeys, media/audio, offline/cache and analytics checks | PENDING |
| Every child resolved and Epic acceptance criteria independently rechecked | PENDING; no automatic closure from child merges |

Countries beyond Germany, global progress, marine-region design, full rich-content coverage,
permanent image mirroring, perceptual deduplication and public region creation remain deferred.
Keep this PR draft; root owns production verification, final adoption and tracker reconciliation.
