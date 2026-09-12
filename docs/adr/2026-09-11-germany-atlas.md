# 🗺️ Germany Atlas — regions, catalogue and personal progress

Owner: Sven Reiser. Consolidated 11 September; release verified 12 September 2026 for [Epic #14](https://github.com/Standkreis/atlas/issues/14).

**Production acceptance verified.** This distils the shipped product and operational decisions.
The native catalogue is committed, production journeys pass, and the final hydration correction is
live. Adoption occurs through [PR100](https://github.com/Standkreis/atlas/pull/100) after the
[#29 release record][release-record] lands; tracker closure follows verified merges.

## 🎯 Decision and supersession

Germany is the selectable launch atlas. Its national catalogue is the union of locally plausible
regional sets, not an exhaustive inventory of German biodiversity. Under ordinary product
transitions, global taxon identities and personal records remain reusable without adding non-German
regions or global progress to this Epic. The one-time 12 September pre-alpha replacement waiver
below permits target-state loss at cutover; it does not change that product model.

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
  successor and leave selection. The normal transition retains historical records and personal
  references; the one-time owner waiver does not guarantee later pre-alpha target changes beyond
  what is present in the reviewed native candidate.
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
- Source selection follows the reviewed iNaturalist/Commons lead ladder. Candidate reconciliation
  starts from the fresh production backup: eligible existing references lead, then new licensed
  candidates append up to 12. Original Asset rows and evidence present in that backup remain intact
  in the reviewed candidate; receipt-bound visibility, order and justified licence-link corrections
  are overlays. Hidden references retain explicit reasons. This does not promise preservation of
  later target changes during the owner-authorized replacement.
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
those fields; the reviewed native candidate retains reusable rich content and audio from the fresh
production backup. The owner waiver does not guarantee later target changes. Broader coverage needs
follow-up work. [#67](https://github.com/Standkreis/atlas/issues/67) specifically owns a later
external-source learning preview, then catalogue-wide enrichment only after owner approval; it is
not a promise to fill every Wikipedia field or bird recording.

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

Generate and audit in local Postgres; never run direct production enrichment. The original checked
transfer bound source, target, approval, executable head and exact receipt before write-gated atomic
activation, preserving existing content with a guarded inverse. Its local rehearsals and three
production deadline failures remain historical evidence, not a requirement to retry that route.

**12 September replacement decision:** Sven explicitly permits discarding or nonrestorably replacing
pre-alpha production data to finish release. The [merged native replacement plan in PR107](https://github.com/Standkreis/atlas/pull/107)
prepares the complete reviewed candidate locally from the fresh production backup, then uses a
rehearsed native PG18 schema/data restore of only application objects. Existing backup rich content
and media references are retained in that candidate; later personal changes may be discarded.
Provider objects and external media bytes are not replaced. Source/licensing quality and all
production acceptance remain mandatory.

The native production replacement completed under operation
`germany-29-native-replacement-20260912-01`. PostgreSQL reported 34 COPY completions / 1,085,601
rows and COMMIT; the process exited zero. Independent readback proved all 34 application-table
fingerprints exactly equal the frozen audited candidate, with the expected compacted physical
ordinals, all sixteen migration rows/checksums, valid indexes/constraints and unchanged Production
BEFORE→AFTER namespace ownership/ACL, grants, extensions/members and security metadata. Post-validation
SHA-256 is `27dde4a2775f0117653c758d4d53c8ae4712eb2597ebb4fef322323c5aa237d0`.
The temporary HTTP fence was removed into verified disabled configuration version 5 with zero
rules/IPs/bypasses and no draft; public Production and authenticated current/old Preview health then
returned 200/`ok:true`. The [#29 release record][release-record] binds the complete evidence and
delivery trace. [#108 / PR109](https://github.com/Standkreis/atlas/pull/109) fixed a reproduced
server/client head-hydration race without changing catalogue data or clearing caches. Commit
`49bbcf9e6f397af5835a7057107bbf59a6956a0b` is independently verified live as build `mtyfxhci`;
all sixteen final EN/DE phone/desktop gallery cases and retained bird-audio playback passed with
zero uncaught browser exceptions. No repeat data transfer was needed.

The [approved migration plan](../operations/2026-09-11-germany-production-migration-plan.md),
[HTTP fence procedure](../operations/germany-production-http-fence.md) and
[operator runbook](../operations/germany-checked-import.md) retain their unchanged source/content and
historical importer contracts; the dated native plan supersedes their production transfer/personal
preservation/inverse requirements. Preview build guards
do not isolate Preview runtime credentials or old writers: the temporary Production/Preview fence,
drain and fresh checkpoint are required. Additive SQL runs through the guarded Production build.
No reset/db-push/dev-migration commands, upstream-limit bypass or application model-key experiments
are authorized. Source evidence and recovery files stay private; publish aggregate audit results.

## ✅ Final production acceptance

The rows follow all twelve [Epic acceptance criteria](https://github.com/Standkreis/atlas/issues/14)
in their original order. Evidence combines audited local edge cases with actual production data and
deployed journeys; it is not a claim that one uninterrupted harness reran every scenario. Source-only
and rehearsal counts remain labelled; native-operation counts are actual Production readback.
The [production03 fence proof](https://github.com/Standkreis/atlas/issues/29#issuecomment-5645363304)
is historical: that attempt rolled back and old service reopened. The reviewed native execution details
are in the [#29 release record][release-record].

| # | Epic criterion | Delivered evidence | Final verification |
| --- | --- | --- | --- |
| 1 | Every intended German Kreisregion is available with a reviewed plausible set. | Exact source→Production fingerprints prove all 362 canonical regions and 214,321 memberships; 400 source Kreis units and 402 query units retain distinct roles. [Index audit][index-evidence] and [native readback][release-record]. | Live search and persisted region switching pass: Sonneberg 149 → Südwestpfalz 625 → Sonneberg 149. |
| 2 | Südwestpfalz is one composite region containing Pirmasens and Zweibrücken. | Exact source→Production equality includes its three-constituent, 625-taxon set. [Index audit][index-evidence]; [search PR40](https://github.com/Standkreis/atlas/pull/40). | Deployed searches and synthetic-coordinate resolution for both cities return that one region. |
| 3 | Kyoto/Schagen leave selection; legacy German data is regenerated canonically. | All 34 restored table fingerprints equal the audited native candidate, including canonical regions and backup-derived reusable content. [Native plan][native-plan] and [native readback][release-record]. | Deployed Kyoto/Schagen searches have zero results; Mainz-Bingen and constituent searches return canonical regions. |
| 4 | Every indexed species has minimum identity, a zero-to-12 gallery or honest fallback, and valid per-image provenance. | Exact source→Production equality proves 6,874 receipt-bound galleries, 36,338 eligible references, 313 retained hidden references, 1,241 retained eligible leads and 424 honest zero-image galleries. [Content audit][content-evidence] and [native readback][release-record]. | Final production media03 passes all 16 cases, decoded images and per-active-image attribution. Fresh samples are availability evidence, not a new rights/identity audit. |
| 5 | Galleries are populated once per unique German taxon, not per regional membership. | Production has 6,874 global gallery receipts reused by 214,321 memberships; fingerprints and ordering equal the audited source. [Enrichment PR44](https://github.com/Standkreis/atlas/pull/44) and [native readback][release-record]. | Final deployed DTO/gallery navigation agrees with reviewed taxon-level ordering. |
| 6 | Single-image surfaces use position zero; species galleries are accessible. | [Gallery PR51](https://github.com/Standkreis/atlas/pull/51) and [local browser evidence][browser-evidence] cover touch/keyboard, live position, attribution and broken non-lead isolation across consumers. | Production lead-set readback plus final 0/1/2/12-image EN/DE 390/1280px matrix pass. Twelve-image pages initially request 3–5 images, not all twelve. |
| 7 | Onboarding starts with a welcome, not a long region list. | [Onboarding PR46](https://github.com/Standkreis/atlas/pull/46) and [EN/DE local browser journeys][browser-evidence]. | Fresh owned production browser and shared-browser inspection show welcome first, then explicit region discovery. |
| 8 | Region search and location-based selection work in onboarding and Profile. | [Picker PR43](https://github.com/Standkreis/atlas/pull/43), [Profile PR54](https://github.com/Standkreis/atlas/pull/54) and [local granted/denied/unavailable-location journeys][browser-evidence]. | Six deployed searches, five location checks, persisted switching and EN-phone/DE-desktop Profile pass. Synthetic coordinates prove resolution, not a new device-permission journey. |
| 9 | Germany-wide discovered, studied, region and sighting progress is available. | [Progress PR42](https://github.com/Standkreis/atlas/pull/42), [Profile PR48](https://github.com/Standkreis/atlas/pull/48) and [local edge-case assertions][browser-evidence] distinguish catalogue progress from geographic wild-only territory. | All four live owned-identity totals correctly remain zero through region switches; national denominator remains 6,874. No synthetic production sightings/studies were created. |
| 10 | Offline packs are explicit per selected region and cache one lead per included taxon. | [Local pack/recovery evidence][browser-evidence] and [actual checked-CLI two-tab legacy→Germany→inverse rehearsal][release-record] cover failures, eviction and populated pending-photo/outbox preservation. | Live explicit Sonneberg pack: 147 leads, 149 taxa, 4,507,756 bytes. Continuation08 proves a new complete offline document, 149 cards, decoded images, reconnect and unchanged pack/private sentinels; owned outbox stays empty. The populated-outbox scenario was local, not repeated in production. |
| 11 | Applicable application, integration, browser, build, migration, transfer and production smoke checks pass. | [#104 gates][transfer-evidence]: 599 unit/103 integration tests, full builds, checked apply/inverse and exact preservation. PR109 adds 8 regression cases: 607 unit tests, 13,769-page export, production-server build and 24 delayed-chunk/theme cases pass. | Native restore and all 34 table/schema/security audits pass. Production media03, flow06 plus offline08, analytics04 and independent deployment/health verification complete the scoped aggregate proof in the [release record][release-record]. |
| 12 | Lasting decisions are distilled into the product spec or a superseding ADR before Epic closure. | This ADR, stable-spec supersession, glossary, roadmap and dated contract addenda are delivered through dedicated [PR100](https://github.com/Standkreis/atlas/pull/100), following [release PR101][release-record]. | Adoption is the close-out PR's merge. Root independently verifies child/default-branch delivery, document checks and production before reconciling Epic completion. #53 remains cancelled; #67/#93 remain separate follow-ups. |

[index-evidence]: ../records/2026-09-09-germany-index-audit.md
[content-evidence]: ../reviews/2026-09-10-germany-content-release.md
[browser-evidence]: https://github.com/Standkreis/atlas/issues/86#issuecomment-5638556302
[transfer-evidence]: https://github.com/Standkreis/atlas/issues/104#issuecomment-5645284769
[native-plan]: https://github.com/Standkreis/atlas/pull/107
[release-record]: ../records/2026-09-11-germany-release.md

Countries beyond Germany, global progress, marine-region design, full rich-content coverage,
permanent image mirroring, perceptual deduplication and public region creation remain deferred.
Root owns final adoption, independent production verification and tracker reconciliation.
