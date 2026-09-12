# 🗺️ Germany Atlas — regions, catalogue and personal progress

Owner: Sven Reiser. Consolidated 11 September 2026 for [Epic #14](https://github.com/Standkreis/atlas/issues/14).

**Close-out draft: final production acceptance PENDING.** This distils agreed product and operational
decisions and records the verified native catalogue activation; it does not certify the remaining
deployed browser journeys or close the Epic. Keep the close-out PR draft until
[#29](https://github.com/Standkreis/atlas/issues/29) supplies the remaining evidence below.

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
returned 200/`ok:true`. The [draft #29 release record][release-record] at reviewed head
`08558722a137269b46ab0e4c93bd3fb8379fe3fe` binds the complete evidence and verified 42-issue delivery
trace. Final browser acceptance remains open because [#108](https://github.com/Standkreis/atlas/issues/108)
owns the reproduced hydration failure; this evidence does not close #29 or Epic #14.

The [approved migration plan](../operations/2026-09-11-germany-production-migration-plan.md),
[HTTP fence procedure](../operations/germany-production-http-fence.md) and
[operator runbook](../operations/germany-checked-import.md) retain their unchanged source/content and
historical importer contracts; the dated native plan supersedes their production transfer/personal
preservation/inverse requirements. Preview build guards
do not isolate Preview runtime credentials or old writers: the temporary Production/Preview fence,
drain and fresh checkpoint are required. Additive SQL runs through the guarded Production build.
No reset/db-push/dev-migration commands, upstream-limit bypass or application model-key experiments
are authorized. Source evidence and recovery files stay private; publish aggregate audit results.

## 🚧 Final production acceptance — PENDING

The rows follow all twelve [Epic acceptance criteria](https://github.com/Standkreis/atlas/issues/14)
in their original order. Actual native readback now fulfils the production-data requirements recorded
in rows 1–5; their deployed user-journey checks remain explicit. Overall acceptance, criterion 11 and
ADR adoption remain **PENDING** until the remaining production browser proof passes. Source-only and
rehearsal counts remain labelled; the native-operation counts are actual Production readback.
The [production03 fence proof](https://github.com/Standkreis/atlas/issues/29#issuecomment-5645363304)
is historical: that attempt rolled back and old service reopened. The reviewed native execution details
are in the [draft #29 release record][release-record].

| # | Epic criterion | Delivered or prepared evidence | Remaining final acceptance |
| --- | --- | --- | --- |
| 1 | Every intended German Kreisregion is available with a reviewed plausible set. | **Production data fulfilled.** Exact source→Production fingerprints prove the active reviewed catalogue has all 362 canonical German regions and 214,321 memberships; 400 source Kreis units and 402 query units retain their distinct roles. [Index audit][index-evidence] and [native readback][release-record]. | Confirm representative deployed region selection and summaries in the final browser journey. |
| 2 | Südwestpfalz is one composite region containing Pirmasens and Zweibrücken. | **Production data fulfilled.** Exact source→Production equality includes the reviewed single canonical Südwestpfalz region and its three-constituent, 625-taxon set. [Index audit][index-evidence]; [search PR40](https://github.com/Standkreis/atlas/pull/40). | Confirm deployed searches for Pirmasens and Zweibrücken both resolve to that one region. |
| 3 | Kyoto/Schagen leave selection; legacy German data is regenerated canonically. | **Production data fulfilled.** All 34 restored table fingerprints equal the audited native candidate, including canonical region data and its retained backup-derived rich content/media references. The owner waiver applies only to later target changes. [Native plan][native-plan] and [native readback][release-record]. | Confirm in the deployed picker that Kyoto/Schagen are unavailable and legacy German selections resolve canonically. |
| 4 | Every indexed species has minimum identity, a zero-to-12 gallery or honest fallback, and valid per-image provenance. | **Production data fulfilled.** Exact source→Production equality proves 6,874 German taxa and 6,874 receipt-bound galleries: 36,338 eligible references, 313 retained hidden references, 1,241 retained eligible leads, maximum 12, and the audited 424 honest zero-image galleries. [Content audit][content-evidence] and [native readback][release-record]. | Complete reliable deployed gallery/fallback/provenance rendering after #108, retaining the fresh release samples as availability evidence rather than a rights or identity re-audit. |
| 5 | Galleries are populated once per unique German taxon, not per regional membership. | **Production data fulfilled.** Production has exactly 6,874 global gallery receipts for 6,874 union taxa while 214,321 regional memberships reuse them; all relevant fingerprints and ordering equal the audited source. [Enrichment PR44](https://github.com/Standkreis/atlas/pull/44) and [native readback][release-record]. | Confirm representative deployed reuse/navigation after #108; no further data-population proof is outstanding. |
| 6 | Single-image surfaces use position zero; species galleries are accessible. | [Gallery PR51](https://github.com/Standkreis/atlas/pull/51) and [browser evidence][browser-evidence]: 0/1/2/12 images, EN/DE, phone/desktop, touch/keyboard, active attribution and broken non-lead isolation. | Combine the independent production runtime lead-set audit with representative deployed gallery rendering/navigation/attribution and the retained full local accessibility/cross-consumer matrix. Record those scopes separately; confirm the audited runtime and tested consumer code match the release. |
| 7 | Onboarding starts with a welcome, not a long region list. | [Onboarding PR46](https://github.com/Standkreis/atlas/pull/46) and [EN/DE browser journeys][browser-evidence]. | With a fresh owned browser identity, verify the deployed welcome appears first and leads into explicit region discovery at phone/desktop widths. |
| 8 | Region search and location-based selection work in onboarding and Profile. | [Picker PR43](https://github.com/Standkreis/atlas/pull/43), [Profile PR54](https://github.com/Standkreis/atlas/pull/54) and [full-catalogue browser journeys][browser-evidence]. | Combine representative deployed search/selection/switching and the five reviewed public synthetic-location resolution checks with retained local granted/denied/unavailable-location journeys for both entry points. Synthetic coordinates prove resolution, not a new device-permission journey; bind the tested shared picker to the release. |
| 9 | Germany-wide discovered, studied, region and sighting progress is available. | [Progress PR42](https://github.com/Standkreis/atlas/pull/42), [Profile PR48](https://github.com/Standkreis/atlas/pull/48) and [browser assertions][browser-evidence] distinguish location-independent discovery/study from geographic wild-only territory. | Verify all four deployed totals against expected owned-fixture or existing-row calculations and the active union/BKG land scope; retain local edge-case evidence and record actual production smoke coverage. |
| 10 | Offline packs are explicit per selected region and cache one lead per included taxon. | [Browser/pack evidence][browser-evidence]: 147 unique leads for 149 Sonneberg taxa versus 979 gallery references; explicit download, cancellation/failure/resume, eviction and offline reload pass. | Record deployed explicit pack download, bytes/counts, one-lead coverage and offline reload/reconnect, including private-cache/localStorage sentinels and the deliberately empty owned outbox. Link the retained actual checked-CLI two-tab legacy→Germany→inverse/worker rehearsal for populated pending-photo/outbox preservation; do not claim that scenario reran in production. |
| 11 | Applicable application, integration, browser, build, migration, transfer and production smoke checks pass. | [Final #104 gates][transfer-evidence] retain historical importer validation: 599 unit/103 integration tests, both full-data builds, normal/shaped checked plan/apply/inverse and exact 31-table/gallery/personal audits. Native operation/readback, schema/security preservation, gate/fence reopening and public/authenticated health are now verified in the [release record][release-record]. | **PENDING:** fix and verify #108, then finish the production media, onboarding/Profile/search/progress, explicit regional pack/offline and analytics journeys with observed counts/bytes and uncertainties. |
| 12 | Lasting decisions are distilled into the product spec or a superseding ADR before Epic closure. | This ADR, stable-spec supersession, glossary and roadmap updates are prepared in [draft PR100](https://github.com/Standkreis/atlas/pull/100); adoption is not yet complete. The [draft release record][release-record] has an independently verified 42-issue delivery trace and keeps #53 cancelled. | Update the release record with passing final journeys, independently recheck all criteria and child outcomes, run document checks, then review/adopt the close-out. Preserve #67/#93 as separate follow-ups; reconcile completion only after verified merges. |

[index-evidence]: ../records/2026-09-09-germany-index-audit.md
[content-evidence]: ../reviews/2026-09-10-germany-content-release.md
[browser-evidence]: https://github.com/Standkreis/atlas/issues/86#issuecomment-5638556302
[transfer-evidence]: https://github.com/Standkreis/atlas/issues/104#issuecomment-5645284769
[native-plan]: https://github.com/Standkreis/atlas/pull/107
[release-record]: https://github.com/Standkreis/atlas/pull/101

Countries beyond Germany, global progress, marine-region design, full rich-content coverage,
permanent image mirroring, perceptual deduplication and public region creation remain deferred.
Keep this PR draft; root owns production verification, final adoption and tracker reconciliation.
