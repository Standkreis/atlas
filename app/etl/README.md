# 🗄️ etl — the species pipeline (M4, [handoff 0006](../../docs/handoffs/0006-etl-and-identity.md))

TypeScript on `tsx`, the app's Prisma client, and `ffmpeg-static` (dev dependency, its own binary; absent → the `sounds` step skips WAV-only taxa and says so). Responses are cached under `.cache/<host>/` by URL (git-ignored); ordinary re-runs reuse them, while the nationwide catalogue deliberately refreshes every unfinished region. Rules: [record 0002](../../docs/records/0002-etl-the-plausible-set.md); numbers: [findings 0006](../../docs/handoffs/0006-etl-and-identity-findings.md). The grill's probe scripts this replaces live in git history (`scripts/etl-probe/` up to commit `cef832f`).

| Command | Does | Calls |
| --- | --- | --- |
| `npm run etl -- registry --mapping /absolute/path/to/reviewed-mapping.json` | Validates and imports the source-controlled BKG/BBSR snapshot as an inactive registry: 362 Kreisregionen, 400 land Kreis units, aliases and source/licence records. The separately reviewed local mapping supplies 402 GBIF/GADM query ids and is persisted with its source digests and review evidence. New application `Region` rows stay `unprepared`; legacy Mainz-Bingen and Südwestpfalz UUIDs are reused through explicit successor ids. The whole import is transactional and an identical rerun verifies rather than rewrites it | 0 |
| `npm run etl -- germany --registry <version-id> --run <key> [--concurrency 1] [--json]` | Creates or resumes one pinned, staged Germany catalogue in local Postgres. Completed Kreisregionen are checkpoints; failed regions remain isolated and retry on the same run key. Only after every region completes does the command atomically expose the deduplicated `CatalogueTaxon` union for global enrichment. `--json` writes progress to stderr and the machine report to stdout | 13 facets per query unit + uncached taxonomy; bounded by `ETL_BUDGET` |
| `npm run etl -- gallery --catalogue <completed-id> [--region <canonical-key\|name\|uuid>] [--keys k1,k2] [--limit 100] [--concurrency 2] [--json]` | Bounded, resumable reference-gallery enrichment over unique German catalogue taxa, in local Postgres only. Validates the complete scope before seeding or claiming. Fetches the curated iNaturalist list and Wikidata P18/Commons metadata before atomically replacing reference images and completing global work. Sounds and user media are preserved | Up to 2 iNat + 2 Wikidata + 1 Commons calls/taxon before retries; shared cache, host pacing and `ETL_BUDGET` apply |
| `npm run etl -- region "Mainz-Bingen"` (or another prepared name / canonical key / legacy gid) `[--month 9]` | Resolve the region and every verified query unit · fetch complete paged GBIF facets (year + 12 months, 2016–2026, observation records) · resolve every annual/monthly facet key to its terminal accepted species · sum constituent/synonym counts · cut once per tile (90 %, floor 10) → `Taxon`, `Plausibility`, `Lookalike`. Publication and invalidation of this region's prose are one transaction; a failed fetch preserves the prior set. Invalid taxonomy is reported as quarantine while valid taxa continue. Newly imported `unprepared` regions require the version-explicit nationwide runner introduced in #18 | 13 facets per query unit + uncached taxonomy |
| `npm run etl -- refresh [--days 30]` | The legacy single-query job again for prepared GADM-backed regions older than `days`; #18 owns nationwide orchestration | as above per region |
| `npm run etl -- content [--region <name>] [--purge <gbifKey>] [--limit n]` | For every set/logged taxon with `contentAt` null: GBIF → Wikidata names → complete reference gallery → Wikipedia intro → AnAge facts → GloBI edges. Completed global gallery work is preserved. Fetches precede one transaction per taxon; failures preserve prior content. `--purge` refreshes one taxon without deleting its old content first. Facts/prose follow only successful taxa | Provider calls plus GBIF matches for new interaction targets; cached and rate-limited |

