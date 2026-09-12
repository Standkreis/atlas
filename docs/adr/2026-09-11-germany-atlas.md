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

Generate and audit in local Postgres; never run direct production enrichment. The original checked
transfer bound source, target, approval, executable head and exact receipt before write-gated atomic
activation, preserving existing content with a guarded inverse. Its local rehearsals and three
production deadline failures remain historical evidence, not a requirement to retry that route.

**12 September replacement decision:** Sven explicitly permits discarding or nonrestorably replacing
pre-alpha production data to finish release. The [native replacement plan in PR107](https://github.com/Standkreis/atlas/pull/107)
prepares the complete reviewed candidate locally from the fresh production backup, then uses a
rehearsed native PG18 schema/data restore of only application objects. Existing backup rich content
and media references are retained; later personal changes may be discarded. Provider objects and
external media bytes are not replaced. Source/licensing quality and all production acceptance remain
mandatory. Native execution and its final evidence are still pending; this draft does not claim success.

The [approved migration plan](../operations/2026-09-11-germany-production-migration-plan.md),
[HTTP fence procedure](../operations/germany-production-http-fence.md) and
[operator runbook](../operations/germany-checked-import.md) retain their unchanged source/content and
historical importer contracts; the dated native plan supersedes its production transfer/personal
preservation/inverse requirements. Preview build guards
do not isolate Preview runtime credentials or old writers: the temporary Production/Preview fence,
drain and fresh checkpoint are required. Additive SQL runs through the guarded Production build.
No reset/db-push/dev-migration commands, upstream-limit bypass or application model-key experiments
are authorized. Source evidence and recovery files stay private; publish aggregate audit results.

## 🚧 Final production acceptance — PENDING

The rows follow all twelve [Epic acceptance criteria](https://github.com/Standkreis/atlas/issues/14)
in their original order. Code/source/local evidence supports review; every final acceptance entry
remains **PENDING** until root records the specified production proof and adopts this ADR.
The [production03 fence proof](https://github.com/Standkreis/atlas/issues/29#issuecomment-5645363304)
is historical: that attempt rolled back and old service reopened. Keep final native execution details in the
[#29 release record](https://github.com/Standkreis/atlas/pull/101).

| # | Epic criterion | Delivered or prepared evidence | Final acceptance still PENDING |
| --- | --- | --- | --- |
| 1 | Every intended German Kreisregion is available with a reviewed plausible set. | [Index audit][index-evidence]: all 362 intended regions ready, 214,321 memberships; [transfer rehearsal][transfer-evidence] preserves that complete scope. | Bind the active production registry/catalogue; independently compare all intended region keys, sets and summaries with the reviewed artifact, and confirm selection availability. |
| 2 | Südwestpfalz is one composite region containing Pirmasens and Zweibrücken. | [Index audit][index-evidence]: the three constituents combine before cuts, yielding 625 taxa; [search PR40](https://github.com/Standkreis/atlas/pull/40) delivers constituent lookup. | Confirm one active canonical Südwestpfalz region with the reviewed constituents/set; deployed searches for Pirmasens and Zweibrücken resolve to it. |
| 3 | Kyoto/Schagen leave selection; legacy German data is regenerated canonically. | [Migration plan PR84](https://github.com/Standkreis/atlas/pull/84), checked target mapping and [exact local apply/inverse audits][transfer-evidence]; owner-directed native replacement in PR107. | Verify Kyoto/Schagen are unselectable and legacy German selections resolve canonically. Compare actual restored data with the audited native candidate, including its rich content/media references; later personal changes are explicitly disposable under the 12 September refinement. |
| 4 | Every indexed species has minimum identity, a zero-to-12 gallery or honest fallback, and valid per-image provenance. | [Content audit][content-evidence]: 6,874 identities, complete name/gallery work and 424 completed zero-image searches; [target audit][transfer-evidence]: all 6,874 gallery receipts, eligible/hidden overlays and preserved old leads pass. | Audit every active target identity and receipt-bound gallery/provenance projection; record actual counts, fallback coverage and maximum 12, plus fresh release-time samples and deployed rendering. |
| 5 | Galleries are populated once per unique German taxon, not per regional membership. | [Enrichment PR44](https://github.com/Standkreis/atlas/pull/44) and [content audit][content-evidence]: 6,874 global gallery checkpoints for the regional union. | Match active union identities to global work/gallery receipts; prove repeated regional memberships reuse each taxon's gallery without duplicate population or changed ordering. |
| 6 | Single-image surfaces use position zero; species galleries are accessible. | [Gallery PR51](https://github.com/Standkreis/atlas/pull/51) and [browser evidence][browser-evidence]: 0/1/2/12 images, EN/DE, phone/desktop, touch/keyboard, active attribution and broken non-lead isolation. | Combine the independent production runtime lead-set audit with representative deployed gallery rendering/navigation/attribution and the retained full local accessibility/cross-consumer matrix. Record those scopes separately; confirm the audited runtime and tested consumer code match the release. |
| 7 | Onboarding starts with a welcome, not a long region list. | [Onboarding PR46](https://github.com/Standkreis/atlas/pull/46) and [EN/DE browser journeys][browser-evidence]. | With a fresh owned browser identity, verify the deployed welcome appears first and leads into explicit region discovery at phone/desktop widths. |
| 8 | Region search and location-based selection work in onboarding and Profile. | [Picker PR43](https://github.com/Standkreis/atlas/pull/43), [Profile PR54](https://github.com/Standkreis/atlas/pull/54) and [full-catalogue browser journeys][browser-evidence]. | Combine representative deployed search/selection/switching and the five reviewed public synthetic-location resolution checks with retained local granted/denied/unavailable-location journeys for both entry points. Synthetic coordinates prove resolution, not a new device-permission journey; bind the tested shared picker to the release. |
| 9 | Germany-wide discovered, studied, region and sighting progress is available. | [Progress PR42](https://github.com/Standkreis/atlas/pull/42), [Profile PR48](https://github.com/Standkreis/atlas/pull/48) and [browser assertions][browser-evidence] distinguish location-independent discovery/study from geographic wild-only territory. | Verify all four deployed totals against expected owned-fixture or existing-row calculations and the active union/BKG land scope; retain local edge-case evidence and record actual production smoke coverage. |
| 10 | Offline packs are explicit per selected region and cache one lead per included taxon. | [Browser/pack evidence][browser-evidence]: 147 unique leads for 149 Sonneberg taxa versus 979 gallery references; explicit download, cancellation/failure/resume, eviction and offline reload pass. | Record deployed explicit pack download, bytes/counts, one-lead coverage and offline reload/reconnect, including private-cache/localStorage sentinels and the deliberately empty owned outbox. Link the retained actual checked-CLI two-tab legacy→Germany→inverse/worker rehearsal for populated pending-photo/outbox preservation; do not claim that scenario reran in production. |
| 11 | Applicable application, integration, browser, build, migration, transfer and production smoke checks pass. | [Final #104 gates][transfer-evidence]: 599 unit/103 integration tests, both full-data builds, normal/shaped checked plan/apply/inverse and exact 31-table/gallery/personal audits; [browser evidence][browser-evidence] retains its stated scope. | Record final release SHA/CI/deployment/build, native schema/data archive and bounded SQL pins, non-superuser restore rehearsal, exact 34-table/schema/migration production readback, gate/fence reopening and maintenance duration; finish production health/UI/media/audio/offline/analytics smoke with observed requests/bytes and uncertainties. |
| 12 | Lasting decisions are distilled into the product spec or a superseding ADR before Epic closure. | This ADR, stable-spec supersession, glossary and roadmap updates are prepared in [draft PR100](https://github.com/Standkreis/atlas/pull/100); adoption is not yet complete. | Link final #29 evidence into every row, independently recheck all criteria and child outcomes, run document checks, then review/adopt the close-out. Preserve #53 as cancelled and #67/#93 as separate follow-ups; reconcile completion only after verified merges. |

[index-evidence]: ../records/2026-09-09-germany-index-audit.md
[content-evidence]: ../reviews/2026-09-10-germany-content-release.md
[browser-evidence]: https://github.com/Standkreis/atlas/issues/86#issuecomment-5638556302
[transfer-evidence]: https://github.com/Standkreis/atlas/issues/104#issuecomment-5645284769

Countries beyond Germany, global progress, marine-region design, full rich-content coverage,
permanent image mirroring, perceptual deduplication and public region creation remain deferred.
Keep this PR draft; root owns production verification, final adoption and tracker reconciliation.
