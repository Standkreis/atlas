# 🧹 [0025] Findings — Track C, ETL and data

| 🗓️ Done | 🌿 Branch | ✅ Check |
| --- | --- | --- |
| 2026-09-07 | `sweep-c` (worktree `../standkreis-dex-sweep-c`) | `npm run check` green, **61 tests** (59 + 2) |

> Brief: [0025 §🅲](0025-doubt-sweep.md). Scripts in `app/scripts/m25c/`. Every run against the dev DB; nothing touched Neon, nothing deleted in the Blob store.

## 🔁 Decisions

| # | Decision | Why |
| --- | --- | --- |
| C1a | **`ffmpeg-static` is a devDependency**, loaded with a dynamic `import()` in `etl/sounds.ts:ffmpegPath` | The ETL runs on the laptop only; Vercel's functions never import `sounds.ts`, and the 70 MB binary must not end up in a bundle. Absent package → one log line, WAV-only taxa stay without a clip, the step still runs |
| C1b | The pick stays one rule (`clip.ts:pickClip`): quality A, no ND, ≥ 5 s, song over call, 10–30 s band. **MP3 first; a WAV only when no MP3 qualifies** (`{ wav: true }` when ffmpeg is at hand), never a WAV over a worse-ranked MP3 | A transcode is a lossy re-encode; the original MP3 is the better file when one exists |
| C1c | Transcode: `-ac 1 -codec:a libmp3lame -b:a 128k`, nothing cropped, through two temp files (`sounds.ts:transcode`); `meta.transcoded: true` on the row | The handoff's numbers. Temp files, not pipes: a WAV header carries sizes ffmpeg wants to seek to |
| C1d | **Beyond the brief**: when the name search returns no recording at all, `sounds` asks GBIF for the binomial synonyms and searches those (`sounds.ts:synonyms`, one GBIF call, one xeno-canto call per synonym until a hit) | The Dorngrasmücke was never ND-only: xeno-canto files it as *Curruca communis* (4,932 recordings, 100 of quality A); the 0021 count "3 ND-only" was one taxonomy miss and two grasshoppers. A four-line fix inside my file list |
| C2a | Stratum rule (`traits.ts:stratumWord`): EltonTraits' seven `ForStrat-*` shares folded to five codes (`water` = below + around surface, `ground`, `understory`, `canopy` = midhigh + canopy, `aerial`); the top one counts when it holds **≥ 50 %** of the foraging time | Under half, the bird has no one stratum worth a word (Buchfink 40/30/30 → "Wald") |
| C2b | The second word is dropped when the AVONET class already says it: `water` on wetland, marine, coastal, riverine; `ground` on grassland, desert, rock; `understory` on shrubland | "Feuchtgebiet, Wasser" and "Gebüsch, Unterholz" repeat themselves (the handoff: "when it says something the primary class does not") |
| C2c | Codes in the DB, five new i18n keys under `species.facts.values.habitat`; the page's comma-join prints them without a change to `SpeciesPage.tsx` | 0021 decision 2, and Track B owns the page |
| C2d | A two-word habitat carries `source: 'AVONET, EltonTraits'`, AVONET's URL and `CC BY 4.0` | Every fact names its dataset (traits.ts header). EltonTraits is CC0, so CC BY covers the pair; the ⓘ link goes to AVONET, whose class is the first word |
| C3 | **PanTHERIA accepted** as CC BY 4.0 with the attribution every fact carries; written in `etl/data/README.md` | The archive says "ESA data paper", figshare's wrapper CC BY 4.0; the fact string names both. If the project goes public: ask ESA or drop the file (only `length` on 19 mammals is lost) |
| C4 | **NC accepted** for this app; the ETL README's `sounds` row and a comment above `clip.ts:usable` say where the `licensed.some` filter goes and that a refill follows | Personal project (owner's table) |
| C5 | **Insects without a trait source accepted** | 0019 doubt 7: no open dataset for Orthoptera, beetles, bugs, spiders; the Dryad butterfly file is a manual CC0 download for one order. The intro, the month profile and the GloBI edges are the insect Steckbrief; the section hides itself when empty (0021 decision 14); 18 of the 20 grasshoppers and frogs in Mainz-Bingen (no bats in the set) now carry a voice row |
| C6 | **Region job through `waitUntil` accepted** (0011 B2, B4) | Regions are filled locally and dumped (CLAUDE.md rule, ETL README §🚀 option 2); no new regions from the UI. The 20-hour path and the double kick exist only for a region nobody opens; the honest fix is a queue when regions open, not now |

## ✅ Checks

