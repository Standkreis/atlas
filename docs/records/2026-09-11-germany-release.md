# 🚢 Germany Atlas release verification

Owner: Sven Reiser. Execution record for [#29](https://github.com/Standkreis/atlas/issues/29)
and [Epic #14](https://github.com/Standkreis/atlas/issues/14), 11 September 2026.

**Draft: production catalogue activation and acceptance remain pending.** The verified local
outcomes below are not a claim that production data has changed. This record stays in a draft PR
until the actual transfer and deployed journeys satisfy the release criteria.

## 📌 Reviewed release

First-attempt code: `85c4a473ee65e9418eb5fb12d132ab0a9551ba77`, clean isolated checkout.
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

The owner verified healthy current and old immutable Production pages in his own authenticated
browser, then confirmed both became Forbidden after the approved fence was activated. No deployment
protection bypass or shared credential was introduced. Root separately proved public Production
and authenticated current/old Preview changed from healthy HTTP 200 to HTTP 403 with explicit deny
headers. Firewall metrics attributed those three probes to the exact temporary rule; request-ID
log queries showed no matching invocation records.

Maintenance began at **19:26:49.758 UTC**. The exact reviewed deny rule
`rule_germany_catalogue_cutover_deny_all_http_80s24f` was activated in configuration version **1**, with
no remaining draft or bypass. Initial explicit enablement created an enabled draft; the platform's
change list recorded only the subsequent rule insertion. The full semantic projection, not an
assumed change-list count, was verified before publishing. AC power is connected and charging.
All required before/after access evidence was established by **19:30:40 UTC**. A conservative
1,800-second platform function ceiling plus 30-second margin puts the earliest fresh backup at
**20:01:10 UTC**; this does not claim every old deployment was configured for 1,800 seconds.

The full local receipt and related evidence, plus the fence proofs, are copied to owner-only
persistent recovery storage outside Git, excluding credentials and browser profiles. Fence evidence
files and their directory were explicitly flushed.

### 🛠️ First production attempt: safely aborted

The fresh quiescent backup (SHA-256
`68fb9b22a7bf8982d1833e2e7804c0d8761988405d909983142a714be258a8bb`, 9,569,680 bytes)
restored successfully into a new local PG18 database, with all 34 public-table digests matching.
The exact-bound checked apply then exceeded its aggregate Prisma transaction deadline:
120,000ms configured, 125,939ms elapsed. This does not identify the precise failed query phase.
Both maintenance fences remained closed during investigation; no blind retry or inverse ran.

At **20:26:15 UTC**, an independent full receipt reread and comparison of all 31 product tables
proved both the immutable backup and live target still matched the planned before-state:
`226059543c727306684c9871af7c1af9fdeb2d0ca4d708c89d80fcdc1939eebf`.
The failed CLI had exited and no other client backend remained. No catalogue transformation
committed; the exact protected data survived unchanged.

After independent review, live-fence verification and those checks, the repository's matching-owner,
target and empty-admission helpers reopened the gate at **20:27:48 UTC**. The exact temporary WAF
rule was removed and disabled/zero-rule semantics restored in published configuration **2**, with
no draft. The API change list showed only rule removal; the separately requested disabled boolean
was verified in the resulting configuration. By **20:29:14 UTC**, public Production health was
200/`ok:true`, build `mtx9ezd9`; current and old authenticated Preview were healthy too.

[Execution and abort evidence](https://github.com/Standkreis/atlas/issues/29#issuecomment-5640268308)
records the bindings. Backup, receipt, failed log, monitor and exact rollback/gate/WAF proofs are
retained and flushed in owner-only persistent recovery storage. The existing app was restored.
[Child #102](https://github.com/Standkreis/atlas/issues/102) owns the narrow aggregate-budget fix,
tests and fresh full-size local rehearsal. A new exact-bound production attempt remains pending.

### ✅ Bounded timeout fix and fresh full-size rehearsal

[#102 / PR #103](https://github.com/Standkreis/atlas/pull/103) merged as
`e96544e5eb90bde996b34fb58c1f0978491cfff3`; its tree exactly matches the checked issue head
`2873418f35f7f3f89884c2c77cbd63910b94a2e5`. Only the importer aggregate budget changed to
600 seconds. SQL statements remain bounded at 120 seconds, locks/acquisition at 30 seconds;
short gate transactions, atomicity and preservation guards are unchanged.

The complete application check passed against full local data: typecheck, lint (zero errors,
six existing warnings), 590 unit tests, 13,769-page static export and production-server build.
All 101 integration tests passed, including a real two-statement 122-second sequence followed
by further SQL and an injected failure proving exact rollback with maintenance closed.

A fresh local restore of the actual production backup then completed checked plan/apply/recovery.
Independent audits proved every receipt-derived after-image and exact restoration of the original
31-table fingerprint `226059543c727306684c9871af7c1af9fdeb2d0ca4d708c89d80fcdc1939eebf`.
All 1,784 current original Assets and 24,954 original taxon IDs survived, including 34,104 protected
nonempty rich values and 3,586 existing names. Both operations ended open and drained.

Whole-CLI timings were 173.926 seconds for plan, 431.138 for apply and 151.695 for recovery.
Two-second sampling bracketed maintenance at roughly 127/74 seconds, including nontransaction
work; neither measure is a transaction-duration claim. Sampled peak across apply/recovery was
650,483,391 bytes. The [acceptance review](https://github.com/Standkreis/atlas/issues/102#issuecomment-5640524613)
retains exact audit hashes and current-head CI evidence. Production retry remains separately gated.

### 🛡️ Second maintenance window

The clean second-attempt release head is `e96544e5eb90bde996b34fb58c1f0978491cfff3`.
[Main CI](https://github.com/Standkreis/atlas/actions/runs/34646762801) passed, and matching
Production deployment `dpl_4L1VA3m7KuguCzywkpHvTUQpxwja` was Ready with health build `mtxfring`.
The reviewed deny configuration was reactivated at **21:03:29.570 UTC**, from the exact
disabled/zero-rule configuration2. No new rule semantics or protection bypass was introduced.

The owner confirmed both current and old immutable Production health URLs were healthy before
activation and returned 403 afterward. Root's public Production and authenticated current/old
Preview probes also returned explicit WAF denial. Complete proof was recorded at
**21:20:27.227 UTC**; the new 1,830-second drain ends **21:50:57.227 UTC**. The activation,
authenticated before/after evidence and verification record were independently hash-checked and
flushed into owner-only persistent storage. The prior attempt's target backup is not reused.
[Second-window proof](https://github.com/Standkreis/atlas/issues/29#issuecomment-5640784290)
records this execution boundary.

The fresh read-only backup completed at **21:52:20.585 UTC**, with 9,569,680 bytes and SHA-256
`be941bfd83c87acafc52597a6c2594a635d49c9bea9e14779ad205b4e812103f`. It restored to a new local
PG18 clone; all 34 public-table row counts and digests exactly matched production. At
**22:00:41.368 UTC**, independent full-receipt verification proved both the new backup and live
target match the receipt's complete 31-table baseline `226059543c727306684c9871af7c1af9fdeb2d0ca4d708c89d80fcdc1939eebf`.
This matches the earlier snapshot as an observed result, not by reusing its checkpoint.

| Second-attempt binding | Value |
| --- | --- |
| Operation | `germany-29-production-20260911-02` |
| Configuration digest | `64c5a6906841c460180d6f8de082c3a4464752d95c673be82e7e77ec4d961f75` |
| Plan fingerprint | `8b32349a907ee93b01406342bb8af2daefed0299b4d0cdbdf9b2c31dfdc66a8b` |
| Receipt fingerprint | `5777b54ea52e7a97a5334908e1a620c06367f392a19ad20b17262e640bf3472e` |
| Receipt file SHA-256 | `b6ec628891cc4098388384484a3932de0221a87fec57edbe49cadecbcbe355f6` |
| Receipt size/scope | 634,051,078 bytes; 873,556 mutations; 16 protected scopes |

The plan preserves the approved 362 regions, 6,874 taxa and 36,338 eligible images: 1,241 existing
references reused, 35,097 Assets inserted, 313 retained hidden references and 6,874 gallery receipts.
Nine checkpoint/config/plan/receipt/approval files were independently hash-checked and fsynced in
persistent owner-only storage before apply. The final activity check found no other database
sessions and zero admissions; post-fence application logs remained empty across the hourly cron
boundary. Read-only monitoring began at **22:02:20.364 UTC** alongside the checked apply.
[Exact apply binding](https://github.com/Standkreis/atlas/issues/29#issuecomment-5641128403).

### 🛠️ Second production attempt: safely aborted

The apply again exceeded the aggregate Prisma deadline: **600,000 ms configured, 612,833 ms
elapsed**, reported by `$executeRawUnsafe`. The monitor observed storage growth to 406,716,416
bytes with zero admissions; those physical bytes did not prove commit. A read-only activity sample
showed `ClientRead` rather than a lock wait, consistent with transfer/client overhead but not a
complete network diagnosis.

After the importer and monitor exited, an independent complete-receipt and 31-table readback at
**22:19:10.283 UTC** proved exact equality with the fresh before-state fingerprint
`226059543c727306684c9871af7c1af9fdeb2d0ca4d708c89d80fcdc1939eebf`. No catalogue transformation
committed. Rollback-proof SHA-256: `b446f16bb9cd0e6e58eed6c1bbe89c4bf5332b0ecffb9c8fb291090c7378a559`.

Root and an independent reviewer checked the short abort wrapper. With the failed PID absent,
zero other database clients, fresh exact proof, live fence and matching drained gate owner, it
reopened the gate at **22:20:23.263 UTC**. The exact maintenance rule was removed and the original
disabled/zero-rule semantics restored in published configuration **3**, with no draft. At
**22:22:04.626 UTC**, public Production and current/old authenticated Preview health were all
200 with the expected builds; public Production remained `mtxfring`.

The [second abort record](https://github.com/Standkreis/atlas/issues/29#issuecomment-5641309302)
separates evidence from diagnosis. Backup/receipt and nine further failure/rollback/restoration
artifacts are hash-verified and fsynced in private persistent recovery storage. Existing service
is available; the nationwide catalogue is still not activated. Further transfer remediation and
a fresh checked attempt are required before this release record can be adopted.

### 🔬 12 September: bounded-transfer remediation

[#104 / PR #105](https://github.com/Standkreis/atlas/pull/105) merged at
`8d6e464c47d68ed45689600b4968e75f5bfe0d74`, with an exact tree match to the checked candidate;
#104 is reconciled Done. It addresses avoidable round trips, not another timeout increase.
The reviewed candidate is
`b2d754c53bc257a24fb88322367e584c0a8ee5d2`. Writes and inverse mutations use deterministic
10,000-row / 4 MiB UTF-8 JSON bounds; keyed reads use 100,000 keys / 4 MiB. The retained
receipt's DML requests fall from 888 to 168 without reducing its 873,556 mutation rows.
All snapshots, preservation checks, atomic publication and recovery predicates remain intact.
Aggregate/statement/lock limits remain 600/120/30 seconds. An independently found Unicode
collation-tie ordering defect was fixed with a real 4 MiB-boundary regression proved red/green.

Root reran the complete check on full local Germany data: 599 unit tests, typecheck, lint
(zero errors, six existing warnings), 13,769-page static export and production-server build.
Full integration passed 103 tests in 16 files on a fresh owned local PG18 database.
No Neon development or tests were used.

The corrected-head normal full-size plan/apply/inverse rehearsal passed. Atomic apply including
commit took 59.387 seconds; separately timed post-commit verification took 29.686 seconds;
whole apply CLI took 303.796 seconds. Atomic inverse took 47.636 seconds, separate verification
9.335 seconds and whole inverse CLI 113.090 seconds. Independent applied and recovered audits
passed, with recovered 31-table fingerprint
`226059543c727306684c9871af7c1af9fdeb2d0ca4d708c89d80fcdc1939eebf`.
Applied audit SHA-256: `26dbdc52fbcbfafa7e3fe0d551268eb539a0b99a0554166979765867f11fbb90`;
recovered audit: `3622674abbf0ef21ad4f5c87326a8af75f84f5c22645704fe15bbf90c034b425`.

The fresh network-shaped clone uses a reviewed synthetic profile: 250 ms nominal RTT,
125 ms per-direction latency with ±35 ms jitter, and 8 MiB/s per direction. It is not a
measurement of production throughput. Checked apply passed: atomic commit in **384.506 seconds**,
leaving **215.494 seconds / 35.92%** of its deadline; separate post-commit verification took
192.674 seconds, and whole CLI took 857.550 seconds. Writes carried 464,997,743 encoded JSON
input bytes in 168 requests. Input counts exclude responses and protocol overhead; the proxy
measured these separately and reported no connection/queue errors. The importer reopened the
local gate after verification. The guarded inverse also passed: atomic commit in **429.171 seconds**,
leaving **170.829 seconds / 28.47%** of its deadline; separate post-commit verification took
52.270 seconds, whole CLI 563.345 seconds. Its 653 inbound-reference guard requests retained the
smaller 1,000-key cap and took 207.672 seconds. Inverse DML used 109 requests, 873,556 rows and
60,188,704 encoded JSON input bytes.

Independent shaped applied and recovered audits passed. Applied audit SHA-256:
`784269d475dfa1c32546ebde9419cf3cbf4e9609641acd49176edd9c47adfa9f`; recovered audit:
`d3a49133d81b060aeef5aef681d996a26c9252bda3d57676f4757ccfd13a2dc7`.
Recovery restored the exact original 31-table fingerprint above. Both gates ended open/drained;
all 1,784 old Assets, 24,954 taxon IDs, protected personal tables, reusable fields/names and
6,874 gallery receipts passed independent preservation checks. Maximum sampled footprint across
both rehearsals was 650,507,967 database bytes and 242,679,808 index bytes; sampling is a lower
bound, not a worst-case guarantee. All 924 mutation-period storage samples succeeded. Both
rehearsals are hash-verified and fsynced in private persistent recovery storage. See the
[final acceptance review](https://github.com/Standkreis/atlas/issues/104#issuecomment-5645284769).
No production03 execution is claimed by these local results.

### 🛡️ Third production maintenance window — 12 September

The clean release checkout is `8d6e464c47d68ed45689600b4968e75f5bfe0d74`.
[Main CI](https://github.com/Standkreis/atlas/actions/runs/34688143839) passed integration,
application checks, builds and browser jobs. Matching Production deployment
`dpl_4UkcRRQhkNKj4FSQ8JW7L37WJBCQ` is Ready; public health returned build `mty8hcio`.
Fresh read-only preflight passed all sixteen exact migration names/checksums and three required
indexes, with an open database gate and no active German catalogue. Neon remained Launch/active,
with no exceeded usage quota. The existing database footprint was 201,801,728 bytes; this is not
the final applied footprint.

The owner freshly confirmed current and older immutable Production health pages returned
`ok:true`; root verified public Production and authenticated current/older Preview HTTP200.
After checking the exact empty disabled configuration3, current writer/bypass inventory and
unchanged green release head, root reactivated the approved deny configuration1 at
**10:33:31.839 UTC**. The owner then confirmed both authenticated Production pages showed
Forbidden403. Root's three probes had HTTP403, explicit deny headers and no protection errors.

The read-only collector checked the exact sole active rule before/after request-ID and
post-activation serverless-log queries. Those queries returned no entries. Cumulative firewall
counts were corroboration only, not fabricated per-request events or an activation delta;
the log evidence is limited to available platform coverage. No owner request IDs or exact
observation timestamps were invented from the user's short confirmations.

Complete fence verification was recorded at **10:35:50.916 UTC**. The full fresh 1,830-second
drain ends **11:06:20.916 UTC**; no backup or import runs before then. Activation SHA-256:
`b19054c20401a187fc307d137f5a44bbceff80bdd493c0bf3249fef60ada5e16`.
Initial request-proof SHA-256:
`36113a32464132c0f35d5f9f64b54c096cc4b52492127bd0887436d462003088`.
The bound 28-file operator kit and fourteen-file fence proof are hash-verified and fsynced in
private persistent recovery storage. Fence archive manifest SHA-256:
`dc75cde02248e04e63b2e4729d8e7167087b57303dc873c33389509731a6e558`.
[Third-window proof](https://github.com/Standkreis/atlas/issues/29#issuecomment-5645363304)
records the execution boundary. Fresh backup/restore, plan/apply and independent production
acceptance remain pending; this maintenance activation does not claim catalogue delivery.

The actual fence/drain, fresh backup/restore, exact-bound production plan/apply, independent audit,
reopening and deployed browser/media/audio/offline/analytics smoke evidence must replace this pending
section before #29 closes. Personal before-images, credentials, raw receipts and browser profiles
remain owner-only outside Git. Epic #14 additionally needs its dedicated ADR close-out review.

## 🔗 Completed issue/PR delivery trace

The following 41 scoped issues are completed with their associated PRs merged. This is not a
substitute for #29's production acceptance or Epic #14's outcome review, which remain pending.
Issue #53 was cancelled, not delivered. Separate follow-up epics are outside this release.

| Issue | Merged PR |
| --- | --- |
| [#15](https://github.com/Standkreis/atlas/issues/15) | [#30](https://github.com/Standkreis/atlas/pull/30) |
| [#16](https://github.com/Standkreis/atlas/issues/16) | [#31](https://github.com/Standkreis/atlas/pull/31) |
| [#17](https://github.com/Standkreis/atlas/issues/17) | [#32](https://github.com/Standkreis/atlas/pull/32) |
| [#18](https://github.com/Standkreis/atlas/issues/18) | [#33](https://github.com/Standkreis/atlas/pull/33) |
| [#19](https://github.com/Standkreis/atlas/issues/19) | [#50](https://github.com/Standkreis/atlas/pull/50) |
| [#20](https://github.com/Standkreis/atlas/issues/20) | [#52](https://github.com/Standkreis/atlas/pull/52) |
| [#21](https://github.com/Standkreis/atlas/issues/21) | [#56](https://github.com/Standkreis/atlas/pull/56) |
| [#22](https://github.com/Standkreis/atlas/issues/22) | [#40](https://github.com/Standkreis/atlas/pull/40) |
| [#23](https://github.com/Standkreis/atlas/issues/23) | [#43](https://github.com/Standkreis/atlas/pull/43) |
| [#24](https://github.com/Standkreis/atlas/issues/24) | [#46](https://github.com/Standkreis/atlas/pull/46) |
| [#25](https://github.com/Standkreis/atlas/issues/25) | [#54](https://github.com/Standkreis/atlas/pull/54) |
| [#26](https://github.com/Standkreis/atlas/issues/26) | [#42](https://github.com/Standkreis/atlas/pull/42) |
| [#27](https://github.com/Standkreis/atlas/issues/27) | [#48](https://github.com/Standkreis/atlas/pull/48) |
| [#28](https://github.com/Standkreis/atlas/issues/28) | [#84](https://github.com/Standkreis/atlas/pull/84) |
| [#34](https://github.com/Standkreis/atlas/issues/34) | [#39](https://github.com/Standkreis/atlas/pull/39) |
| [#35](https://github.com/Standkreis/atlas/issues/35) | [#41](https://github.com/Standkreis/atlas/pull/41) |
| [#36](https://github.com/Standkreis/atlas/issues/36) | [#44](https://github.com/Standkreis/atlas/pull/44) |
| [#37](https://github.com/Standkreis/atlas/issues/37) | [#45](https://github.com/Standkreis/atlas/pull/45) |
| [#38](https://github.com/Standkreis/atlas/issues/38) | [#51](https://github.com/Standkreis/atlas/pull/51) |
| [#47](https://github.com/Standkreis/atlas/issues/47) | [#49](https://github.com/Standkreis/atlas/pull/49) |
| [#57](https://github.com/Standkreis/atlas/issues/57) | [#58](https://github.com/Standkreis/atlas/pull/58) |
| [#59](https://github.com/Standkreis/atlas/issues/59) | [#64](https://github.com/Standkreis/atlas/pull/64) |
| [#60](https://github.com/Standkreis/atlas/issues/60) | [#66](https://github.com/Standkreis/atlas/pull/66) |
| [#61](https://github.com/Standkreis/atlas/issues/61) | [#68](https://github.com/Standkreis/atlas/pull/68) |
| [#62](https://github.com/Standkreis/atlas/issues/62) | [#69](https://github.com/Standkreis/atlas/pull/69) |
| [#63](https://github.com/Standkreis/atlas/issues/63) | [#70](https://github.com/Standkreis/atlas/pull/70) |
| [#65](https://github.com/Standkreis/atlas/issues/65) | [#81](https://github.com/Standkreis/atlas/pull/81) |
| [#71](https://github.com/Standkreis/atlas/issues/71) | [#75](https://github.com/Standkreis/atlas/pull/75) |
| [#72](https://github.com/Standkreis/atlas/issues/72) | [#76](https://github.com/Standkreis/atlas/pull/76) |
| [#73](https://github.com/Standkreis/atlas/issues/73) | [#79](https://github.com/Standkreis/atlas/pull/79) |
| [#74](https://github.com/Standkreis/atlas/issues/74) | [#80](https://github.com/Standkreis/atlas/pull/80) |
| [#77](https://github.com/Standkreis/atlas/issues/77) | [#78](https://github.com/Standkreis/atlas/pull/78) |
| [#85](https://github.com/Standkreis/atlas/issues/85) | [#90](https://github.com/Standkreis/atlas/pull/90) |
| [#86](https://github.com/Standkreis/atlas/issues/86) | [#89](https://github.com/Standkreis/atlas/pull/89) |
| [#87](https://github.com/Standkreis/atlas/issues/87) | [#88](https://github.com/Standkreis/atlas/pull/88) |
| [#91](https://github.com/Standkreis/atlas/issues/91) | [#92](https://github.com/Standkreis/atlas/pull/92) |
| [#94](https://github.com/Standkreis/atlas/issues/94) | [#96](https://github.com/Standkreis/atlas/pull/96) |
| [#95](https://github.com/Standkreis/atlas/issues/95) | [#97](https://github.com/Standkreis/atlas/pull/97) |
| [#98](https://github.com/Standkreis/atlas/issues/98) | [#99](https://github.com/Standkreis/atlas/pull/99) |
| [#102](https://github.com/Standkreis/atlas/issues/102) | [#103](https://github.com/Standkreis/atlas/pull/103) |
| [#104](https://github.com/Standkreis/atlas/issues/104) | [#105](https://github.com/Standkreis/atlas/pull/105) |
