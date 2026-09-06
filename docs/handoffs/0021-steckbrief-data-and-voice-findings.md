# 📇 0021 · Steckbrief data and voice — findings

> Built on `main`, 2026-09-07, from [handoff 0021](0021-steckbrief-data-and-voice.md) after [grill 0019](0019-steckbrief-grill-findings.md). Checks C1–C7 on the dev DB and the production build; C8 (the phone) is the owner's. Shots in [`0021-shots/`](0021-shots/), scripts in `app/scripts/m9b/`.

## 🧭 Decisions the handoff left open

| # | Decision | Why |
| --- | --- | --- |
| 1 | The migration adds **`Asset.meta JSONB`** next to `Taxon.factsAt` | D5 wants `{ xcId, type, length, quality }` on the sound row and the schema had no column for it. One migration, two columns (`app/prisma/migrations/20260909000000_facts_at/migration.sql`) |
| 2 | Enum-like values are stored as **codes**, the page translates (`species.facts.values.<key>.<code>`, `de.json`/`en.json`) | D7 "translated, never raw". Lists stay `", "`-joined codes (`terrestrial, aquatic`) |
| 3 | Numbers are metric strings with an ASCII point (`8.2 g`, `21.3 cm`); the page prints the German comma (`SpeciesPage.tsx` `factWords`) | One value in the DB, two spellings on the page |
| 4 | Flowering months in German abbreviations (`Mai–Okt`), the page swaps four for `en` | Same convention as the year strip's `words` (record 0002 E3) |
| 5 | **Wingspan from Wikidata P2050 with its unit**, not AVONET `Wing.Length` | AVONET's number is the wing chord (Amsel 12 cm), not what a walker calls Spannweite (36 cm). 84 % of birds, equals the grill |
| 6 | Mammal `habitat` dropped | PanTHERIA's `HabitatBreadth` is a count, not a place; nothing to show |
| 7 | GIFT facts carry **no `licence`**, source `GIFT (Weigelt et al.)` | The API states none (§🔒 of the handoff); the ⓘ shows dataset and link only |
| 8 | PanTHERIA licence string `CC BY 4.0 (figshare wrapper; the archive names none)` on every PanTHERIA fact | Used, marked, for the owner (§⚠️) |
| 9 | Sounds: **MP3 files only** (`file-name` ends in `.mp3`) | The first smoke run stored three grasshopper WAVs of 4–20 MB each (`XC966999` 26 s = 19.8 MB). No ffmpeg, no cropping: WAV-only taxa stay without a clip (4 of 89 in Mainz-Bingen) |
| 10 | Sounds in dev went to **Vercel Blob** (`BLOB_READ_WRITE_TOKEN` is in `app/.env.local`), keyed `sounds/<gbifKey>.mp3` | The GBIF key, not the Asset id, so a table dump to Neon (ETL README option 2) finds the same files in the one store. Disk under `PHOTO_DIR/sounds/` when the token is unset, same seam |
| 11 | Sound Asset `url` = `/api/photo/<id>.mp3` | The suffix lets the worker keep the clip out of the image cache (D8) and the route tell the kind; nothing renamed, the photo path is untouched |
| 12 | The route answers **Range requests** (206) from the buffered clip | iOS Safari asks `bytes=0-1` before it plays anything; Chrome asked too (C5: one 206) |
| 13 | Name search on xeno-canto (`sp:"Turdus merula" grp:birds q:A len:5-30`, then without `len`) instead of P2426 | Same value hyphenated; one request less per taxon |
| 14 | Steckbrief section hidden only when the tile has no keys **and** no fact **and** no IUCN **and** no clip | An insect without anything shows nothing (C3); a grasshopper with a clip shows Status and the voice row |
| 15 | The grey line names only the tile's keys, animals include AnAge's `lifespan`/`reproduction` | `TILE_KEYS` in `SpeciesPage.tsx:20`; fish/reptile/insect have no row, so no line |
| 16 | `facts` writes only rows that changed (canonical JSON compare) | Postgres returns jsonb in its own key order; the first version called every row changed. Now `--force` twice → 0 written |
| 17 | `content` calls `runFacts({ keys, force: true })` after its pool for the taxa it filled (`etl/content.ts`) | D3 "also inside content after GloBI"; `--purge <gbifKey>` also nulls `factsAt` |
| 18 | Amphibian `mass` not written | D2 lists length, habitat, diet for amphibians; AmphiBIO has `Body_mass_g` on 100 %, one line in `traits.ts` if wanted |