The gallery command above remains the source-enrichment path. It is not permission to replace a
deployed target gallery. Target reconciliation uses the preservation planner and reviewed receipt
contract in [reference gallery preservation](../../docs/operations/reference-gallery-preservation.md);
the future importer must retain every old Asset row and publish visibility rows plus the exact
target receipt atomically.
| `npm run etl -- facts [--region <name>] [--purge] [--force] [--limit n]` | The Steckbrief keys (handoff 0021 D3, D4) for every set taxon with `factsAt` null: birds, mammals, amphibians from the bulk files in `data/` (AVONET, EltonTraits, PanTHERIA, AmphiBIO; GBIF synonyms for a binomial miss; a bird's habitat is AVONET's class plus EltonTraits' foraging stratum when it adds a word, 0025 C2) · plants from GIFT (species list and five trait tables, cached once) · fungi edibility and spore print, bird wingspan with unit from Wikidata · GBIF's most-agreed English vernacular into `names.en` where empty. Keeps AnAge and the intro; `--purge` drops only the 13 new keys; `--force` recomputes taxa with `factsAt` set. Also runs at the end of `content` for the taxa it filled | ≈ 0.7 GBIF per taxon + 1 Wikidata per 100 + 6 GIFT per process; Mainz-Bingen 889 taxa in 25 s |
| `npm run etl -- sounds [--region <name>] [--limit n]` | One xeno-canto clip (API v3, `XENO_CANTO_API_KEY` from the shell; unset → says so and skips) per bird, frog, grasshopper and bat in the set without a sound Asset: `sp:"…" grp:… q:A len:5-30`, then without `len`; song over call, ≤ 30 s preferred, shortest, ≥ 5 s, never ND; MP3 first, else a WAV transcoded with `ffmpeg-static` to MP3 128 kbps mono (`meta.transcoded: true`, 0025 C1). The file goes through `src/server/photos.ts` to `sounds/<gbifKey>.mp3` (Blob when the token is set, else `PHOTO_DIR/sounds/`), one `Asset` row `kind: 'sound'` with recordist, licence, recording page and `meta { xcId, type, length, quality }`; served by `/api/photo/<id>.mp3`. **Every clip is NC** (`CC BY-NC-SA`, one `CC BY-NC`; accepted in 0025 C4 for this personal atlas): a sold product needs a licence filter in `clip.ts` (`usable`, one `licensed.some` clause) and a refill | 1–2 xeno-canto + 1 download per taxon at 1.1 s gap; Mainz-Bingen 89 taxa in 3 min; a WAV transcode ≈ 1 s |
| `npm run etl -- content --region <name> --force` | Refetches GloBI edges for filled taxa, with per-study counts and F1/F2 prose exclusions. Names, galleries, intro, facts and sounds are preserved. `--force --keys k1,k2` retries selected taxa | Mainz-Bingen historical run: 929 taxa in 3 h 34 min (2026-09-07), approximately 6,000 GloBI pages and 34,000 GBIF target matches; cached retries are faster |
| `npm run etl -- prose --region <name> [--driver files\|api] [--run <name>]` · `prose --load --run <name>` · `prose --purge [--region <name>]` | The Steckbrief and Ökologie texts (handoff 0028, §✍️ below). No network, no model call from the ETL | 0 |
| `npm run etl -- recode` | The AnAge cells written as English before handoff 0024 (`21.8 years (wild)`, `clutch size 4.5 · …`) → the codes the page translates (`21.8 wild`, `clutch 4.5 · perYear 2 · maturity 365`), in place, idempotent | 0; dev 851 taxa in 2 s |
| `npm run db:seed` | The dev identity and the two fixtures (`fixtures/`, plausibility only, no content), idempotent | 0 |

| File | Holds |
| --- | --- |
| `registry/germany-regions.json` · `registry/registry.ts` | Pinned BKG/BBSR region and Kreis-unit snapshot, complete source/licence metadata and strict invariant validation. No GADM ids, geometry or crosswalk are redistributed in Git |
| `registry-mapping.ts` · `registry-import.ts` | Strict local-only GBIF/GADM mapping validation and the transactional, idempotent Postgres importer. Mapping provenance and reviewed query ids live only in the operational database |
| `accepted-taxonomy.ts` · `composite-aggregation.ts` | Deduplicated accepted-key resolution and pure composite count aggregation. Floors/cuts happen after the merge; ties use accepted key ascending |
| `fetch.ts` | `get` with cache, total-attempt budget (`ETL_BUDGET`, 50,000/run), durable shared iNat rolling-24h allowance (9,000 default; 10,000 ceiling), gaps as reserved slots (iNat/Wikidata 1,100 ms, Wikidata at most 1 in flight, GloBI 300 ms, GBIF 200 ms with at most 2 in flight, else 100 ms), 5 attempts, shared-host `Retry-After`/bounded fallback cooldown, one User-Agent · request-scoped and process counters · `pool` · `q` |
| `gbif.ts` | `resolveRegion`, `gbifFacet`, `gbifSpecies`, `gbifMatch`, the occurrence window (`ETL_YEARS`, default `2016,2026`) |
| `rules.ts` | Pure: `tileOf`, `cutTile`, `monthShares` (per 100,000), `words`, `nowRatio`, `isNow`. Shared with the read routers |
| `prune.ts` | Pure: `pickNames`, `iucnCode`, the Commons reject list, iNat licences, `foldKind`, `capEdges`, `parseAnAge`. Tested in `src/server/routers/taxon.test.ts` |
| `region.ts` | The region job and `refresh` |
| `wikidata.ts` | The two SPARQL batches (by P846, by P225) and the E6 choice |
| `sources.ts` | iNaturalist, Commons `imageinfo`, Wikipedia REST, AnAge |
| `globi.ts` | GloBI paging and the cap |
| `content.ts` | The content job |
| `traits.ts` | The bulk files: CSV/TSV reader, binomial index, `bulkFacts(tile, names)`, the value formats (`grams`, `millimetres`, `metres`) and the code maps. Tested in `src/server/steckbrief.test.ts` |
| `gift.ts` | GIFT: species list, five trait tables, `floweringWords`, `giftFacts` |
| `facts.ts` | The facts job: Wikidata mycomorphbox and P2050 with unit, GBIF synonyms and vernaculars, `runFacts` |
| `clip.ts` · `sounds.ts` | The xeno-canto pick (pure, MP3 before WAV) and the sounds job with the `ffmpeg-static` transcode |
| `prose/sheet.ts` · `load.ts` | The fact sheets (`sheets.mjs` ported: `full` for the Steckbrief text, `eco` for the Ökologie paragraph; codes to words through `src/i18n`, one sheet per language) and `inputHash`; the DB read behind them |
| `prose/prompts.ts` · `validate.ts` | V1, ECO2 (F5 direction templates), AUDIT2, verbatim from `scripts/prose-grill/prose.mjs`; the 0019 validator with F4, the audit shape, the F5 guard |
| `prose/driver.ts` · `step.ts` | The driver seam (`files`: prompt files in, answer files out; `api`: off unless `PROSE_API_KEY`, and even then a stub), `parseJson`; the step and `--purge`. Tests in `prose/*.test.ts` (32: sheet, driver, prune, the stored shape) |
| `prose/runs/<run>/` | One folder per run: `run.json` (the region), `prompts/`, `answers/`. Git-ignored (14 MB of prompts per region, regenerable from the DB; the texts live in `Taxon.prose`, the findings quote the hand-read paragraphs); not written by the app |
| `data/` | The four vertebrate trait datasets, 8.5 MB, with their licences ([README](data/README.md)) |
| `cli.ts` | Argument parsing |
| `fixtures/` | `fixture-mainz-bingen.json` (929), `fixture-kyoto.json` (303): the grill's sets, the seed's input |

### German registry import

The committed artifact in `registry/` is BKG-only and reproducible under `dl-de/by-2-0`. Its file
digest is asserted in tests. The mapping argument is a separately reviewed, local JSON document
with one sorted row per `de-krs-<AGS>`, a sorted array of GBIF-supported GADM ids, the pinned GADM
and GBIF evidence digests, resolution/review timestamps, largest-overlap method and explicit
exclusions. The importer requires exact coverage of every committed Kreis and rejects duplicate
query ids. Do not commit or expose that national mapping: GADM permits the current non-commercial
server-side use but not redistribution.

The registry is imported inactive. New region rows are `unprepared`, so neither `refresh`, the
hourly sweep nor the existing region list can start 362 cold jobs. Issue #17 adds composite
calculation; later catalogue activation/cutover issues decide when ready German regions become
selectable. Re-running the same artifact and mapping verifies immutable metadata, membership,
aliases and counts without changing import timestamps.

Composite regional facets expose indexed counts, not occurrence identifiers. Standkreis therefore
folds synonymous taxonomy keys but does not remove records syndicated or duplicated by GBIF
providers. These upstream duplicates remain a reported coverage limitation of this catalogue
version. Facets that fill a page continue with `facetOffset`; malformed, duplicated, or drifting
pages fail the region instead of publishing a partial set.

### Resumable Germany catalogue

Use a stable run key to resume the same inputs and a new run key for an intentional refresh. A
refresh always bypasses the response cache for unfinished regions, so a new catalogue cannot
silently inherit an old GBIF response. The input record pins the registry, registry-source digests,
observation window, occurrence predicates, plausible-set rules, and tile mapping. Starting another
Germany run while one is `building` or `partial` is rejected; finish or explicitly resolve that run
first.

Each region is leased and calculated into `CatalogueRegionBuild`, `CataloguePlausibility`, and
`CatalogueLookalike`. These candidate tables do not change live regions, live plausibility,
look-alikes, or regional prose. A process interruption leaves completed regions intact; expired
leases and failed regions can be reclaimed. Taxonomy resolution is checkpointed once per source
key and catalogue, including deterministic rejections, so synonyms shared by many regions are not
looked up repeatedly. Regional response and set fingerprints make the result auditable.

When all regional checkpoints are complete, one transaction materializes the accepted-key union in
`CatalogueTaxon` and records its fingerprint. Downstream jobs use `runTaxonWork` from
`taxon-work.ts`: work is keyed globally by `(taxonId, kind, version)`, but claimed through the
finished catalogue union. Completed work is reusable by a future catalogue; failures are isolated
and only failed or expired work is retried. Gallery selection itself belongs to issue #20.

The command reports the pinned catalogue/window, every regional state and size, national and
per-tile union totals, global enrichment states, request attempts/retries/rate limits, elapsed time,
and size outliers. The human report is the default. `--json` emits the full durable report for audit
automation. A partial run exits with status 2 after writing its report; rerun the identical command
to continue. Network concurrency is capped at four, GBIF scheduling/retries remain governed by
`fetch.ts`, and `ETL_BUDGET` counts every actual network attempt, including retries.

Wikidata Query Service calls are serialized within each process with a minimum 1,100 ms
dispatch gap, including retries. This is conservative load reduction, not a guaranteed provider
quota: [WDQS usage constraints](https://www.mediawiki.org/wiki/Wikidata_Query_Service/Implementation#Usage_constraints)
describe a per-client allowance of 60 query-processing seconds per 60 seconds, not three requests
per second. Expensive queries can still exhaust that allowance; honor Retry-After, retain 429/retry
counts, and pause/reassess repeated throttling. Run names/gallery provider phases sequentially;
this in-process scheduler does not coordinate unrelated Wikidata clients or processes.
WDQS alone has a 65-second client timeout to allow its documented 60-second server query timeout
plus transport margin; other hosts retain 15 seconds, and caller cancellation still applies.

### Shared iNaturalist allowance

The [official API practices](https://www.inaturalist.org/pages/api+recommended+practices)
recommend about one request/second and around 10,000 API requests/day. Uncached
`api.inaturalist.org` requests require `ETL_INAT_LEDGER`, one existing absolute `.json` file
shared by **every** worktree and batch process on the host. This is additional to the per-process
`ETL_BUDGET`, not a replacement. Cache hits are free; `ETL_BUDGET=0` remains cache-only and
does not require a ledger. CDN image checks are separate from API request accounting.

Initialize deliberately through `initializeInatLedger` in `inat-request-ledger.ts`, supplying
the absolute path, explicit UTC `holdUntil`, and a retained reason explaining prior activity.
For unknown previous traffic, hold until at least 24 hours after its last possible request;
never infer zero history from missing logs, cache files, a new worktree, or a process restart.
The default `dailyLimit` is 9,000 as a conservative margin; an explicit limit can never exceed
10,000. Initialization refuses existing
history. It performs no provider or database requests; initialization itself is not permission
to resume a paused job.

The ledger reserves attempts durably **before dispatch**, counts retries/failures conservatively,
enforces a rolling 24-hour allowance and 1,100 ms shared gap, and persists Retry-After cooldowns.
Automatic API redirects are refused so they cannot dispatch uncounted follow-up requests.
Requests reserved just before an abort/crash can remain counted without reaching the provider.
Missing/corrupt files, backward clocks, failed persistence and unresolved locks fail closed.
`.lock` and `.next` files are recovery evidence: never age-delete/steal a lock or reset a ledger
to regain quota. Stop all participating workers, preserve the files, establish that no owner can
dispatch, and review history/uncertainty before any manual recovery; uncertainty requires a new
documented hold covering the unaccounted window. Store these files outside disposable worktrees,
in a private local directory; do not share them across machines/network filesystems.

Only participating processes are counted. Browsers, scripts bypassing `get`, other machines,
and previously untracked requests remain external uncertainty, not automatically free allowance.
Retain per-batch reports alongside the ledger and stop before changing provider-accounting scope.

### Resumable reference galleries ([#36](https://github.com/Standkreis/atlas/issues/36))

Run `npm run etl -- gallery --catalogue <completed-catalogue-id> --limit 100 --concurrency 2`
against local Postgres. For machine output use
`npm run --silent etl -- gallery --catalogue <completed-catalogue-id> --limit 100 --json`:
`--silent` suppresses npm's script banner, and the CLI sends progress to stderr. `--region`
narrows to one completed regional set within that same catalogue; `--keys`
narrows it further and rejects any key outside the selected set. `--limit` bounds new attempts,
not the first N catalogue members: repeated limited runs advance through pending work. Invalid
scope is rejected before any work row is seeded. No model or paid content API is used.

The globally unique checkpoint is `(taxonId, gallery, licensed-gallery-v7)`. Version 7
retains version 6's requirement for matching detailed iNaturalist `taxon_photos` records to consistently identify a
`LocalPhoto` with explicitly null `native_page_url` and `native_photo_id`. The abbreviated
`default_photo`, LocalPhoto type alone, and an iNaturalist CDN URL cannot prove native provenance.
Default candidates inherit proof only from the same photo ID's full detailed records. Imported,
nonlocal or conflicting records are withheld as `unverified-imported-licence`; missing detailed
proof is `unknown-provenance`. No original-source licence verifier is introduced: these new
candidates remain excluded until their original grant can be independently verified. The
independently sourced Commons path remains available under its existing licence contract.
Every selected asset's ordered metadata and source identity enter the work summary. Selected
iNaturalist images additionally retain the matched taxon/photo identity and complete same-photo
native-source evidence; exact captured source URL/response fingerprints reproduce the checkpoint's
source fingerprint. Rejections retain bounded provenance details and reasons, while complete
original responses remain in the source cache. Version 7 changes gallery selection only for the
three exact owner-reviewed cross-taxon photos below. It does not change species membership or
existing production photos, whose preservation/visibility is owned by the separate migration plan.

Version 5 retains version 4's selection policy and version 4 retains version 3's correction that
canonicalizes legacy HTTP and localized Creative Commons deed links only when their family,
version and jurisdiction exactly match the declared licence. Credentials and nondefault ports
remain invalid. Versions 1–6 are historical checkpoints, not current completion evidence.
Completed work,
including a valid zero-image result, is reused across catalogue versions. Failed or expired work
is retried once per invocation; a live lease is left to its owner. Stop/restart with the same
command to resume. There is no destructive force flag; an intentional rules refresh requires a
reviewed gallery-version change. A lost lease cannot publish. Gallery replacement and work
completion share one transaction, while unchanged galleries keep their Asset IDs and timestamps.

#### Reviewed scientific image exclusions

On 2026-09-09 the owner approved withholding the exact Commons source
`File:Red bartsia 800.jpg` from the new galleries for Odontites vulgaris (GBIF 5415024) and
Odontites vernus (8971475), retaining both species, memberships and other photos. The retained
Commons category says vulgaris while the [pinned source description](https://commons.wikimedia.org/w/index.php?title=File:Red_bartsia_800.jpg&oldid=460093141)
says vernus; this is unresolved species attribution, not a licence defect or taxon-merge decision.
The reviewed source-evidence bundle has SHA-256
`075799c48c4aad347569c306d8acaa84d5ddcb7de89f99fd300ba3018920818f`.

Version 5 introduced, and version 7 retains, rule `commons-red-bartsia-ambiguous-species-v1` for this exact Commons file
identity before ordering/capping. Rejections retain `ambiguous-species-attribution`, the rule,
evidence reference and digest; the final content audit independently blocks that source or a
scientific rejection without its reviewed evidence. No species/category-wide rejection is added.
Existing production rows remain subject to the separately reviewed preservation migration.

On 2026-09-10 the owner approved the same conservative withholding for three additional exact
cross-taxon photo identities: iNaturalist photos `437081607` (Cornus alba/Cornus sericea) and
`575158298` (Carassius carassius/Carassius auratus), plus Commons
`File:Chrysotoxum cautum Richard Bartz.jpg` (Chrysotoxum cautum/Chrysotoxum verralli). The two
iNaturalist photos occur in detailed native-free `LocalPhoto` records for two distinct active
iNaturalist species and two distinct self-accepted GBIF species; those records prove provenance,
not which species the pixels depict. The Commons title, object name and category say cautum while
its description says verralli. None has evidence proving one accepted identity or a multi-subject
photo. Withhold each photo from both associated galleries pending identification; all six species
and their other photos remain.

Rules `inat-photo-437081607-cross-taxon-ambiguous-v1`,
`inat-photo-575158298-cross-taxon-ambiguous-v1` and
`commons-chrysotoxum-cautum-richard-bartz-ambiguous-species-v1` match only those exact provider
source identities, including their canonical source-page and render-URL spellings. They do not
exclude a taxon, genus, category or neighbouring photo ID. The reviewed outside-Git report
`final-cross-taxon-photo-review/cross-taxon-photo-review-v2.json` has SHA-256
`eff063fe88ce9921c651318300a225f42cf03a2732540f12927b4e7b86e9a8e1` and retains the exact
provider/cache hashes, accepted taxonomy envelopes and remaining gallery counts.

Re-evaluate v6 completed galleries into v7 using retained responses and `ETL_BUDGET=0`; do not copy
or relabel completion rows. Cache misses remain explicit failed/retryable work, not zero-image
successes. Preserve old checkpoints and raw source evidence. Unchanged galleries retain IDs;
changed galleries get consecutive positions. Regenerate final content/gallery artifacts and
their review bindings after replay; catalogue membership and the union fingerprint stay unchanged.

The report's examined/changed/unchanged/zero/capped/rejected/failed/lost counts and source/image
totals describe this invocation; `work.counts` includes reusable completed work in the selected
scope. `capped` counts taxa with candidates over the 12-image cap; `rejected` counts discarded
candidates excluding that cap. Source coverage counts a safely matched iNat taxon and an existing
Commons P18 file, separately from usable image totals. Missing sources and rejected licences are
coverage limitations. Malformed/provider failures preserve the entire previous gallery and remain
retryable. A partial failure or lost lease exits 2 after emitting the report. Request counts include
cache hits and network retries; elapsed time and candidate rejection reasons are included.

Legacy `content --purge` now fetches before changing content. Its gallery writes use the same
transactional replacement filter and preserve completed global galleries, sounds, sighting media,
avatars and every user-owned image. Facts/prose follow only successfully filled taxa. The legacy
content command still provides optional rich content; the gallery command alone does not claim
complete prose, facts, sounds or interactions.

### German index-ready names and content audit ([#21](https://github.com/Standkreis/atlas/issues/21))

After galleries, run `npm run --silent etl -- names --catalogue <completed-id> --json`.
The same `--region`, `--keys`, `--limit` and `--concurrency` scope flags are supported. Names
reuse the gallery pass's Wikidata response cache; run the phases sequentially so their
per-process host pacing is not multiplied. The `(taxonId, names, wikidata-names-v1)` checkpoint
records matching evidence and selected/added labels. Existing nonempty names and unrelated
global content remain unchanged. Missing, ambiguous and non-species matches complete with an
honest scientific-name fallback; malformed responses fail and remain retryable.

Use the [content audit and filtered transfer runbook](../../docs/operations/germany-content-audit.md)
for whole-union coverage, resumable live image-URL checks, representative decoded/browser
review and a reference-only gallery artifact. Names change the Taxon payload: regenerate and
re-review the base catalogue artifact after enrichment, then bind both final artifacts to the
same frozen local data. Neither artifact generation nor localhost activation transfers data to
production. The separately agreed migration/recovery plan remains a release prerequisite.

The catalogue artifact projects `CatalogueVersion` and `CatalogueRegionBuild` through explicit
reviewed column lists. Dormant migration-history fields (`habitatRulesVersion`, `habitatSource`,
`habitatSummary`) and the empty `CatalogueHabitatBatch` table are deliberately absent from the
v2 payload. The row-shape check still rejects every unexpected selected field; this is an exact
projection, not permission to ignore unrelated schema drift. Catalogue membership, v2 input and
response fingerprints, and all previously reviewed exported field semantics remain unchanged.

Why the region job precedes the content job: a species enters a set first, content follows. GloBI targets outside every set get a `Taxon` row (tile from GBIF's ranks, `contentAt` null) and are never picked up by the content job unless they gain a plausibility row or a sighting (record 0002 E13).

## ✍️ The prose — handoff [0028](../../docs/handoffs/0028-prose.md)

Two texts per taxon and language, written by a model from the fact sheet and nothing else (the closed world of 0019, the F1–F5 fixes of 0027): the Steckbrief text (V1, ≤ 2 paragraphs) from the `full` sheet, the Ökologie paragraph (ECO2) from the `eco` sheet when it has ≥ 3 lines; every draft judged sentence by sentence (AUDIT2). Stored in `Taxon.prose` (the shape of `src/server/prose.ts`: `de`, `en`, `eco.de`, `eco.en`, `facts[lang]`, `ecoFacts[lang]` for the eco sheet's own numbering, `inputHash`, `model`, `judged`, `at`). **The ETL never calls a model** (CLAUDE.md): with the `files` driver a Claude Code session answers prompt files; the `api` driver is a seam that throws without `PROSE_API_KEY` and does nothing with it yet.

| Step | Command or act | Prints |
| --- | --- | --- |
| 0 | `npm run etl -- content --region Mainz-Bingen --force` once per region after 0028 (edges before it have no studies; the sheet counts them as `unfetched` and F2 never fired on them) | F1/F2 counts |
| 1 | `npm run etl -- prose --region Mainz-Bingen --run r1` | prompts written, taxa pending, the pending **draft** prompts in batches of 5 |
| 2 | Subagents (`model: "sonnet"`), **five prompts per agent, drafts and audits never in the same agent**: each answers `runs/r1/prompts/<gbifKey>-<lang>[-eco].md` into `runs/r1/answers/<same>.json`, the JSON object only | |
| 3 | `npm run etl -- prose --region Mainz-Bingen --run r1` again: validates the drafts (F4; an invalid one is pending again), writes the **audit** prompts `<same>-audit.md` | pending audits in batches of 5 |
| 4 | Subagents over the audit prompts, same rule | |
| 5 | `npm run etl -- prose --load --run r1` (answers → DB, nothing written; a taxon is stored only when every text has a valid draft and a valid audit) | loaded, pending, invalid |
| 6 | Hand-read ten Ökologie paragraphs; then the dump to Neon (§🚀 option 2: `Taxon` carries `prose`, `Interaction` carries `studies`, `real`, `prose`) | |

`--run` defaults to the region's slug (`mainz-bingen`). A taxon whose `inputHash` (sha1 of both sheets in both languages) equals the stored one is skipped; a changed fact or edge makes it pending again. `content --region <name>` (not `--force`) runs the step at its end for the taxa it filled (prompts only, with the region's default run). `--purge [--region <name>]` sets `prose` back to null; the run folders stay.

## 🚀 Filling production — Neon (handoff [0011](../../docs/handoffs/0011-vercel.md))

Production is **Neon Postgres** behind Vercel ([docs/DEPLOY.md](../../docs/DEPLOY.md)); no VM, no tunnel. The ETL runs on the laptop, whose `.cache/` turns a fill into minutes, against the **unpooled** Neon URL (`DATABASE_URL_UNPOOLED`; the pooled one drops long transactions). Sightings, photos and identities never travel; only the set tables do. Migrations are not the ETL's job: Vercel's build runs `prisma migrate deploy`.

| Situation | Do | Time |
| --- | --- | --- |
| The dev DB already holds the region, fully filled (`contentAt` set on every taxon of the set) | **Option 2**, dump and restore | minutes |
| New region, or a content refresh | Fill the dev DB first, verify in the app, then Option 2 | ETL once, locally |
| Neon must be the first to see it | Option 1 | region ≈ 2 min, content ≈ **75 min** per region |

The content job is ≈ 30 sequential rate-limited requests per taxon across eight hosts (2026-09-06, Mainz-Bingen: 929 taxa, 16,000+ GBIF calls, 75 min); the `.cache/` only helps on a repeat of the same region. Running it against Neon when the laptop already has the data is wasted time, learned the hard way.

**Option 1 — the ETL against Neon** (when the data does not exist locally):

```sh
cd app
npx vercel env pull --environment production /tmp/dex-prod.env   # never into the repo
export DATABASE_URL="$(grep '^DATABASE_URL_UNPOOLED=' /tmp/dex-prod.env | cut -d= -f2- | tr -d '"')"
npm run etl -- region "Mainz-Bingen"                # Region, Taxon, Plausibility, Lookalike (2026-09-06: 111 s, 1,617 GBIF requests, 929 species)
npm run etl -- content --region "Mainz-Bingen"      # images, intros, facts, edges for the set
rm /tmp/dex-prod.env
```

**Facts and sounds on Neon** (handoff 0021 D9; both idempotent, both read only the shell): after the set tables are there, from `app/` with the unpooled URL in `DATABASE_URL` as above and `XENO_CANTO_API_KEY` plus `BLOB_READ_WRITE_TOKEN` loaded from `app/.env.local` (`set -a; . ./.env.local; set +a`, nothing echoed):

```sh
npm run etl -- facts --region "Mainz-Bingen"        # 2026-09-07 dev: 889 taxa, 25 s, 655 GBIF + 1 Wikidata + 6 GIFT requests
npm run etl -- sounds --region "Mainz-Bingen"       # 2026-09-07 dev: 89 taxa, 79 clips (23 MB) in 3 min into the shared Blob store under sounds/<gbifKey>.mp3
```

After 0025 lands, once per database: `npm run etl -- facts --force` (bird habitat gains the stratum word; only changed rows are written) and `npm run etl -- sounds --region <name>` per region (the WAV-only taxa get their transcoded clip; the Blob objects from the dev run are reused, only the Asset rows are new).

After a content run from a build older than 0024, or once per database after 0024 lands: `npm run etl -- recode` (no network, seconds).

The clips are keyed by GBIF key, not Asset id, so Option 2 below (dump the tables) carries the sound rows to Neon and the one Blob store already holds their files: run `sounds` on Neon only when the dev DB never had the region.

The region job is one transaction; a dropped connection leaves the region `failed` and the next run replaces it. `content` is one transaction per taxon and resumes where it stopped. `ETL_BUDGET` and `ETL_YEARS` are read from the laptop's environment as always.

**Option 2 — copy the set tables from the dev DB** (the default when the laptop already holds the region; filter other regions and user assets out first if the dev DB holds more than the one set):

```sh
# laptop: only the tables the ETL owns, in dependency order; never Identity, Sighting, Study, Filter
pg_dump postgresql://dex:dex@localhost:5433/dex --data-only \
  -t '"Region"' -t '"Taxon"' -t '"Plausibility"' -t '"Lookalike"' -t '"Asset"' > set.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f set.sql     # DATABASE_URL = the unpooled Neon URL from above
```

`Asset` holds the reference images of the content job **and** user photos (`origin = 'user'`): dump it only into an empty production DB, or filter the user rows out first (`DELETE FROM "Asset" WHERE origin = 'user'` on a scratch copy). Afterwards `/api/health` still says `ok` and the phone's region search finds the set. A taxon with `contentAt` null is healed by the hourly sweep cron (`/api/cron/sweep`, handoff 0011) or the next `content` run from here.
