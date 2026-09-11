# 🔬 Germany checked import: full-scale rehearsal review

Evidence for [#63](https://github.com/Standkreis/atlas/issues/63), 11 September 2026. This record consolidates delivered [#71 / PR #75](https://github.com/Standkreis/atlas/pull/75), [#72 / PR #76](https://github.com/Standkreis/atlas/pull/76), [#73 / PR #79](https://github.com/Standkreis/atlas/pull/79) and [#74 / PR #80](https://github.com/Standkreis/atlas/pull/80). It is not production execution approval. Raw receipts, database-derived audits and API responses remain in the private recovery archive; this document contains aggregate counts and hashes, not personal rows.

## Conclusion

Formal rehearsal 06 completed a full CLI plan, apply, independent post-apply audit, guarded recovery and independent post-recovery audit on a fresh local PostgreSQL 18 clone of the immutable production backup. The write gate reopened after both operations, and recovery restored the exact canonical fingerprint of all 31 product tables. The rehearsal made no production transformation, hosting purchase or paid model/API call.

The implementation and local rehearsal satisfy the technical safety criteria in #63. They do **not** authorize production. The measured database peak was 644,511,423 bytes, above the verified 0.5 GB Neon plan. After rehearsal, the owner upgraded Neon; a read-only Vercel check verified installed `launch_v3` / Launch with usage-based storage ($0.35/GB-month) and compute ($0.106/CU-hour). The Free-plan blocker is resolved; actual release-time capacity/headroom still requires verification. No historical data may be deleted to make the plan fit. Production also requires a fresh backup, renewed target review/plan, current URL evidence, an exact execution manifest and explicit owner approval under #28/#29.

## Bound inputs and code

The immutable backup had SHA-256 `a958c93a634848c5c67f4fe49c60af2271a896af7c649ceab182c758e68eb52a`. Its local-only PG18 restore was verified before cloning; `production-backup-local-restore-20260911.json` has SHA-256 `8c1b3def718b7603da76e2ba87127c0222eee7c167a0b60ee8e2b1ea08902787`. The restored target contained 24,954 Taxon rows, 1,786 Asset rows and three legacy Region rows. Only clones were changed.

Formal06 executed clean code head `626cd16e84f2244f53d1e1ab997a389817fdcb1d`. Schema preflight matched all 15 expected migrations by exact name and checksum; `issue63-cli-rehearsal-06-schema.json` passed and has SHA-256 `103e6dfbf817bd63e92861b75f4fbf76b483a563c212a4ae62e0e37f0a88f602`.

The frozen Germany source was catalogue `b59b97f4-6fdd-4900-a263-be2c05d78bbf`, registry `de-krg-2024-12-31`, run `germany-2016-2026-taxonomy-v2-20260909`, with 6,874 union taxa. Its exact pins were:

- input `facb385c5e6495f58b95e9625a9ddcac38ce538e4a1ee2a64f42953b2d17d4a9`
- response `388a0096f605b7c945c7b050ae8d2bf66461e19ef8feecb5bdac15fef5584118`
- union `6ede6e5b059fa0d3d5edc0e883654a1c7ecb2df08abae129c32c9953e25ae38e`
- base audit `4eec47beda0edbf43b8f227b48aa5d9a758051d1fc998dc1ee36166a249262c2`
- content audit `c0b1b12ca19c7f69823be1b898a743085537260e4334b0096b3168b448b01450`
- content `bfcc0878cfdba3bff4cc7878392384053882887b56982aec451efb3afc92eb10`
- taxon `a21bf70a3159203083989b9447114983958a4710a284e666c2779c82c824a1ae`

The six frozen files were rehashed from disk and matched the configuration exactly:

| Evidence | Bytes | SHA-256 |
| --- | ---: | --- |
| base audit | 189,553 | `549f62c78ddb5b1b3e0e0378491e613efaf247e67caa5edad683bf8a483c97ec` |
| base manifest | 7,345 | `28dbd3b0c32ad75044bfcb067e698a446bf4446315c6231444aab3821c2e3158` |
| base JSONL artifact | 156,550,373 | `7a5327dd06f16c2581d3fcab117b9ef01f3c9687363c14f3dabcb1aae672d06a` |
| gallery audit | 15,503 | `e7350e3ee370d740640c7e865f7c1dc8ecbc146ad43d5200ef18e0aaefc4d7f7` |
| gallery manifest | 1,959 | `0e3853f7df192546aa6f15e1b4bff22fb3d8423b21169233ccd1fce7043979c3` |
| gallery JSONL artifact | 89,350,594 | `af277bea649a10f1f8bd74ebf00f78e982ae2584f27abff3ec5b10909275b99c` |

The bound target gallery review was 2,604,471 bytes with file SHA-256 `b62b54cc6c90f4e8be079d701ecd7183c66b178d1ae75bab93663fd5807fc4c8`, document fingerprint `047a48558123efb1146b4d8cd43619f4b38a86b461081ef425733452f23fa541`, and evidence fingerprint `d0fb3ec31c6af56da7ff507d84503ab411a258f51098e1e0bca92719486a52e9`. The network review SHA-256 was `d263d0fbaee3bc93a58a950f79bd8ccd5d8a6dc0946ac1ee20ac541feb9d4963`. The URL report covered 36,338/36,338 URLs with zero failures and file SHA-256 `e707f0afef556003b8af08ccaf0b68b8444e083edbf0aa40b2606e4f5c3d5263`.

## Plan and durable receipt

The loopback target was `dex_check_germany_import_63_06` on port 5434. Configuration digest was `1b7ce0b178d7a11d55ba1298bec569e68defcfe27650afe3010f4b4737a57598`; the configuration file SHA-256 was `72251e8ee12eec6b49068df33511287cd30102dfe097c67b724938d33604ea1e`.

The deterministic plan fingerprint was `e743dc6e98634247c717b50699b9158cce79ab590cb6ff86bbc303c4d8b160c2`. It mapped 6,874 Taxon and 362 Region identities and contained 508,007 materialize mutations, 365,549 publish mutations and 16 protected scopes. The 1,202-byte plan record has SHA-256 `2920f9ec49e521b1b8d3f598b3bb433d9f609deea46d573bd7e4db5d53ede258`.

The owner-only receipt was 634,051,086 bytes, mode 0600, with 873,556 mutations. Its logical fingerprint was `2ebaaf35e396a2e217f5549c9b0f982b8d7cd74136f30cddc16b5479cdd3e8df`, pre-footer stream SHA-256 `2be91071c375d638e708242fc2d2a3d4af157597bf75fde26c6d7853df8e29dc`, and whole-file SHA-256 `d43572f3985c94242e1f8b378bd958aee54f673ea8c2b68dcfe072160771d92e`. The release-intent record preceded apply; its SHA-256 was `adc50344e284208518f37557b57c8dde1c31f13feb2dac2dff4b436fb2f18f32`. It is evidence of intent and fresh validation, not human approval or successful application.

## Apply, preservation and recovery

The canonical 31-table fingerprint changed only as planned:

| State | 31-table fingerprint | Gate |
| --- | --- | --- |
| restored baseline | `d51f2efaf4ebd2448c4c9a0778e4076c2b77affd308e4a5095602121160f86a9` | open before operation |
| independently audited apply | `19f270295ab7c895e5f3ce28483d6bd7c12a82a1d9a2a03c5bf7951e39659ee3` | open, zero active writers |
| independently audited recovery | `d51f2efaf4ebd2448c4c9a0778e4076c2b77affd308e4a5095602121160f86a9` | open, zero active writers |

The applied audit passed and has SHA-256 `3cdf77b57325823edc0282d2bdf48500449b6850ab1a936d7fe3c162dbf9194e`. It verified:

- Germany: 6,874 catalogue taxa, 362 regions, 214,321 catalogue/live plausibility rows and 151,680 catalogue/live lookalike rows.
- Taxa: all 24,954 original target UUIDs survived; 2,513 were added for 27,467 total. The audit preserved 34,104 nonempty values across `wikidataId`, `iucn`, `tags`, `intro`, `facts`, `factsAt`, `namePath`, `contentAt` and `updatedAt`, plus 3,586 nonempty common-name values. This is a field-value count, not a prose-paragraph count; the source had no prose to publish.
- Assets: all 1,786 original rows survived with the exact original digest; 35,097 reviewed source rows were inserted for 36,883 total.
- Protected data: Identity (85), Sighting (29), Study (11), Interaction (186,658), QuotaBucket (17) and ScanWork (4) counts and digests were unchanged; the zero-row Passkey, EmailCode and PhotoDeletion tables also remained unchanged. No personal row content is reproduced here.
- Filters and regions: all eight Filter selections were valid; seven were nonempty and one used the intended empty-selection fallback. The two reused German Region UUIDs were bound to exact canonical keys; the unrelated Dutch legacy region was retained.
- Gallery: 6,874 receipts and 36,651 visibility rows bound 36,338 eligible references and 313 retained-but-hidden references. All 1,241 eligible existing assets and their lead positions survived; maximum visible gallery size was 12.

The recovery audit passed and has SHA-256 `26e98e88e8651f5e063f33987c9eec1690b8eee01c51ed238cd9ef7b0c4a91db`. Every one of the 31 product tables returned to its baseline row count and digest. The database gate was open and drained afterward. Physical files remained larger after deletes (350,412,800 bytes across the measured product-table footprint) because PostgreSQL retains table/index pages; this does not alter the exact logical recovery result.

## Time and capacity

`issue63-cli-rehearsal-06-measurements.jsonl` contains 807 samples at approximately two-second intervals and has SHA-256 `5e972056096881a826d2a69924e56129005210388d3986e2dd8d054f494dc6c1`.

- Apply was first sampled in maintenance at 09:23:03.689 UTC and first sampled open at 09:25:22.435 UTC: 138.746 seconds between observed boundary samples.
- Recovery was first sampled in maintenance at 09:38:05.202 UTC and first sampled open at 09:39:41.625 UTC: 96.423 seconds between observed boundary samples.
- The measured database peak was 644,511,423 bytes, observed during recovery. The independently audited applied 31-table footprint was 633,987,072 bytes, including 236,503,040 index bytes. Baseline product tables were 74,866,688 bytes.

The timings are sampled observations, not exact gate transition times: each boundary lies between adjacent roughly two-second samples. The 634 MB receipt is separate owner-controlled filesystem storage, not database staging. Both live and recovery measurements exceeded the then-installed 0.5 GB allowance. The owner's subsequently verified Launch upgrade resolves that plan blocker; final target and provider-accounting headroom remain deployment preconditions, not a reason to delete history.

## Runtime acceptance on the applied snapshot

Two read-only sweeps exercised the public server contract without provider/model calls:

- Taxon pages: 6,874/6,874 completed with zero failures; catalogue snapshot was unchanged; 36,338 images and 151 sounds were represented; 19,613,434 response bytes, maximum response 7,361 bytes, p95 81.339 ms, provider requests 0. Raw JSONL SHA-256: `35e6691df9d530a18dbf28bb402d8be449cddcf2d94eb258afee2ae3e49efbb0`.
- Regions: all 362 passed across 725 requests with zero failures/retries, 200,936,459 response bytes and p95 935 ms. Expected data fingerprint remained `9c4bc79ebe7e407a3d4327d60fd26be0eb3e86b543ded74b6e8abacd637c081d`; identity rows remained 102 and no identity was minted. `issue63-formal06-region-api-acceptance.jsonl` has SHA-256 `4723f46d57defad07a449f9fa6af34ba616417d1cb0a43c1a8c60bad11b5b352`.

The region sweep ran on the retained applied-preview snapshot at code `71adb6340ce843b58c65877fc72d8c85a1583fe2`; it verifies the same reviewed applied catalogue, not the recovered legacy clone. The migrated-data preview also passed its 13,769-page static build, production build and English/German phone/desktop flows for onboarding, search, galleries, retained intro/facts and national progress. Local audio bytes were absent, so this is metadata preservation rather than playback proof.

## Failures retained as evidence

The successful run does not erase earlier failures:

- Planning-only scale check 01 exceeded V8's maximum single-string size before database writes. Streaming canonical hashing and JSONL receipt output replaced whole-graph stringification.
- Run 02 exposed a non-indexable keyed-row read using `IS NOT DISTINCT FROM`; the query remained active for more than 287 seconds and was canceled (`57014`). The transaction rolled back. `issue63-full-rehearsal-02-report.json` has SHA-256 `6e1d6756b4b615e516766a04fef3bc5607d8068b86a7c2700a4867cbcc7de641`. Fixed-key comparisons were changed to indexable equality and covered by the 10,000-key query-plan regression.
- Run 03 failed closed when whole-table Asset protection treated the operation's own 35,097 inserts as target drift (`protected scope 10 changed after target planning`). The serializable transaction rolled back and the 31-table fingerprint remained the baseline. Existing Assets are now protected by exact keys. Measurement SHA-256: `acc08bc560191ab8e6d6037dd85a5ac45afa6d6c8a8726d821e5b2201896c183`.
- Run 04 applied successfully, then recovery stopped before its first inverse mutation with PostgreSQL `53100`: the inbound guard requested a 320,725,792-byte shared-memory segment in a 64 MiB Docker `/dev/shm`. The gate remained maintenance-owned and applied data remained intact. Composite inbound checks are now bounded in batches and retain later-batch rejection. Measurement SHA-256: `c7196b1c8c89553836bbe639ce2008c16bc2b4e1446d61bd559676bd60b0a506`.
- Run 05 was invalidated by an approximately 89-minute laptop sleep and rolled back rather than being counted as a timing or recovery pass. Its initial monitor also targeted the wrong clone; that evidence was retained separately instead of relabelled. Measurement SHA-256: `eed2ae686ab5e690fab3fd6ef26c03acf7964958d39a60abe529573e4d85f8ac`; wrong-target monitor SHA-256: `1b476261c790e08868c5136af7ce2accea21fdd3e627107e5cc534cbb3abc82c`.

Fault-injection coverage is retained in `app/src/server/catalogue-import-store.integration.test.ts`: admitted-write drain refusal, stale snapshot/before-image refusal, injected transaction rollback, post-commit drift keeping maintenance closed, changed-after-image recovery rejection, new inbound Sighting/ScanWork/Filter/prose references, later-batch composite references, modified external receipts and missing fresh release evidence. Identity/prose/UUID conflicts are covered by `app/etl/catalogue-import-relational-plan.test.ts`; frozen/stale/tampered evidence by `app/etl/catalogue-import-validation.test.ts`; and exact-file/payload drift, duplicate/noncanonical records and oversized-write behavior by `app/etl/catalogue-import-receipt-file.test.ts`. The receipt reader implementation additionally rejects truncation and extra, missing or reordered records. Action/target/code/approval boundaries are covered by `app/etl/catalogue-import-cli.test.ts`.

## Post-rehearsal hardening and verification

Formal06's store/planner/source graph did not change after `626cd16e84f2244f53d1e1ab997a389817fdcb1d`. Operator hardening then added strict real UTC timestamps and made the receipt writer enforce the reader's 16 MiB record bound. The reviewed chain is:

`626cd16e84f2244f53d1e1ab997a389817fdcb1d` (formal06) → `7b849a9d39a38a79f7c581dd18b11c6ead3ba5ff` (post-rehearsal integration hardening) → `d3371c584ecfafd9c415f98f94df59d383e5135d` (reviewed #74 head with identical seven operator/doc blobs) → `e94804c5b7bfacc3bf8dda334e4833f843787d1c` (main merge) → `240f193786ad06d6c2c5918c147bdcafcfe75b70` (issue63 integration merge, no diff from `origin/main`).

As a controlled compatibility check, the hardened writer read and rewrote the complete formal06 receipt. `issue74-formal06-hardened-receipt.jsonl` is mode 0600, 634,051,086 bytes and has the same whole-file SHA-256 `d43572f3985c94242e1f8b378bd958aee54f673ea8c2b68dcfe072160771d92e`. This proves the bound did not alter a valid full-size receipt; it does not pretend a second production transformation occurred.

At #74 head `d3371c584ecfafd9c415f98f94df59d383e5135d`, scoped operator/receipt tests passed 22/22, the fresh-database integration suite passed 97/97 across 16 files, and `npm run check` passed typecheck, lint (zero errors), 541/541 unit tests, the 2,413-page fixture static export and production server build. Private log SHA-256 values are `680b18c246dfc8c1de110147ede961941ce97b65f2d5298a5c529dc7fcf94cf6` (operator), `7b61501e13de4cc32150697efa8cc29b4ef142f886dcbb7d9aa7080364905a60` (integration) and `bb94c40cabb463bee4acca3418ddc35588d7f790af51a9d86ff92cd58c6bdc57` (full check).

## Acceptance-criteria trace

| #63 criterion | Evidence |
| --- | --- |
| frozen code/artifacts/reviews; stale evidence fails closed | exact pins and disk hashes above; `catalogue-import-validation.test.ts` |
| stable target UUID/FK/region-key mapping; conflicts abort | applied audit identity/filter section; `catalogue-import-relational-plan.test.ts` |
| no partial exposure; atomic gated activation | formal06 gate samples and audit; `catalogue-import-store.integration.test.ts` |
| enumerate changes; preserve personal/global/reference rows | 31-table before/apply audit and protected counts/digests above |
| canonical mappings, empty fallback, retirement, merged galleries | filter/gallery audit and both applied API sweeps |
| exact recovery; refuse newer work | recovered baseline fingerprint; store new-reference/after-image tests |
| failure injection | store, validation, planner and receipt tests listed above; retained runs 02–05 |
| full-scale footprint and write pause | measurement JSONL and storage audits; Free-plan insufficiency and subsequent owner Launch upgrade recorded |
| exact runbook and superseded unsafe commands | [operator runbook](../operations/germany-checked-import.md), [ETL instructions](../../app/etl/README.md), [deployment guide](../DEPLOY.md) from #74 |
| no production execution; handoff | loopback target and local backup clone; production remains with #28/#29 |

## Production release preconditions

The frozen scientific/catalogue artifacts remain immutable, but release-edge evidence does not. The current URL report was generated at `2026-09-10T18:59:38.875Z`; the validator rejects it at or after `2026-09-11T18:59:38.875Z` and rejects any stale individual check. Any operation beyond the earliest individual-check expiry therefore needs a new equivalent current-URL report, without regenerating or rewriting the frozen historical audit. Freshness must be verified again even for an earlier operation.

Before production, take and verify a fresh backup, restore it locally, rerun schema/capacity checks, regenerate the target snapshot and plan, and repeat target-specific identity/gallery review for any changed target state. Verify the upgraded hosting configuration and available headroom; do not infer approval for another paid change and do not delete history. Bind the exact then-current clean code head, target, plan record, receipt file and action-specific owner manifest. Recheck URL evidence after any long operator-paced drain. #29 owns the explicit go/no-go, execution and independent production verification.
