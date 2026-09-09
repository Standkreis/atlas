# Germany index audit — accepted-taxonomy v2

Evidence for [#19](https://github.com/Standkreis/atlas/issues/19), recorded by
Codex on 9 September 2026. The [audit runbook](../operations/germany-catalogue-audit.md)
defines the reproducible checks and local activation/export gate. This record
does not authorize production transformation.

## Catalogue and regional coverage

- Candidate: `germany-2016-2026-taxonomy-v2-20260909`.
- Registry: `de-krg-2024-12-31`; 362 Kreisregionen composed from 400 Kreis units,
  mapped to 402 reviewed GADM query units. The standalone Bodensee query is
  explicitly excluded; no intended Kreisregion is excluded.
- Observation window: 2016–2026 inclusive, observation-window version 1,
  plausible-rules version 2, tile-mapping version 1.
- Deduplicated union: 6,874 accepted source-ranked taxa, including six accepted
  hybrid-formula taxa. This is not a count of every biological species in Germany.
- Regional set sizes: minimum 149, median 584, maximum 1,460.
- Südwestpfalz: 625 taxa, merging Landkreis Südwestpfalz, Pirmasens and
  Zweibrücken before floors and cuts. Its constituent query keys are
  `DEU.11.30_1`, `DEU.11.24_1`, `DEU.11.36_1`.

| National tile | Unique taxa |
| --- | ---: |
| Insect / other invertebrates | 3,660 |
| Plant | 2,069 |
| Fungus | 704 |
| Bird | 275 |
| Mammal | 71 |
| Fish / other chordates | 58 |
| Amphibian | 21 |
| Reptile | 16 |

The smallest reviewed sets are Sonneberg (149), Ludwigshafen (165),
Tirschenreuth (181), Sömmerda (181), and Fürth city (194). The largest are
Lüneburg (1,460), Berlin (1,450), Göttingen (1,366), Bautzen (1,266), and
Region Hannover (1,251). Low coverage is not biological absence; larger sets
are not evidence of greater underlying biodiversity.

## Independent sample review

Codex agent `/root/audit19_scientific_final` reviewed all 21 required targets;
this is an attributed agent review, not owner approval or human scientific
certification. It independently reconstructed 16,959 regional memberships
against 312 retained GBIF facet pages using the accepted-key resolutions.
Annual counts and all monthly shares matched, with zero discrepancies.
All 21 targets passed the scoped species, naming, seasonality and boundary
checks. Full target vertebrate lists and leading taxa in every tile were read.

The additional representative targets are Kiel, Lübeck, Dithmarschen,
Herzogtum Lauenburg, Nordfriesland, Städteregion Aachen, Eifelkreis Bitburg-Prüm,
Südwestpfalz, Breisgau-Hochschwarzwald, Garmisch-Partenkirchen, and Görlitz.
Göttingen's two historical query units correctly compose its modern Kreis.
The alpine sample's *Salamandra atra* range and spring–summer activity also
agree with the [Bavarian LfU species account](https://www.lfu.bayern.de/natur/sap/arteninformationen/steckbrief/zeige?stbname=Salamandra+atra).

## Limitations, not silently repaired membership

- The [owner's no-WoRMS decision](2026-09-09-germany-without-worms.md) retains
  coastal/source-record taxa. No habitat-filtered experimental candidate is
  used. Offshore and marine-only region design remains deferred.
- GBIF facet counts can contain provider duplicates and identification or
  captive-status uncertainty. This audit does not certify individual records.
  Südwestpfalz's 13 *Salmo salar* records reproduce the source; local wild
  status remains unverified and is not a claim of a common walking encounter.
- Seasonal labels reproduce relative recording profiles, not biological
  presence/absence. Südwestpfalz squirrel's December-only label and concentrated
  fish-survey months illustrate this limitation, especially near the floor.
- All 6,874 taxa currently use scientific-name fallback for German labels.
  Names and galleries are the following #21 enrichment step, not a reason to
  remove valid taxa. Optional prose, sounds, facts and interactions are not
  release requirements for every taxon.
- Reviewed GADM assignments approximate BKG land geometry; reproducing their
  mapping digest does not prove coordinate-level polygon equivalence.

## Identity and reproducibility

| Input | SHA-256 |
| --- | --- |
| Catalogue inputs | `facb385c5e6495f58b95e9625a9ddcac38ce538e4a1ee2a64f42953b2d17d4a9` |
| Source responses | `388a0096f605b7c945c7b050ae8d2bf66461e19ef8feecb5bdac15fef5584118` |
| Accepted union | `6ede6e5b059fa0d3d5edc0e883654a1c7ecb2df08abae129c32c9953e25ae38e` |
| Reviewed target evidence | `1095e6eb8d84fa99bd0319da224d845afd7bfc42eb3ed7107e591e87b89b8ab5` |

The separate local review database is `dex_germany_review_v2`. The original
experiment database remains intact. Raw source caches, detailed bound review,
audit JSON and transfer JSONL remain operational artifacts outside Git; this
record preserves the curated findings without redistributing the raw mapping.

Code review by Codex agent `/root/audit19_code_review` found and fixed two
publication defects: audit/export now share one PostgreSQL snapshot, and
active audits verify exact staged/live membership, lookalikes, summaries and
singleton activation. Regression tests cover concurrent content changes,
live-row drift and registry deactivation. A production import still requires
the separate #28 transformation/recovery plan and #29 release gates.

## Local activation and checked payload

Final post-activation result: **ready for transfer**, zero defects, all 21
reviews passed, all 362 regions ready, no pending/running/failed builds and no
region exclusions. The four machine-reported coverage categories are boundary
approximation, missing German names, provider duplicates and the standalone
water-query exclusion; the additional scientific caveats above remain explicit.

The live local set contains 214,321 plausibilities and 151,680 lookalike links,
equal to the staged candidate. All 11 protected-table hashes matched before and
after activation. This generation database has no personal/asset rows, so that
comparison is not a substitute for the nonempty preservation integration tests
and the later representative migration rehearsal.

The first export was deliberately cancelled when repeated OFFSET scans and
spill-heavy equality queries proved slow at national scale. One cursor per
table and exact full-join drift comparisons resolved that defect without
weakening the gate. The partial file was removed; committed local activation
was preserved and the export rerun successfully.

The checked JSONL has **418,018 rows in 14 tables**, 156,368,718 bytes. A separate
streaming read reproduced its byte digest, every table digest and every count.
It contains 362 regions/builds/registry entries, 400 source units, 402 query
units, 1,637 aliases, 3 source records, one registry, one catalogue, 6,874 Taxon
and union rows each, 34,739 taxonomy resolutions, 214,321 staged plausibilities
and 151,680 staged lookalikes. No personal or mixed Asset rows are included.

| Checked evidence | SHA-256 |
| --- | --- |
| Bound review JSON | `7e57894926f0a9351d509533e93d72694549f64bb51956a0d8c713860afee7d4` |
| Final audit | `9178ccd01a1943068b29b4f4e99ad7942ecd7ff7eb98fc708bc479d4dc4c0ac1` |
| Transfer JSONL | `5931ef3540398ccf5eaf2779054f9d20341cc7babcb02fbe341dec2065deb008` |

Operational bundle: `/private/tmp/germany-v2-reviewed-transfer`; completed review:
`/private/tmp/germany-v2-final-review.json`. Enrichment changes in #21 require a
new checked content/gallery artifact; this pre-enrichment payload is not the
final production release bundle.
