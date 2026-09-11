# 🚢 Germany Atlas release verification

Owner: Sven Reiser. Execution record for [#29](https://github.com/Standkreis/atlas/issues/29)
and [Epic #14](https://github.com/Standkreis/atlas/issues/14), 11 September 2026.

**Draft: production catalogue activation and acceptance remain pending.** The verified local
outcomes below are not a claim that production data has changed. This record stays in a draft PR
until the actual transfer and deployed journeys satisfy the release criteria.

## 📌 Reviewed release

Executing code: `85c4a473ee65e9418eb5fb12d132ab0a9551ba77`, clean isolated checkout.
Its [main CI](https://github.com/Standkreis/atlas/actions/runs/34630602949) passed.
Vercel Production deployment `dpl_2P7jqAbMYa2NQrkP4QbGymUbgcyE` is ready at that commit;
public health returned build `mtx9ezd9`. Deployment readiness does not activate the catalogue.

- Frozen catalogue `b59b97f4-6fdd-4900-a263-be2c05d78bbf`, registry `de-krg-2024-12-31`.
- **6,874 taxa including six accepted hybrids; 362 regions composed from 400 Kreis units.**
- 214,321 regional memberships and 151,680 regional lookalikes.
- 36,338 qualified source images; 6,450 taxa with images and 424 honest zero-image galleries.
- Union SHA-256 `6ede6e5b059fa0d3d5edc0e883654a1c7ecb2df08abae129c32c9953e25ae38e`.

The [source content review](../reviews/2026-09-10-germany-content-release.md),
[initial full transfer rehearsal](../reviews/2026-09-11-germany-import-rehearsal.md),
[approved migration plan](../operations/2026-09-11-germany-production-migration-plan.md) and
[checked operator runbook](../operations/germany-checked-import.md) retain their distinct roles.
Owner approval is recorded on [#28](https://github.com/Standkreis/atlas/issues/28#issuecomment-5634689703).

## ✅ Integrated verification

- [#95 / PR #97](https://github.com/Standkreis/atlas/pull/97) made the entire integration suite
  safe on a full production-copy catalogue: 98/98 tests, no skips, with exact preservation.
- [#86 / PR #89](https://github.com/Standkreis/atlas/pull/89) reran the full 98-test suite on a
  fresh applied clone, then 563 unit tests, typecheck/lint, 13,769-page export and production build.
  Final EN/DE browser journeys covered onboarding, switching, studies/discoveries, coordinate/wildness
  territory rules, galleries, analytics privacy and cache transitions. All 34 public-table digests
  were identical before and after browser cleanup.
- [#98 / PR #99](https://github.com/Standkreis/atlas/pull/99) passed 590 unit and 99 integration
  tests, both builds and exact-head CI. Its additional post-drain expiry case also passed on a
  fresh full-applied clone in 21 seconds, preserving all 31 product tables exactly.
- Both full-applied runs retained protected fingerprint
  `c243118fc884e513cc0e761700b5c9ff433b3ba5c3747d10784cc0333262f45d`.
- Runtime UI/gallery/pack code is unchanged by the final test-harness and ETL guard merges.
  Prior real-network browser measurements are retained as explicitly aggregate evidence;
  no claim is made that one final unscoped command reran every measured scenario.

The actual 16-cell gallery matrix covered 0/1/2/12 images, EN/DE and 390/1280px widths, native
touch, keyboard boundaries, live position, active attribution and broken non-lead isolation.
Cold twelve-image views transferred 3–4 gallery responses, zero cached, roughly 302–348 kB,
not all twelve images. Sonneberg's explicit pack contains 147 unique eligible leads for 149 taxa
(two imageless), versus 979 gallery references. Its actual EN run stored 4,507,850 bytes and
transferred 3,607,907 incremental upstream encoded bytes through cancel/failure/resume. The DE
control used explicitly local deterministic bytes, not another CDN measurement. See
[complete browser evidence](https://github.com/Standkreis/atlas/issues/86#issuecomment-5638556302).

## 🔬 Release-time image availability

The owner-approved [#98 refinement](../operations/2026-09-11-germany-production-migration-plan.md#-11-september-addendum-representative-release-availability)
preserves the original complete successful 36,338-URL audit. All twelve deterministic reviewed
release samples passed with **twelve CDN requests, zero reused checks and no provider API collection**.
Fresh report SHA-256: `f3d6aa7e3df222eed6e8b28a0a676d7c7e3e27f29813a200a0c68f78c0b8ac95`
(7,139 bytes). Frozen source, whole-set audit and all scientific/licensing bindings remain mandatory.
Availability is not a guarantee of future availability, identification, rights or decoding.

## 🔁 Final actual operator/client rehearsal

The actual checked CLI, not synthetic SQL catalogue toggles, performed plan → apply → recover on
a fresh local PG18 clone. An owned ninth Filter and identity were present in the immutable baseline
before planning; no fixture was inserted during the operation. Browser writes were blocked locally.

| Binding | Value |
| --- | --- |
| Operation | `germany-29-operator-final-20260911-01` |
| Plan fingerprint | `4dba75bfca304852f5e757d79f08cdf6a25a78bcc775fb573262cf0fa324f730` |
| Receipt fingerprint | `56fa01aeba8ae1a68c2b4d49a637f01273cfeeafc861588ebff5daf6d6525ed3` |
| Receipt file SHA-256 | `084e502befa2ef3bad7bd8c236bae3e630f88cc776b6e36508e87e1321a4a3a3` |
| Before and recovered 31-table fingerprint | `98d3a62d16401f8af2851c3490407bd4721a901928ff06037dcbbc73b16e6784` |
| Applied 31-table fingerprint | `acbbfa817ebabf77ecce154b9e5b0b858031e5a62be12ef70c2cd383862f6947` |
| Independent applied-audit SHA-256 | `d16b647170246418ecc52e3ce000a0050455ecd203a4b9ed0c526be4290acb00` |
| Independent recovered-audit SHA-256 | `d0371756a967952db83d9efd6bd0a0b79f31e30e7ce184c900eaab9c9060547a` |

Independent read-only verification replayed every receipt mutation in memory against the immutable
baseline and proved exact applied after-images for all 31 tables. It checked all 6,874 target gallery
receipts and their runtime projections: 36,338 eligible images, 313 retained hidden references,
1,241 existing eligible leads preserved, maximum twelve. All 1,786 original Assets, 24,954 original
taxon IDs, personal tables, 34,104 nonempty protected field values and 3,586 existing names survived.
These are rehearsal counts, not the later fresh production snapshot. Recovery restored the complete
31-table baseline exactly; both operations finished with an open, drained database gate.

Two same-profile tabs received genuine trusted storage events through legacy → Germany → legacy.
Persisted regional queries followed the authoritative identity, incompatible public packs/markers
were removed, and the pending photo's 4,220 bytes/SHA, draft, owner and private-cache sentinel survived.
A queued canonical Sonneberg scan became explicitly recoverable after inverse; the rendered phone
sheet offers **“Use Südwestpfalz.”** An unrelated study received an explicitly mocked local
acknowledgement; zero identification calls occurred.

Both tabs then received trusted `controllerchange` events. Debugger inspection verified executed
worker bytes against the historical SHA `f8d8ac62edcc6c6efdac9ed504cedee44a7127c54c0f84a45ef02f3f277ab5fb`
and current SHA `2be821884ed35a3e2c3a4e52dae67c82f9498dec5115138557111a137879b365`.
The historical worker used the current compatibility client, not a full historical app build.
One private harness input used invalid `tiles:[]` after the core inverse assertions; that diagnostic
is retained. The corrected read-only continuation completed study/worker checks in the same live
tabs. This is aggregate evidence, not an uninterrupted harness pass or a hidden application failure.

## 🚧 Production execution — pending

Read-only preflight verified all sixteen checked migrations, the three new FK indexes, the installed
Neon Launch plan, no custom environments, no project bypass/deploy hooks, and an empty disabled
firewall with no draft or bypass rules. Reviewed Taxon/Region/reference Asset/live-set/Interaction
scope is unchanged from the earlier backup. Two personal, non-global photo rows disappeared before
this session's operation; the new quiescent backup must capture current personal state rather than
reuse historical totals. No unexplained active writer was observed.

Authenticated current and old Preview health checks pass. Development OIDC tokens are rejected by
protected immutable Production deployments with `TRUSTED_SOURCES_ENVIRONMENT_MISMATCH`; this is
not WAF enforcement. Shared-browser Vercel sign-in and stable AC power are outstanding preconditions.
No production transformation or firewall modification has occurred.

The actual fence/drain, fresh backup/restore, exact-bound production plan/apply, independent audit,
reopening and deployed browser/media/audio/offline/analytics smoke evidence must replace this pending
section before #29 closes. Personal before-images, credentials, raw receipts and browser profiles
remain owner-only outside Git. Epic #14 additionally needs its dedicated ADR close-out review.