| # | Check | Evidence |
| --- | --- | --- |
| C1·1 | `npm run etl -- sounds --region "Mainz-Bingen"` after the transcode: **2 clips stored, 1.3 MB**, both `transcoded` | `Leptophyes punctatissima` XC827406 16 s, WAV 18.2 MB → **260 KB** · `Bufo bufo` XC972711 69 s, WAV 25.6 MB → **1,093 KB** (= 128 kbps) · 0.4 min, 11 xeno-canto requests |
| C1·2 | Second run with the synonym fallback: **1 clip stored** | `Sylvia communis found as Curruca communis` → XC917195 song 12 s CC BY-NC-SA 4.0, 396 KB · 1 GBIF + 3 xeno-canto requests |
| C1·3 | Third run: `86 had one` → idempotent | 0 stored, 0 failed |
| C1·4 | **Remaining without a clip in Mainz-Bingen: 2**, both ND-only, both grasshoppers | `Calliptamus italicus` (1703254): 3 A recordings, all WAV `CC BY-NC-ND` · `Oedipoda caerulescens` (1700310): 6 A recordings, all WAV `CC BY-NC-ND` · `scripts/m25c/xc-why.mjs` |
| C1·5 | Sound assets in the dev DB: 84 → **87** | `scripts/m25c/report.sh` |
| C1·6 | The pick and the transcode decision as pure tests | `steckbrief.test.ts` "the transcode decision": WAV only with `{ wav: true }`, never over an MP3, never ND, FLAC never, `needsTranscode` · 61 tests |
| C2·1 | `npm run etl -- facts --force` on the dev DB: **78 written (78 changed) of 1,869**, 0 failed, 0.5 min | 182 GBIF + 3 Wikidata + 6 GIFT requests; only rows whose facts changed are written (0021 decision 16) |
| C2·2 | Amsel `forest` → **`forest, ground`** ("Wald, Boden"); Mauersegler `human` → **`human, aerial`** ("Siedlung und Kulturland, Luft") | `report.sh` before and after |
| C2·3 | The 146 set birds by habitat after: 27 wetland · 15 forest, ground · 13 grassland · 10 forest, canopy · 9 wetland, ground · 9 forest · 9 human, ground · 8 woodland, ground · 8 coastal · … · 1 human, aerial; **78 of 146 gained a word** | `report.sh` |
| C2·4 | Rule as pure tests: Amsel, Mauersegler, the two tree strata folding, under half, the four "already said" classes, the Stockente staying `wetland` | `steckbrief.test.ts` "bird habitat gets the foraging stratum as a second word" |
| C2·5 | i18n: `ground`, `understory`, `canopy`, `aerial`, `water` in `de.json` and `en.json`; `messages.test.ts` parity passes | `npm run check` |
| C3/C4 | The two README lines | `app/etl/data/README.md` PanTHERIA row · `app/etl/README.md` `sounds` row and the paragraph after the Neon recipe |
| ✅ | `npm run check`: typecheck, lint, 61 tests, export build | green on `sweep-c` |

## 🤔 Doubts

| # | Doubt |
| --- | --- |
| 1 | **Bufo bufo's clip is 69 s** (the shortest A recording ≥ 5 s that is not ND): the 10–30 s band is a preference, not a cap. 1.1 MB is fine; a cap would drop the Erdkröte's only voice |
| 2 | `wetland, ground` on 9 birds (waders and rails) reads "Feuchtgebiet, Boden": correct, since they forage on the ground of the wetland, but a reader may expect "am Ufer". A word map per class would fix it; not without the owner's eye on the German |
| 3 | The `≥ 50 %` threshold is mine. Elton's shares are expert estimates in steps of 10; a bird at 50/50 (ground/understory) takes the first in `STRATA` order (`ground`) |
| 4 | Neon's Amsel and Mauersegler keep the one-word habitat until `facts --force` runs there (§🔀); the page renders both shapes |
| 5 | `ffmpeg-static` downloads a 70 MB binary on `npm install` from GitHub releases; a CI without that egress needs `FFMPEG_BINARIES_URL` or the package skipped (`npm install --omit=optional` does not skip it: it is a devDependency, the fetch happens in its `install` script). Vercel's build installs it too (≈ 5 s); moving it to `optionalDependencies` would silence a failure there, at the price of a silent WAV skip on the laptop |
| 6 | The synonym fallback (C1d) searches GBIF synonyms only when xeno-canto returns **zero** recordings, not when it returns some but none usable; a taxon with one bad recording under the old name and hundreds under the new one stays without a clip. Not seen in Mainz-Bingen |

## 🔀 For the merge

Track C merges last (after A, then B). Shared files with the other tracks, to merge by hand:

| File | C's change | Conflicts with |
| --- | --- | --- |
| `app/src/i18n/de.json`, `en.json` | five keys appended under `species.facts.values.habitat` after `fossorial` | A's and B's keys elsewhere; append-only, `messages.test.ts` guards parity |
| `app/package.json`, `package-lock.json` | `"ffmpeg-static": "^5.3.0"` in `devDependencies` | any dependency A or B adds; run `npm install` after the merge so the lock is one |

i18n keys added (both locales): `species.facts.values.habitat.ground` · `.understory` · `.canopy` · `.aerial` · `.water`.

After the merge and the deploy, from the owner's terminal in `app/` (the unpooled Neon URL as in the [ETL README §🚀](../../app/etl/README.md), the two keys loaded with `set -a; . ./.env.local; set +a`, nothing echoed; `npm install` first so `ffmpeg-static` is there):

```sh
npm run etl -- facts --force                         # every taxon; dev: 78 of 1,869 rows written, 0.5 min (the bird habitat word)
npm run etl -- sounds --region "Mainz-Bingen"        # dev: 3 new rows (Leptophyes, Bufo, Sylvia); the Blob objects exist, no download
```

`sounds` per region, `facts --force` once per database. Or Option 2 (dump `Taxon` and `Asset` from the dev DB), which carries both.
