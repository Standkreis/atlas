# 📇🔊 [0021] Handoff — Steckbrief data and voice (M9b, part 1)

> Build handoff. Child of [grill 0019](0019-steckbrief-grill.md) and its [findings](0019-steckbrief-grill-findings.md), decisions S1–S6 taken 2026-09-07: **data ships, voice ships, prose waits.** The probe in `app/scripts/steckbrief-probe/` is the reference implementation for every join; `taxa.mjs`, `traits.mjs`, `facts.mjs`, `sounds.mjs` already work.

| 🗓️ Written | 👤 Owner | ⬆️ Parent | ⏱️ Budget |
| --- | --- | --- | --- |
| 2026-09-07 | Sven Reiser | [Findings 0019](0019-steckbrief-grill-findings.md) §S1, §S2, §S4, §S5 · [Spec 0001](../specs/0001-standkreis-dex-the-first-walk.md) §🗄️ · [Findings 0007](0007-atlas-grid-and-species-findings.md) Steckbrief · [ETL README](../../app/etl/README.md) | 1 session on `main` |

---

## 🎯 Why

"Any Steckbrief fact" is at 8 % of the set. The grill measured what open data gives without a token: plants 89 %, birds 99 %, mammals and amphibians 100 %, fungi 58 %, insects 0 %. Plus one sound per bird, frog and grasshopper. This build puts it into the DB and on the page. No LLM text.

## 📐 What to build

| # | Piece | Detail |
| --- | --- | --- |
| D1 | **Schema** | `Taxon.factsAt DateTime?` only (S4 without `prose`, which waits). Hand-written `app/prisma/migrations/20260909000000_facts_at/migration.sql`, `migrate deploy` locally, Vercel's build in prod. `Asset.kind` gains `sound` if the enum lacks it (same migration) |
| D2 | **`facts` shape** | Keeps `{ key: { value, source, url?, licence? } }`. New keys per tile from §S1: birds `mass, wingspan, migration, habitat, diet, activity`; mammals `mass, length, diet, activity, habitat`; amphibians `length, habitat, diet`; plants `flowering, height, pollination, lifeform`; fungi `edibility, sporePrint`. `value` is a display string in **metric units, German decimal comma is the client's job** (`"120 g"`, `"Mai–Okt"`, `"bis 1,5 m"` from a number the client formats). `licence` for every new key (`CC BY 4.0` etc.). `source` = dataset name (`AVONET`, `EltonTraits`, `PanTHERIA`, `AmphiBIO`, `GIFT`, `Wikidata`) |
| D3 | **ETL step `facts`** | `npm run etl -- facts --region <name>` (and inside `content` after GloBI). Bulk files in `app/etl/data/` committed once (AVONET, Elton ×2, PanTHERIA, AmphiBIO, ~9 MB; a `README.md` with URL, licence, version, date), joined by scientific name with the probe's synonym fallback. GIFT through its API with the probe's disk cache; Wikidata mycomorphbox in SPARQL batches. Sets `factsAt`. Idempotent; `--purge` clears the new keys and keeps AnAge/IUCN/intro. Budget and User-Agent rules of `fetch.ts` apply |
| D4 | **English names** | The GBIF vernacular step from the probe fills `names.en` where empty (93 % vs 25 %); never overwrites an existing name |
| D5 | **ETL step `sounds`** | `npm run etl -- sounds --region <name>`. Xeno-canto v3 with `XENO_CANTO_API_KEY` (env, never printed; absent → the step says so and skips). One clip per taxon with a xeno-canto id (P2426 from Wikidata, else a name search): quality A, type song over call, shortest ≥ 5 s, **skip ND licences** rather than crop, prefer ≤ 30 s and cut nothing. Download once, `put` to Blob as `sounds/<gbifKey>.mp3` through the `photos.ts` seam (extend it, do not bypass it). One `Asset` row `kind: 'sound'`, `origin: 'xeno-canto'`, `licence`, `licenceUrl`, `attribution` recordist, `sourceUrl` the recording page, `meta { xcId, type, length, quality }`. Idempotent: an existing sound Asset is kept |
| D6 | **Page** | `SpeciesPage.tsx` Steckbrief, layout A of §S5: cells for every present fact key with the source behind ⓘ (the existing D3 pattern), the grey "noch keine Angaben" line **only** for tiles that can have facts (bird, mammal, amphibian, plant, fungus) and only naming keys that tile could have; insects show no Steckbrief section at all when empty. A **voice row** under the cells: `♪ Gesang · 0:14 · CC BY-NC-SA · Name` with a play/pause button, native `<audio>` streamed from `/api/photo/<assetId>` (rename nothing; the route already serves Blob by asset id, extend its content type). The ⓘ opens the usual source sheet with recordist, licence, link. Quellen line gains `GIFT`, `AVONET`, `xeno-canto` when used |
| D7 | **i18n** | Labels for every new key in `de` and `en`; migration values (`resident`, `partial`, `full`) and edibility values translated, never shown raw. Fungi keep the existing "kein Speisepilz-Ratgeber" box; edibility is a Wikidata statement, shown with source, the box stays above it |
| D8 | **Offline** | The sound is not in the offline pack (55 MB per region is too much); the row says "wartet aufs Netz" offline. Facts are in the species payload already cached |
| D9 | **Fill and dump** | Per CLAUDE.md: fill the dev DB for the four regions. `facts` and `sounds` are cheap (GIFT cached, ~110 xeno-canto calls per region), so they may run **against Neon directly** from the owner's terminal, like the region step; document the two commands in the ETL README |

