# 🗄️ etl — the species pipeline (M4, [handoff 0006](../../docs/handoffs/0006-etl-and-identity.md))

TypeScript on `tsx`, the app's Prisma client, and `ffmpeg-static` (dev dependency, its own binary; absent → the `sounds` step skips WAV-only taxa and says so). Responses are cached under `.cache/<host>/` by URL (git-ignored); ordinary re-runs reuse them, while the nationwide catalogue deliberately refreshes every unfinished region. Rules: [record 0002](../../docs/records/0002-etl-the-plausible-set.md); numbers: [findings 0006](../../docs/handoffs/0006-etl-and-identity-findings.md). The grill's probe scripts this replaces live in git history (`scripts/etl-probe/` up to commit `cef832f`).

| Command | Does | Calls |
| --- | --- | --- |
| `npm run etl -- registry --mapping /absolute/path/to/reviewed-mapping.json` | Validates and imports the source-controlled BKG/BBSR snapshot as an inactive registry: 362 Kreisregionen, 400 land Kreis units, aliases and source/licence records. The separately reviewed local mapping supplies 402 GBIF/GADM query ids and is persisted with its source digests and review evidence. New application `Region` rows stay `unprepared`; legacy Mainz-Bingen and Südwestpfalz UUIDs are reused through explicit successor ids. The whole import is transactional and an identical rerun verifies rather than rewrites it | 0 |
| `npm run etl -- germany --registry <version-id> --run <key> [--concurrency 1] [--json]` | Creates or resumes one pinned, staged Germany catalogue in local Postgres. Completed Kreisregionen are checkpoints; failed regions remain isolated and retry on the same run key. Only after every region completes does the command atomically expose the deduplicated `CatalogueTaxon` union for global enrichment. `--json` writes progress to stderr and the machine report to stdout | 13 facets per query unit + uncached taxonomy; bounded by `ETL_BUDGET` |
| `npm run etl -- region "Mainz-Bingen"` (or another prepared name / canonical key / legacy gid) `[--month 9]` | Resolve the region and every verified query unit · fetch complete paged GBIF facets (year + 12 months, 2016–2026, observation records) · resolve every annual/monthly facet key to its terminal accepted species · sum constituent/synonym counts · cut once per tile (90 %, floor 10) → `Taxon`, `Plausibility`, `Lookalike`. Publication and invalidation of this region's prose are one transaction; a failed fetch preserves the prior set. Invalid taxonomy is reported as quarantine while valid taxa continue. Newly imported `unprepared` regions require the version-explicit nationwide runner introduced in #18 | 13 facets per query unit + uncached taxonomy |
| `npm run etl -- refresh [--days 30]` | The legacy single-query job again for prepared GADM-backed regions older than `days`; #18 owns nationwide orchestration | as above per region |
| `npm run etl -- content [--region <name>] [--purge <gbifKey>] [--limit n]` | For every taxon in a set (or with a sighting) and `contentAt` null: GBIF `species/{key}` → Wikidata batch (P846, then exact name; rank check) → image ladder (iNat default photo if licensed → Commons P18 unless specimen/plate/larva/egg/map → next licensed iNat photo → none) → Wikipedia `page/summary` de → en → AnAge (P4024) → GloBI edges folded to six kinds, in-set targets first, ≤ 200 per species; out-of-set targets become `Taxon` rows without plausibility. One transaction per taxon, `contentAt` set; a failing taxon logs and the run continues. `--purge` re-fetches one taxon | ≈ 8 per species + 1 GBIF match per new target; one region ≈ 20 min, bounded by iNaturalist at 1/s |
| `npm run etl -- facts [--region <name>] [--purge] [--force] [--limit n]` | The Steckbrief keys (handoff 0021 D3, D4) for every set taxon with `factsAt` null: birds, mammals, amphibians from the bulk files in `data/` (AVONET, EltonTraits, PanTHERIA, AmphiBIO; GBIF synonyms for a binomial miss; a bird's habitat is AVONET's class plus EltonTraits' foraging stratum when it adds a word, 0025 C2) · plants from GIFT (species list and five trait tables, cached once) · fungi edibility and spore print, bird wingspan with unit from Wikidata · GBIF's most-agreed English vernacular into `names.en` where empty. Keeps AnAge and the intro; `--purge` drops only the 13 new keys; `--force` recomputes taxa with `factsAt` set. Also runs at the end of `content` for the taxa it filled | ≈ 0.7 GBIF per taxon + 1 Wikidata per 100 + 6 GIFT per process; Mainz-Bingen 889 taxa in 25 s |
| `npm run etl -- sounds [--region <name>] [--limit n]` | One xeno-canto clip (API v3, `XENO_CANTO_API_KEY` from the shell; unset → says so and skips) per bird, frog, grasshopper and bat in the set without a sound Asset: `sp:"…" grp:… q:A len:5-30`, then without `len`; song over call, ≤ 30 s preferred, shortest, ≥ 5 s, never ND; MP3 first, else a WAV transcoded with `ffmpeg-static` to MP3 128 kbps mono (`meta.transcoded: true`, 0025 C1). The file goes through `src/server/photos.ts` to `sounds/<gbifKey>.mp3` (Blob when the token is set, else `PHOTO_DIR/sounds/`), one `Asset` row `kind: 'sound'` with recordist, licence, recording page and `meta { xcId, type, length, quality }`; served by `/api/photo/<id>.mp3`. **Every clip is NC** (`CC BY-NC-SA`, one `CC BY-NC`; accepted in 0025 C4 for this personal atlas): a sold product needs a licence filter in `clip.ts` (`usable`, one `licensed.some` clause) and a refill | 1–2 xeno-canto + 1 download per taxon at 1.1 s gap; Mainz-Bingen 89 taxa in 3 min; a WAV transcode ≈ 1 s |
| `npm run etl -- content --region <name> --force` | Handoff 0028: the GloBI edges of every **filled** taxon of the region again, with `includeObservations=true` (one row per record, ≤ 50 pages of 1 000; a species cut at 50 pages, Apis mellifera, gets one query per kept pair). Every edge stores its `studies` (`{ citation: records }`), its `real` count (records not from a metaweb, `prune.ts:METAWEB`) and `prose: false` when 0027 F1 (eats/eatenBy, all studies metawebs) or F2 (≤ 1 real record from ≤ 1 real study) drops it from the prose sheet; the tile keeps every edge. Names, images, intro, facts and sounds are not touched (a full re-run would delete the sound Asset rows: `asset.deleteMany` filters on `sightingId` only). Prints the F1/F2 counts and a ✗ line per taxon whose fetch failed; `--force --keys k1,k2` refetches just those | Mainz-Bingen 929 taxa: **3 h 34 min** (2026-09-07; ≈ 6 000 observation pages of ≈ 1.3 MB, 8.2 GB, plus ≈ 34 000 GBIF match calls for the targets; 15 taxa failed on the way and took `--force --keys` 4 min); one taxon of ≈ 20 edges: 1 s from the cache |
| `npm run etl -- prose --region <name> [--driver files\|api] [--run <name>]` · `prose --load --run <name>` · `prose --purge [--region <name>]` | The Steckbrief and Ökologie texts (handoff 0028, §✍️ below). No network, no model call from the ETL | 0 |
| `npm run etl -- recode` | The AnAge cells written as English before handoff 0024 (`21.8 years (wild)`, `clutch size 4.5 · …`) → the codes the page translates (`21.8 wild`, `clutch 4.5 · perYear 2 · maturity 365`), in place, idempotent | 0; dev 851 taxa in 2 s |
| `npm run db:seed` | The dev identity and the two fixtures (`fixtures/`, plausibility only, no content), idempotent | 0 |

| File | Holds |
| --- | --- |
| `registry/germany-regions.json` · `registry/registry.ts` | Pinned BKG/BBSR region and Kreis-unit snapshot, complete source/licence metadata and strict invariant validation. No GADM ids, geometry or crosswalk are redistributed in Git |
| `registry-mapping.ts` · `registry-import.ts` | Strict local-only GBIF/GADM mapping validation and the transactional, idempotent Postgres importer. Mapping provenance and reviewed query ids live only in the operational database |
| `accepted-taxonomy.ts` · `composite-aggregation.ts` | Deduplicated accepted-key resolution and pure composite count aggregation. Floors/cuts happen after the merge; ties use accepted key ascending |
| `fetch.ts` | `get` with cache, total-attempt budget (`ETL_BUDGET`, 50,000/run), gaps as reserved slots (iNat 1,100 ms, Wikidata and GloBI 300 ms, GBIF 200 ms with at most 2 in flight, else 100 ms), 5 attempts, shared-host `Retry-After`/bounded fallback cooldown, one User-Agent · request-scoped and process counters · `pool` · `q` |
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