## 🛠️ What was built

| D | Where | Note |
| --- | --- | --- |
| D1 | `prisma/schema.prisma`, `prisma/migrations/20260909000000_facts_at/migration.sql` | `Taxon.factsAt TIMESTAMP(3)`, `Asset.meta JSONB`; applied locally with `migrate deploy`, `migrate diff` clean |
| D2 | `etl/sources.ts` `Fact`, `etl/traits.ts`, `etl/gift.ts`, `etl/facts.ts` | 13 keys, every new one with `licence` (GIFT excepted, decision 7) |
| D3 | `etl/facts.ts` `runFacts`, `etl/cli.ts` `facts`, `etl/data/` + [README](../../app/etl/data/README.md) | bulk files by binomial + GBIF synonyms on a miss; GIFT species list + 5 trait tables with `limit=1000000` (the default caps at 10 000 rows, which is why the grill saw height 65 % and life form 46 %); Wikidata in batches of 100 |
| D4 | `etl/facts.ts` `vernacularEn` | GBIF's most-agreed `eng` name into `names.en` when empty; 1 214 names filled over the four regions |
| D5 | `etl/clip.ts`, `etl/sounds.ts`, `src/server/photos.ts` (`writeSound`, `soundExists`, `readSound`, `soundUrl`) | one Asset per taxon, `origin: 'xeno-canto'`, idempotent by the existing row |
| D6 | `src/components/SpeciesPage.tsx` (`TILE_KEYS`, `factWords`, `VoiceRow`), `src/app/api/photo/[id]/route.ts`, `src/server/routers/taxon.ts` (`meta` in the page's assets) | layout A; native `<audio preload="none">`; ⓘ per cell with dataset, licence, DOI; Quellen line lists every dataset behind a cell plus `Stimme: xeno-canto` |
| D7 | `src/i18n/de.json`, `en.json` | 13 labels, 8 code tables, the voice strings; `sound` replaced by `voice`; parity test green |
| D8 | `public/sw.js` `isImage`, `VoiceRow` + `useOffline` | `.mp3` never enters the image cache; offline the row says "Stimme wartet aufs Netz" and has no button |
| D9 | dev DB: facts on all four regions, sounds on Mainz-Bingen; ETL README §🚀 | the two Neon commands below |

Unit tests: `src/server/steckbrief.test.ts` (7 tests: formats, CSV reader, diet shares, the three joins, the clip pick, licence names).

## ✅ Checks

### C1 · coverage, four regions (1 869 set taxa), `scripts/m9b/coverage.mts`

Before (the DB at the start of the handoff): facts on 143 taxa (AnAge only: bird 101, mammal 21, fish 12, reptile 4, insect 3, amphibian 2), `names.en` on 25 %, no sound. After:

| key | insect (886) | plant (643) | bird (147) | fungus (110) | fish (30) | mammal (24) | amphibian (16) | reptile (13) | all | grill 0019 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mass | 0 | 0 | **99 %** | 0 | 0 | **100 %** | 0 | 0 | 9 % | 99 · 100 (· amphibian 100, not written, decision 18) |
| wingspan | 0 | 0 | 84 % | 0 | 0 | 0 | 0 | 0 | 7 % | 84 |
| length | 0 | 0 | 0 | 0 | 0 | 79 % | 100 % | 0 | 2 % | 79 · 100 |
| migration | 0 | 0 | 99 % | 0 | 0 | 0 | 0 | 0 | 8 % | 99 |
| habitat | 0 | 0 | 99 % | 0 | 0 | 0 | 100 % | 0 | 9 % | 99 · 100 |
| diet | 0 | 0 | 99 % | 0 | 0 | 100 % | 69 % | 0 | 10 % | 99 · 100 · 69 |
| activity | 0 | 0 | 97 % | 0 | 0 | 100 % | 69 % | 0 | 10 % | 97 · 100 · 69 |
| flowering | 0 | **84 %** | 0 | 0 | 0 | 0 | 0 | 0 | 29 % | 84 |
| height | 0 | 87 % | 0 | 0 | 0 | 0 | 0 | 0 | 30 % | 65 (the 10 000-row cap) |
| pollination | 0 | 81 % | 0 | 0 | 0 | 0 | 0 | 0 | 28 % | 81 |
| lifeform | 0 | 87 % | 0 | 0 | 0 | 0 | 0 | 0 | 30 % | 46 (the cap) |
| edibility | 0 | 0 | 0 | **58 %** | 0 | 0 | 0 | 0 | 3 % | 58 |
| sporePrint | 0 | 0 | 0 | 45 % | 0 | 0 | 0 | 0 | 3 % | 45 |
| any fact | 0 | 90 % | 99 % | 58 % | 40 % | 100 % | 100 % | 31 % | **45 %** | |
| names.en | 86 % | 97 % | 100 % | 94 % | 93 % | 100 % | 100 % | 100 % | **92 %** (was 25 %) | 93 predicted |
| sound clip | 1 % | 0 | 24 % | 0 | 0 | 0 | 19 % | 0 | 3 % | Mainz-Bingen only |

Every number within 2 points of the grill except height and life form, which are higher because the grill's GIFT pull was capped. Per region `factsAt` set: Mainz-Bingen 929/929, Schagen 902/902, Kyoto 303/303, Südwestpfalz 583/583. Runs: Mainz-Bingen 889 taxa 24 s (655 GBIF, 1 Wikidata, 6 GIFT), Schagen 503 taxa 6 s, Kyoto 255 taxa 6 s, Südwestpfalz 182 taxa 6 s; 0 failed.

### C2 · ten pages, `scripts/m9b/steckbrief.mjs` (production build, 390 × 844, de and en)

| Page | Cells (de) | Evidence |
| --- | --- | --- |
| Brennnessel | Blütezeit **Mai–Okt** · Höhe 3 m · Bestäubung Wind · Lebensform Staude; ⓘ → "GIFT (Weigelt et al.)" with link | `c2-brennnessel-de.png`, `c2-brennnessel-info-de.png` |
| Fliegenpilz | Speisewert **giftig, psychoaktiv, Heilpilz** · Sporenpulver weiß; the "Kein Speisepilz-Ratgeber" box precedes the section (`compareDocumentPosition` = following) | `c2-fliegenpilz-de.png` |
| Amsel | Gewicht **103 g** · Spannweite **36 cm** · Zug **Standvogel** · Wald · Allesfresser · tagsüber · Alter · Nachwuchs; ⓘ on Gewicht → AVONET, CC BY 4.0, DOI; voice row `♪ Gesang · 0:13 · CC BY-NC-SA 4.0 · marc` | `c2-amsel-de.png`, `c2-amsel-info-de.png` |
| Rotkehlchen | 18 g · 21 cm · Zugvogel · Wald · Allesfresser · tagsüber + AnAge; `♪ Gesang · 0:08` | `c2-rotkehlchen-de.png` |
| Grasfrosch | Länge 11 cm · an Land, im Wasser, auf Bäumen · Gliederfüßer · tagsüber, nachts; grey line "Alter · Nachwuchs: noch keine Angaben"; `♪ Ruf · 0:08` | `c2-grasfrosch-de.png` |
| Eichhörnchen | 333 g · **21,3 cm** (comma) · Samen, Pflanzen, Früchte · tagsüber + AnAge | `c2-eichhoernchen-de.png` |
| Stieleiche | Apr–Mai · 50 m · Wind · Baum oder Strauch | `c2-stieleiche-de.png` |
| Sichelschrecke (insect, clip) | Status only + `♪ Gesang · 0:25 · Baudewijn Odé` | `c2-sichelschrecke-de.png` |
| Schwarzkehlchen | 14 g · Teilzieher · Gebüsch · Wirbellose · tagsüber; grey line "Spannweite · Alter · Nachwuchs: noch keine Angaben" | `c2-schwarzkehlchen-de.png` |
| Hauhechel-Bläuling | **no Steckbrief section** (C3) | `c2-hauhechel-blaeuling-de.png` |

English: `May–Oct`, `21.3 cm`, `resident` / `partial migrant` / `migratory`, `poisonous, psychoactive, medicinal`, `Song · 0:13`; same pages `-en.png`. Quellen line on the Amsel: `Daten: GBIF, Wikidata, AVONET, EltonTraits, AnAge · Stimme: xeno-canto`.

### C3 · no Steckbrief / grey line

Insect without facts and clip (Polyommatus icarus): no `[data-testid=facts]` in the DOM. Bird with none in the set: Parus cinereus (Kyoto) has `facts` null; the rule shows its grey line with the eight bird keys. Shot of the closer case Schwarzkehlchen above (three missing keys named).

### C4 · sounds log, Mainz-Bingen (excerpt of the run's output)

```
sounds: 89 taxa in the xeno-canto groups, 5 with a clip already
  ♪ Turdus merula: XC646886 song 0:13 CC BY-NC-SA 4.0 marc · 331 KB
  ♪ Rana temporaria: XC… advertisement call 0:08 CC BY-NC-SA 4.0 Olivier SWIFT
sounds: 79 clips stored (22.7 MB), 5 had one, 5 without a usable clip (3 with ND only, 4 with WAV only), 0 failed of 89 · 3.1 min · requests {"xeno-canto.org":168}
```

| Number | Value |
| --- | --- |
| Clips in the DB | **84** (73 song, 8 call, 3 other) — 63 birds, 13 grasshoppers, 3 frogs; 5 of 89 taxa without (3 ND-only, 4 WAV-only) |
| ND licences stored | **0** (`licence like '%ND%'` → 0); 80 × CC BY-NC-SA 4.0, 3 × 3.0, 1 × CC BY-NC 4.0 |
| Length | 5–44 s, mean 11 s, sum 945 s |
| Size | 25.1 MB for 84 (mean 300 KB; Amsel 339 434 bytes) |
| Blob keys | `sounds/<gbifKey>.mp3`, e.g. `sounds/2490719.mp3` |
| Without key | `sounds: XENO_CANTO_API_KEY is not set, skipping the step (the account page at xeno-canto.org has it)`, exit 0 |

### C5 · the voice row on the production build

| Step | Result |
| --- | --- |
| `<audio>` | `src=/api/photo/cb4c5f2c-….mp3`, `preload=none` |
| tap play | `readyState 4`, `paused false`, `duration 13.875`, `error null`; button `aria-pressed=true`; one network response `206 audio/mpeg`, not from the worker (`c5-playing-de.png`) |
| tap again | `paused true` at 0.1 s |
| ⓘ | Autor marc · Lizenz CC BY-NC-SA 4.0 (deed link) · Quelle xeno-canto → `https://xeno-canto.org/646886` · note `XC646886 · Gesang · 0:13 · Qualität A` (`c5-voice-info-de.png`) |
| curl | `GET …mp3` → 200, `content-type: audio/mpeg`, `accept-ranges: bytes`, 339 434 bytes; `Range: bytes=0-1` → 206 `content-range: bytes 0-1/339434`; `GET /api/photo/<soundId>` without suffix → 404 |
| offline | page served by the worker, banner in 0 ms after the radio flag flips, row `♪ Stimme · Stimme wartet aufs Netz`, no play button (`c5-offline-de.png`, `-en.png` "Voice is waiting for a signal") |

Headless Chrome drops `Network.emulateNetworkConditions` on the hard navigation (`navigator.onLine` true again after `Page.navigate`); the script re-applies it, which fires the window's `offline` event, the path a phone takes.

### C6 · idempotence

| Run | Result |
| --- | --- |
| `facts` (default) after the fill | `facts: 0 taxa` |
| `facts --force` twice | 1 869 taxa, second run **0 written (0 changed)**, 0 network requests (191 cache hits) |
| `sounds --region "Mainz-Bingen"` again | `0 clips stored (0.0 MB), 84 had one`, 0 downloads |

### C7 · `npm run check`, migration rehearsal

`npm run check`: typecheck, lint (0 errors, the 5 warnings are older probe scripts), **53 tests** (was 46), export build — exit 0. Rehearsal: full `pg_dump` of the dev DB into `dex_rehearsal` inside the container, the new migration row deleted and both columns dropped, `DATABASE_URL=…/dex_rehearsal npx prisma migrate deploy` → `20260909000000_facts_at` applied, `factsAt timestamp`, `meta jsonb` present, 28 714 taxa and 2 010 assets intact; database dropped.

## 🤔 Doubts for the owner

| # | Doubt |
| --- | --- |
| A | **Fliegenpilz "Heilpilz"**: Wikidata P789 holds `medicinal mushrooms` next to poisonous and psychoactive. The code is translated faithfully; the mycomorphbox is only as good as its editors. The box above stays the guard |
| B | AnAge values are still English on the German page (`21.8 years (wild)`, `mature at 365 days`) — untouched by this handoff, the same before |
| C | GIFT `height` is the **maximum** (`1.6.2`): Brennnessel 3 m, Stieleiche 50 m. Correct but tall; a label "Höhe bis" would say so |
| D | Bird `habitat` from AVONET is one word (`Wald` for the Amsel, `Gebüsch` for the Schwarzkehlchen); AVONET's `Habitat` is the primary class only |
| E | 5 of 89 Mainz-Bingen taxa have no clip: 3 with ND-only recordings, 4 grasshoppers whose A recordings are WAV only. Cropping or transcoding would need ffmpeg in the ETL; left out |
| F | Sounds are all NC (`CC BY-NC-SA`, one `CC BY-NC`): fine for this app, a blocker for anything sold later |
| G | The shortest-clip rule picks 5–8 s snippets (Rotkehlchen 8 s, Pica pica 5 s); some are a single phrase. `len:10-30` first would give fuller songs at a slightly larger store |
| H | PanTHERIA's licence is unstated in the archive (decision 8) |
| I | Blob holds the dev clips now (25 MB, `sounds/`); nothing on Neon references them until the set tables are dumped |

## 🔀 For the merge

Straight on `main`, one commit. Vercel's build applies the migration. Then, from the owner's terminal in `app/` (the unpooled Neon URL as in the ETL README, the two keys loaded from `.env.local` with `set -a; . ./.env.local; set +a`, nothing echoed):

```sh
npm run etl -- facts --region "Mainz-Bingen"
npm run etl -- sounds --region "Mainz-Bingen"
```

`facts` needs no key (25 s per region from the cache, all 1 869 dev taxa have `factsAt` set, so a dump of `Taxon` also carries the facts); `sounds` reuses the Blob files already there (`soundExists` → no download) and only writes the Asset rows, or a dump of `Asset` carries them. `XENO_CANTO_API_KEY` never goes to Vercel.