## 🔒 Rules

- Licences travel with the data: every new fact carries `licence`, every sound Asset its own. AVONET CC BY 4.0, EltonTraits CC0, AmphiBIO CC BY 4.0, PanTHERIA unclear (use, mark `source` and note it in the findings), GIFT unstated (**attribute as "GIFT (Weigelt et al.)" and the owner mails the group in parallel**), Wikidata CC0, xeno-canto per clip.
- Never `migrate dev`, `db push`, `reset`. Never read or print `.env*` values. No push.
- No prose, no LLM call anywhere in this build.

## 🧪 Checks

Script `app/scripts/m9b/steckbrief.mjs` against the production build (`next start -p 3002`), shots to `docs/handoffs/0021-shots/`.

| # | Check | Evidence |
| --- | --- | --- |
| C1 | `facts` on the dev DB, four regions: coverage table per key per tile, before/after; equals the grill's numbers ± 2 points | table |
| C2 | Ten species pages, two per tile: cells, sources, no raw enum, units; Brennnessel shows Blütezeit/Höhe/Bestäubung, Fliegenpilz Speisewert with the box above, Amsel mass/wingspan/Zug | shots |
| C3 | An insect page with no facts shows no Steckbrief; a bird with none shows the grey line naming only bird keys | shots |
| C4 | `sounds` with the key: n clips for Mainz-Bingen, 0 ND, sizes, Blob keys; without the key: the skip line | log |
| C5 | Voice row plays in the production build (CDP: audio element `readyState` ≥ 2 after play), ⓘ sheet with recordist and licence, offline shows the wait line | shot, value |
| C6 | Idempotence: second `facts` run changes 0 rows; second `sounds` run puts 0 blobs | counts |
| C7 | `npm run check` green; migration rehearsed on a `pg_dump` copy | exit code |
| C8 | Owner: three pages on the phone, one sound | owner |

## ⬇️ Output

`docs/handoffs/0021-steckbrief-data-and-voice-findings.md` (decisions left open, C1–C8, doubts, "For the merge"), ETL README rows, `app/etl/data/README.md`, `.env.example` and `docs/DEPLOY.md` for `XENO_CANTO_API_KEY`, `docs/ROADMAP.md` M9b line ("part 1 built; prose waits"). Commit on `main`, do not push.

## 🚫 Not in this build

Prose · the `prose` column · insects' traits from the butterfly database (manual download, parked) · sounds in the offline pack · EOL/IUCN/TRY tokens.
