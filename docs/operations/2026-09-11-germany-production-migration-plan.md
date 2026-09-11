# 🔁 Germany Atlas production migration plan

Owner: Sven Reiser. Prepared 11 September 2026 for [#28](https://github.com/Standkreis/atlas/issues/28); execution and production acceptance belong to [#29](https://github.com/Standkreis/atlas/issues/29).

**Status: prepared for owner review, not execution approval.** This document selects the preservation-first route, not a database wipe. The owner's pre-alpha permission to lose progress is not needed by the successfully rehearsed operation. A hosting upgrade is a separate billing decision and does not approve this transformation.

## 🎯 Exact outcome

Activate the frozen German regional union: **6,874 taxa, including six accepted hybrids, in 362 Kreisregionen**, composed from 400 authoritative Kreis units and 402 operational GADM queries. Keep the regional denominator local; Germany progress intersects personal discoveries/studies with the union. Studying is independent of location.

- Südwestpfalz (`de-krg-07340000`) includes Landkreis Südwestpfalz, Pirmasens and Zweibrücken.
- Mainz-Bingen (`de-krg-07339000`) returns as a regenerated canonical region.
- Kyoto and Schagen have no German successor and cannot be newly selected after activation. Their historical rows and personal references are not blanket-deleted.
- Preserve existing Taxon UUIDs by exact GBIF identity, all existing Assets and personal records, and nonempty reusable names/rich content. No fuzzy taxon/photo-driven identity merge.
- Preserve valid existing gallery leads, append approved source images up to 12, and retain unsupported or uncertain images with explicit hidden reasons. Licence corrections are supported overlays, never destructive rewrites of the old Asset evidence.

## 📌 Frozen source and code

The [content release review](../reviews/2026-09-10-germany-content-release.md) and [full import/recovery rehearsal](../reviews/2026-09-11-germany-import-rehearsal.md) are complementary: source quality does not prove target preservation.

| Binding | Value |
| --- | --- |
| Catalogue | `b59b97f4-6fdd-4900-a263-be2c05d78bbf` |
| Run | `germany-2016-2026-taxonomy-v2-20260909` |
| Registry | `de-krg-2024-12-31` |
| Gallery policy | `licensed-gallery-v7` |
| Union SHA-256 | `6ede6e5b059fa0d3d5edc0e883654a1c7ecb2df08abae129c32c9953e25ae38e` |
| Base artifact SHA-256 | `7a5327dd06f16c2581d3fcab117b9ef01f3c9687363c14f3dabcb1aae672d06a` |
| Gallery artifact SHA-256 | `af277bea649a10f1f8bd74ebf00f78e982ae2584f27abff3ec5b10909275b99c` |
| Reviewed importer on main | `e94804c5b7bfacc3bf8dda334e4833f843787d1c` ([PR #80](https://github.com/Standkreis/atlas/pull/80)) |

The execution configuration must bind all six frozen file descriptors, their internal audit/content/taxonomy fingerprints, the target-gallery review and the exact clean executing HEAD. Use the current merged release HEAD only after demonstrating the importer and schema still match the reviewed implementation; new behaviour requires affected checks and plan review, not an unchecked cherry-pick. The final execution record must state the full commit, not just a branch or moving tag.

The original source review and original URL report remain immutable. A fresh availability report for precisely the same 36,338 source image URLs may renew the 24-hour release window without changing species, image membership, ordering, rights or the original review. Any failed URL or source/review mismatch blocks application; do not silently remove a photo to obtain a green report.

## 🧬 Exact transformation boundary

The [operator runbook](germany-checked-import.md#identity-and-transformation-contract) enumerates all affected columns, the fixed 31-table snapshot and client/cache fields. Its table and cache lists are normative parts of this plan.

| Operation | Scope and preservation rule |
| --- | --- |
| Taxon materialization | Map 6,874 source identities by exact GBIF key. Rehearsal reused 4,361 target UUIDs and inserted 2,513; all 24,954 old UUIDs survived. Preserve nonempty target common names per language, Wikidata IDs and rich fields; conflicting identities abort. |
| Region/registry | Reuse exact canonical or reviewed legacy-successor UUIDs; create the remaining canonical regions; retain unrelated/retired history. Activate the registry only in the final atomic transaction. |
| Catalogue graph | Import only the selected catalogue version, builds, accepted-taxonomy resolutions, enrichment evidence and union. Map every supported Taxon/Region reference. |
| Derived regional sets | Replace only enumerated mapped German and retired legacy `Plausibility`/`Lookalike` sets. New live totals are 214,321 memberships and 151,680 lookalikes. Memberships precede their dependent lookalikes on insert; deletion reverses this order. |
| Reference galleries | Source contains 36,338 qualified images. Rehearsal reused 1,241 existing Assets and inserted 35,097. All 1,786 old Asset rows survived exactly, including sounds and personal photos. Target-specific receipts and visibility overlays, not source work alone, govern display. |
| Existing in-union references | 1,554 retained: 1,241 eligible old leads and 313 hidden references with exact reasons. Thirty-eight eligible Commons rows have verified licence-URL overlays; original rows remain unchanged. Sixty outside-union global references remain untouched. |
| Filters and region-keyed JSON | Remap explicit successors, preserve saved order and unrelated fields, deduplicate and keep a valid current saved region. With no surviving German successor, retain an empty selection and return to region discovery; never invent a region. Remap only supported prose v1 region keys; preserve unsupported nonempty shapes and unrelated historical keys. Colliding unequal keys abort. |
| Protected personal/global content | Preserve Identity, EmailCode, Passkey, Sighting, Study, ScanWork, PhotoDeletion, QuotaBucket, Interaction and all old Asset rows; preserve unaffected Taxon/registry/catalogue/history rows. No image/audio bytes are copied or deleted by this operation. |

Gallery ordering is explicit: preserve every existing `Asset.position` unchanged along with `Asset.author`, `licence`, `licenceUrl`, `sourceUrl`, `origin`, `url`, `caption`, `meta` and ownership references. `ReferenceAssetVisibility.targetPosition` supplies the reviewed effective zero-based order; hidden references have no display position and retain `hiddenReason`. `ReferenceAssetVisibility.correctedLicenceUrl` is the supported display-only correction. `ReferenceGalleryReceipt.resultSnapshot` and `resultFingerprint` bind the resulting ordered gallery independently from the retained source snapshot/evidence. Position zero is the eligible lead for cards and packs. Recovery restores exact before-images and removes only unchanged rows proved inserted by this operation.

The representative backup has 85 identities, 29 sightings, 11 studies, 17 quota rows and 186,658 interactions. Those counts may legitimately grow before production. Exact current protected before-images, not these historical counts, are mandatory at execution. Newly changed gallery/taxonomy/region identities require a refreshed review; ordinary personal additions may be incorporated into a new preservation-only snapshot and receipt.

After rehearsal the target has 27,467 total global taxa, 36,883 Assets and 363 retained Region rows, but only **6,874 Germany taxa and 362 selectable German regions**. Storage/global counts must never become the user-facing denominator.

## 💾 Capacity, backup and maintenance budget

Formal local PG18 rehearsal measured **644,511,423 bytes** at its sampled peak, including retained content and indexes. Product tables occupied 633,987,072 bytes, including 236,503,040 index bytes. Two-second sampling gives a lower bound, not an absolute worst-case guarantee. No extra JSONB staging table is used; materialization and activation commit together.

The then-installed Neon `free_v3` plan was verified at 0.5 GB per project and was insufficient. The owner subsequently upgraded the existing integration, and a read-only Vercel query verified **`launch_v3` / Launch**, installation-scoped, at $0.35/GB-month storage and $0.106/CU-hour compute ([verification](https://github.com/Standkreis/atlas/issues/28#issuecomment-5633156461)). The Free-plan blocker is resolved. Before transfer, verify the actual target capacity, compute configuration and headroom. Account separately for provider history/WAL and other databases/branches; do not delete history to make the plan fit or infer approval for another paid change.

Plan operational headroom above the 645 MB measured footprint, rather than a limit barely above it. Before starting, measure and record a disk budget covering all coexisting frozen inputs, fresh backup and restored clone, one complete receipt, a potentially full retained partial plus retry, current reports, logs and explicit margin. Do not substitute a fixed 2 GB minimum for that calculation. The successful receipt alone is **634,051,086 bytes** outside the database; failed exclusive writes deliberately retain their partial files. The original custom-format backup was 9,565,183 bytes; a fresh archive's size may differ. Keep all private artifacts owner-only, outside Git. Run Node 24 with the successfully rehearsed `NODE_OPTIONS=--max-old-space-size=8192`; verify available host RAM/swap separately because this is an 8 GiB JavaScript heap ceiling, not a disk allocation or a whole-process memory bound.

The measured database write pauses were approximately **139 seconds for apply** and **96 seconds for inverse recovery**, with two-second sampling uncertainty. These are not the total production outage. The temporary project-wide HTTP fence below also covers old-request drain, a fresh backup/restore, planning, receipt preparation, apply-side validation and independent verification. Reserve a provisional **30–60-minute maintenance window**, subject to the measured preflight and production network/compute; this is an operational estimate, not a promised SLA. Announce the actual start and end separately from the database gate interval. Do not start while power/network are unstable. A failed/ambiguous operation remains fenced until independently resolved.

## 🚧 Temporary HTTP fence

Use the companion [reviewed Vercel WAF procedure](germany-production-http-fence.md) as a normative part of this plan. It binds the existing Standkreis project and an explicitly published, highest-priority, nonpersistent deny rule covering every Production and Preview HTTP path. Users will temporarily receive **403**, including on the public site; this is intentional maintenance, not a claim of a friendly maintenance page. No plan change, new paid feature, deployment deletion, credential rotation or permanent client block is authorized.

The operator must verify the empty-rule/no-bypass/no-draft baseline again, inventory custom environments and stop if any reachable production-credential writer is outside the reviewed fence. After publication, prove WAF denial on the public domain and authenticated current/old Production and Preview URLs. Wait the verified maximum duration of all reachable pre-fence functions (not just the current 300-second cron), stop owned direct writers, and inspect activity before taking the new backup. SSO protection and the database admission gate alone do not protect against old deployed writers.

Keep the HTTP fence in place through backup, plan, apply and independent committed-state verification, even if the importer has reopened its database gate. Explicit enablement is part of staging the reviewed fence; require the enabled draft before publication. Then remove only the recorded temporary rule, restore the original disabled firewall state, inspect and publish that exact two-change restoration, and verify service. Retain the active deny configuration version for immediate re-fencing if reopening fails. Any guarded inverse first restores and verifies the HTTP fence and drains existing work; it does not run through an open public site.

## 🛫 Execution checklist — #29

1. **Approval and deployment:** retain the owner's explicit approval of this concrete plan and any separately approved hosting change. Verify final CI and production build/commit, the #59 build guard and #62 compatible client/writer deployment. Confirm analytics and remaining release checks separately. Perform the companion HTTP-fence preflight and approved activation; inventory and drain old deployments, scheduled tasks and direct writers. Do not proceed on an unverified fence.
2. **Schema and capacity:** verify exact `_prisma_migrations` names, completion state and SQL SHA-256 checksums against the release checkout. Checked-in additive migrations run through the Production Vercel build only. Retain the historical dormant marine migration exactly; no WoRMS behaviour or data is enabled. Verify the paid/free plan actually in effect and adequate storage/recovery headroom.
3. **Fresh checkpoint:** after writers are quiescent, take a consistent, read-only custom-format production backup with a PG18-compatible client. Hash and securely retain it. Restore into a new local PG18 database; compare counts/digests. Never restore over production or the immutable earlier checkpoint. Compare the fresh target's identity, gallery, rich-content and derived-set scope with this review; investigate material differences. Backup, plan and apply must describe one unchanged target generation. If target changes require replanning, refresh the backup and local restore/digest proof too.
4. **Exact plan:** pin the clean final executable HEAD and a unique operation ID/activation timestamp. Validate all frozen source and target-review descriptors and fresh image availability. The owner's action=`plan` manifest permits only read-only plan generation and binds code/config/target, not a receipt that does not yet exist. Generate the deterministic plan and private JSONL receipt; inspect all mutations and preservation scopes. Under the owner's explicit conditional approval of this plan, bind target hostname/port/database, configuration digest, plan-record digest, plan fingerprint and exact receipt fingerprint/SHA/size in a distinct action=`apply` execution manifest. The operator must independently inspect and verify these newly generated bindings against the approved scope; do not claim the owner previously saw a future hash. A valid manifest is not proof of authority by itself. Guarded inverse likewise requires its own action=`recover` manifest and actual-state safety assessment, and may use the same recorded owner approval only if it explicitly covered this conditional recovery procedure.
5. **Final preflight:** recheck power, network, current URL-report freshness and all product release gates. Ensure enough individual-check lifetime remains for the expected drain/apply period; the implementation also rechecks freshness after a long drain. Recheck target snapshot immediately before apply; concurrent changes force a new backup/plan, never an override. Persist the release-intent record before database work. Intent is not a success receipt.
6. **Apply:** use only the checked `catalogue-import-cli.ts apply` command and private files defined in the runbook. The distributed gate closes new write admissions, existing admissions must drain, and one SERIALIZABLE transaction locks/checks the exact before-images, materializes rows, publishes regional sets and activates the catalogue. Neither force flags nor direct SQL substitutions are permitted. A changed target or nonempty drain stops the operation safely.
7. **Independent verification:** retain command result and operation/gate state. Recompute the full target counts and protected before/after proofs, validate all target-specific gallery receipts and selected leads, confirm retired selection is unavailable and all filters have valid/empty outcomes. The importer independently verifies its committed expected state before reopening. Root performs a further independent readback and production smoke; any uncertainty requires immediate guarded maintenance/recovery assessment, not a success announcement.
8. **Production journeys:** verify public health/build, EN/DE onboarding, constituent search, region selection/switching, Profile and Germany progress; representative 0/1/2/12-image galleries and attribution; retained audio playback from Blob; explicit regional offline packs, cache-version transition and personal outbox preservation. Record requests, bytes, counts and limitations. Verify analytics script/intake/dashboard without private values.
9. **Delivery record:** publish only sanitized aggregate evidence, exact source/code/build pins, refreshed backup/report/receipt hashes, observed target counts and maintenance duration. Keep personal before-images private. Complete #29 only after actual transfer, deployment and independent production acceptance; Epic #14 requires its own final ADR and close-out review.

## 🧯 Abort, inverse and client recovery

- **Before commit:** a failed transaction must leave the old product snapshot unchanged. Keep maintenance closed until an independent audit proves the old state and no outcome is uncertain. Do not remove another operation's admission or gate ownership.
- **Connection loss near commit:** inspect the exact committed before/after state before any retry. A release-intent file or absent success log cannot distinguish committed from uncommitted work.
- **After commit:** the reviewed inverse uses the same exact receipt, gate/locks and compare-and-swap guards. It deletes only rows proved newly inserted by this operation and still matching their after-images, restores changed rows and reverses activation order safely. The formal rehearsal restored all 31 table fingerprints exactly.
- **New work since activation:** changed imported after-images or newly created inbound references block automatic inverse. Stop for a preservation decision; do not disable guards or restore the old backup over newer user data. Broad pre-alpha flexibility is not an instruction to bypass this boundary.
- **Client state:** transition legacy/null catalogue identity to the new version, and back on inverse. Invalidate the runbook's exact persisted queries and old public region packs. Do not clear all site data, identity ownership, outbox photos/drafts or personal caches. Offline tabs may retain a coherent old version until online synchronization. Missing queued canonical regions offer explicit region recovery; unrelated valid queue work continues.
- **Pack scope:** only explicitly downloaded regions get rebuilt, using one eligible lead per member, not all gallery images. Failed downloads must not be marked ready. Keep private-photo cleanup separate from public pack invalidation.

## ✅ Approval boundary and deferred work

Ask the owner once to approve this concrete preservation-first plan, the temporary whole-site Production/Preview HTTP fence and its removal/re-fencing, fresh checkpoint/planning, the exact-bound conditional apply, and guarded inverse only when its unchanged-state predicates are proven. Distinct action-specific `plan`, `apply` and `recover` execution manifests remain mandatory and are not interchangeable. One explicit approval may cover all these specified conditional actions; it does not require three separate conversational approvals. Record what the owner actually approved and bind each action to the verified files and actual state available at that boundary. Ask again for material changes to source, target, preservation, recovery, fence semantics, cost or scope—not for mechanical freshness refreshes within the unchanged approved contract. This approval does not authorize another paid upgrade, a database wipe, upstream-limit bypass, model spending, new licence rules, new catalogue membership or unreviewed rich-content publication.

Optional Wikipedia introductions, Steckbrief fields, prose and bird recordings for every taxon remain follow-up coverage, not secretly completed by this milestone. Existing reusable content and all audio Asset rows are preserved. Reference-image availability remains external and can change after a successful check.

At publication, this is the owner-reviewable plan, not evidence that production was migrated. Record approval and execution separately on #28/#29, with final production evidence linked from the release record.

## 🔎 #28 acceptance and delivery trace

All implementation children are merged: [#59 / PR #64](https://github.com/Standkreis/atlas/pull/64), [#60 / PR #66](https://github.com/Standkreis/atlas/pull/66), [#61 / PR #68](https://github.com/Standkreis/atlas/pull/68), [#62 / PR #69](https://github.com/Standkreis/atlas/pull/69), and [#63 / PR #70](https://github.com/Standkreis/atlas/pull/70), including #63's reviewed importer children. This document closes the plan/delivery container, not the release.

| Acceptance | Evidence / remaining execution boundary |
| --- | --- |
| All tables, caches, ordering and recovery enumerated | Normative operator-runbook contracts linked above, target-specific gallery policy, and companion HTTP-fence procedure. |
| Checked implementation tested on representative data | Formal06 production-copy PG18 plan/apply/recovery; exact 31-table restoration, fault-injection tests and hardened full receipt round-trip in the rehearsal review. |
| Every affected selection valid or explicitly empty | All eight representative filters passed; seven valid nonempty selections and one intended discovery fallback. Fresh production filters must pass the same proof. |
| Personal records and reusable content preserved | Exact old Asset and protected-table digests; all 24,954 original Taxon UUIDs; nonempty rich/name preservation. This is not a claim of complete new rich content. |
| Gallery ordering/provenance survives without duplication | All 1,241 eligible old leads retained, 313 hidden with reasons, 38 licence-link overlays; original Asset rows unchanged and all 6,874 target receipts independently audited. |
| Retired regions unavailable; canonical Mainz-Bingen available | Applied-snapshot region/filter audit and 362-region API sweep; actual production behavior is rechecked after #29 activation. |
| Cache transition coherent; packs remain lead-only | #62's delivered catalogue/queue/cache implementation and tests, plus [applied-preview explicit lead-only pack evidence](https://github.com/Standkreis/atlas/issues/29#issuecomment-5634263835). Final integrated/browser and production checks remain #29's gate. |
| No unapproved production transformation | #28 publishes the concrete reviewable plan only. Record owner approval before #29 executes any production transformation or temporary HTTP fence. |
