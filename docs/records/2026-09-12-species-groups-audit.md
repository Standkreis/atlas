# Species groups A — shipped catalogue and source audit

**Measured 12 September 2026 for [#120](https://github.com/Standkreis/atlas/issues/120), child of [Epic #93](https://github.com/Standkreis/atlas/issues/93).** Package A is an audit; the package B proposal belongs to [#121](https://github.com/Standkreis/atlas/issues/121). No browse membership has been populated or approved. No filters, schema, catalogue, galleries, personal records or production data were changed.

The shipped catalogue supports useful taxonomic splits now: **3,194 true insects inside the 3,660-record legacy insect bucket; 227 grass/sedge/rush-family plants, 43 fern/horsetail-class plants and 95 moss/liverwort records**. Woody/herbaceous shortcuts still need suitable traits and exact identity provenance. Missing-class chordates and sparse plant facts make an explicit unknown category essential.

## Release and population binding

| Binding | Verified value |
| --- | --- |
| Release acceptance | #29 Closed/Completed; PR #101 merged `b656adfb6c43ee034aee3a7579ea99e7db3043aa` |
| Epic adoption | #14 Closed/Completed; PR #100 merged `c406409c167b104194a0d5dd805fb2282b3afa32` |
| Shipped code | `c406409c167b104194a0d5dd805fb2282b3afa32`; final release Ready Production `dpl_618RvvVhBnsPwTwjVN21WSiSSunD`, build `mtygbv2x` |
| Start-of-audit remote main | `fae0c81e797f2acaf1aa0a3392166d753208aa20`; its application tree is byte-identical to the shipped code |
| Concurrent integration checkpoint | `f0c74601a347f9aa2f05c47f129cc8dd5984ce9a` (#116 via #119), only `.github/workflows/check.yml` differs; GitHub Production deployment `6411473896` reports success at 15:51:16 UTC |
| Catalogue run / ID | `germany-2016-2026-taxonomy-v2-20260909` / `b59b97f4-6fdd-4900-a263-be2c05d78bbf` |
| Registry / artifact SHA-256 | `de-krg-2024-12-31` / `5f118de7d4a2bf97f5bb8ecf11232ed02a2a26aa6e0739ff5cdaa7efbe7cbe18` |
| Accepted union SHA-256 | `6ede6e5b059fa0d3d5edc0e883654a1c7ecb2df08abae129c32c9953e25ae38e` |
| Rules retained | plausible rules 2, tile mapping 1, observation window 1, years 2016–2026; floor 10 / per-tile 90% cut |
| Exact native release archive | 87,757,467 bytes; SHA-256 `02f81429a0aa8a77c97fe7d1309793a65157f7a021b44df6692ebe94658fdeb0` |
| Audit database | Fresh `dex_check_epic93_audit_20260912`, existing local PG18 container `atlas-germany-rehearsal-pg18-20260911`, localhost:5434; no other database modified |

The [release record pinned to the shipped code](https://github.com/Standkreis/atlas/blob/c406409c167b104194a0d5dd805fb2282b3afa32/docs/records/2026-09-11-germany-release.md) proves actual native COMMIT, independent production readback of all 34 table fingerprints, and passing media, region/progress, offline and analytics journeys. The [adopted ADR](https://github.com/Standkreis/atlas/blob/c406409c167b104194a0d5dd805fb2282b3afa32/docs/adr/2026-09-11-germany-atlas.md) and #14's final comment bind release health/entry/species/worker verification at **14:00:16.796 UTC**. This audit verified the merged PRs and archive hash, then restored that archive into a new local database. It did not rerun production journeys or query production SQL. A separate live public health read returned `ok:true`, build `mtyjrbil`; health alone is not catalogue or deployment-SHA evidence.

The native replacement actually shipped, superseding the earlier provisional importer plan after failed attempts. Its [reviewed native plan](../operations/2026-09-12-germany-native-replacement.md) records owner authorization at that time; it supplies no authorization for new destructive work here. The audited snapshot is the **release population**, not a claim that later personal records in production remain byte-identical.

All 362 regional live sets union to exactly 6,874 accepted keys, with **214,321 memberships** and no per-region duplicate. Counts range **149 (Sonneberg)–1,460 (Lüneburg)**. Global storage's 27,467 taxa and 363 stored regions are not these denominators. The registry has 400 source Kreis units / 402 query units per release evidence. There are six accepted hybrid-formula taxa, 36,338 reviewed eligible images, 313 retained hidden references and **424 taxa without an eligible image**; all are included in this audit.

## National broad categories and retained fields

“Present” below means a nonempty stored value; it does not certify trait truth or join quality. Source hierarchy fields are counted on the deduplicated terminal accepted response, not on all source-resolution rows.

| Internal tile | Taxa | Class | Order | Family | Genus | Facts object | Plant lifeform |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| insect | 3,660 | 3,660 | 3,643 | 3,660 | 3,660 | 3 | 0 |
| plant | 2,069 | 2,069 | 2,069 | 2,069 | 2,069 | 505 | 496 |
| fungus | 704 | 703 | 702 | 695 | 704 | 59 | 0 |
| bird | 275 | 275 | 275 | 275 | 274 | 123 | 0 |
| mammal | 71 | 71 | 71 | 71 | 71 | 20 | 0 |
| fish | 58 | 6 | 58 | 58 | 58 | 9 | 0 |
| amphibian | 21 | 21 | 21 | 21 | 21 | 8 | 0 |
| reptile | 16 | 16 | 0 | 16 | 16 | 0 | 0 |
| **Union** | **6,874** | **6,821** | **6,839** | **6,865** | **6,873** | **727** | **496** |

No union taxon has nonempty `tags` or `prose`. Intro and Wikidata coverage by tile are in [measurements.json](assets/2026-09-12-species-groups/measurements.json). The 496 plant lifeforms are **24.0% of 2,069**, leaving 1,573 without that fact. They are 208 hemicryptophyte, 111 therophyte, 82 cryptophyte, 65 phanerophyte and 30 chamaephyte. None is a reviewed source-qualified woody/herbaceous membership. Family/full lineage are not first-class `Taxon` fields; `dex.set` sends none of these ranks, facts or tags.

## Retained taxonomy: evidence before requests

There are **34,739 `CatalogueTaxonomyResolution` rows**: 34,651 accepted resolutions and 88 rejected resolutions. These describe pre-cut source processing, not the catalogue size. **6,938 resolution rows reach the 6,874 shipped accepted keys**. All terminal envelopes agree for duplicated accepted keys; every stored envelope fingerprint recomputes successfully. All catalogue keys have an accepted species envelope with matching key, rank and taxonomic status. Stored class/order/genus agree with those envelopes.

Every accepted union response identifies **GBIF Backbone Taxonomy** dataset `d7dddbf4-2cf0-4f39-9b2a-bb099caae36c`, with a `gbif:<key>` taxon identifier. This is the frozen backbone published **2023-08-28**, DOI `10.15468/39omei`, CC BY 4.0—not COL XR. The current GBIF occurrence API still defaults to this backbone when `checklistKey` is absent. [Official dataset metadata](https://api.gbif.org/v1/dataset/d7dddbf4-2cf0-4f39-9b2a-bb099caae36c), [current taxonomy interpretation](https://techdocs.gbif.org/en/data-processing/taxonomy-interpretation).

All 6,874 have kingdom/phylum names and numeric IDs, parent ID, dataset, taxon ID, scientific name, accepted status, constituent dataset and interpretation timestamps. Family names/IDs survive for 6,865 (all plants and animals); nine missing families are fungi. `sourceTaxonKey` survives for 4,753. None embeds arbitrary-rank full ancestry or growth-form traits. Constituent/source keys must be paired with their dataset: a constituent pointing to COL does not turn the enclosing Backbone key into a COL XR identifier. `lastInterpreted` is not a dataset release date.

The six hybrid records have `nameType=HYBRID`, no canonical name, and remain separate accepted identities: `9812709`, `9877678`, `10124612`, `10243708`, `10650260`, `12188634`, each qualified by the Backbone dataset above. The bird hybrid lacks genus; it is not dropped. No name-only synonym resolution or taxonomy migration is part of this audit.

## Plants: measured candidate anchors, unresolved growth forms

All numeric anchors in this table are in that exact Backbone dataset. These are **audit projections**, not approved biological group definitions or written memberships.

| Candidate | Source anchor and measured count | Remaining interpretation |
| --- | --- | --- |
| Grasses, sedges & rushes | Families Poaceae `3073`:125; Cyperaceae `7708`:81; Juncaceae `5353`:21 → **227** | Review exact three-family browse definition. Poales is 231, so substituting all Poales adds four other records; all Liliopsida would add 172 |
| Ferns & horsetails | Polypodiopsida class `7228684`: **43**, including Equisetales order `954`:9 | Source-class membership includes aquatic ferns and one accepted hybrid; keep them |
| Mosses & liverworts | Bryophyta phylum `35`:79 + Marchantiophyta `9`:16 → **95** | No retained hornwort phylum occurs. An eventual hornwort-inclusive label needs an explicit keyed definition, not guessed absence |
| Clubmoss-class records | Lycopodiopsida `245`: **6** | Decide separate residual versus explicitly expanded fern/clubmoss label; not silently “ferns” |
| Algal-phyla records | Charophyta `7819616`:9 + Chlorophyta `36`:4 → **13** | All plants must keep these accessible; “wildflowers” cannot cover them |
| Remaining plants | **1,685** after the disjoint anchors above | Includes 1,662 flowering-class plants outside the grass-family union and 23 Pinopsida/Ginkgoopsida. No woody/herbaceous assignment is justified from absence of other memberships |

These six measured partitions sum exactly to 2,069 with **zero intersection**. That does not prove future growth-form shortcuts are disjoint. Of the 496 retained lifeform facts, 30 intersect the three grass families, 12 the fern/horsetail class and 454 the remaining plants. There are no retained lifeforms on the other three measured partitions. Neither a Raunkiaer code nor “not known woody” establishes herbs/wildflowers. Woody climbers, dwarf shrubs, facultative woody/herbaceous states and hybrids require direct evidence and explicit rules. No tree/shrub/herb count is claimed.

### Retained GIFT responses

Read-only inspection of the existing root `app/etl/.cache/gift.uni-goettingen.de` found six public response arrays; no shared file was edited. The [cache inventory](assets/2026-09-12-species-groups/gift-cache-summary.json) pins URLs and hashes. It is supplementary retained evidence, **not hash-bound to the production archive**.

- Species index: **100,000 rows**. Lifeform: **89,688**. Height:70,367; flowering start/end:19,582/19,351; pollination:5,938. The lifeform table contains **54,340 work_IDs absent from the species index**. Its completeness cannot be inferred from the old source comment claiming about 380,000 species.
- Species rows contain GIFT work/genus IDs, names and authors, but no GBIF accepted-ID crosswalk. Traits retain `work_ID`, value, agreement, count and bibliography IDs. The six arrays embed no explicit dataset version, licence, provider retrieval time or bibliography bodies.
- Exact trimmed scientific-name equality produces **1,722 name candidates**, **1,631 with a lifeform row**. These are search candidates only, not verified identities or coverage. **534/1,631** have agreement below 1 (minimum 0.333); 83 bibliography IDs need resolving.
- The shipped first-two-token join produces four additional apparent plant matches by truncating accepted hybrid formulas onto one parent. Two GIFT IDs then collide with independently admitted parent taxa. This makes the tempting **1,635** figure unsafe even as an unqualified name-match count.
- All 496 shipped lifeform values agree with the corresponding existing name candidate; their Fact objects omit work_ID, references, agreement and dataset version. Agreement of copied values does not repair the identity/provenance gap.

No traits were downloaded or imported. Existing facts and galleries are preserved; repairing old content is a separate scope. Inspect pinned cache evidence and validate identity, completeness and licensing before any later acquisition.

## Animals: correct the visible catch-alls

| Legacy insect contents | Count | Source evidence |
| --- | ---: | --- |
| Insecta | 3,194 | class `216` |
| Arachnida | 208 | class `367` (175 Araneae; label must include other arachnids) |
| Mollusca | 137 | phylum `52`:102 Gastropoda,34 Bivalvia,1 Cephalopoda |
| Candidate crustacean classes | 39 | Malacostraca `229`:36; Maxillopoda `203`:2; Branchiopoda `281`:1 |
| Remaining invertebrates | 82 | 47 Collembola,14 Diplopoda/Chilopoda,6 Cnidaria,5 Bryozoa,5 Annelida,4 Echinodermata,1 Ctenophora |
| **Legacy bucket** | **3,660** | All source Animalia; none is Chordata |

Thus **466 (12.7%) are not Insecta**. A browse-level “crustaceans” union can be proposed from the three classes, but the retained hierarchy alone does not prove a Crustacea ancestor or a non-hexapod definition. Keep this rule provisional pending an authoritative reviewed crosswalk. If that mapping is deferred, its 39 records remain in the broad/unknown route; they do not disappear. “Other invertebrates=82” is conditional on adopting that explicit class union; otherwise known remaining plus these candidates is 121.

Insect orders show value for one optional deeper disclosure: Lepidoptera **1,216**, Coleoptera **578**, Diptera **548**, Hymenoptera **295**, Hemiptera **293**, Odonata **74**; all other orders **190**. “Schmetterlinge / Butterflies & moths” must include moths; “Bienen / Bees” would not describe all Hymenoptera. These are source order counts, not a mandate to expose every order.

The legacy fish tile contains **3 Elasmobranchii (`121`), 2 Petromyzonti (`11881065`), 1 Ascidiacea (`356`), 52 missing class**. All 58 retain Chordata `44`, family and order. The explicit ascidian is `gbif:2331942`, *Styela clava*, in the Backbone dataset. It needs an honest accessible browse home. Lampreys need an explicit include/exclude decision for an everyday fish shortcut. The 52 missing-class records must not become fish solely because `tile=fish` or their names sound familiar.

After examining all retained envelopes, a bounded public probe requested `/v1/species/{key}/parents` for the **13 distinct orders** covering the 52 records and the three candidate crustacean classes. **16 unique endpoints / 17 successful requests** (one preliminary repeat). All returned the same frozen Backbone dataset, but order ancestry was only Animalia→Chordata and candidate-class ancestry only Animalia→Arthropoda. The missing relationships remain unresolved. [Timestamped responses and SHA-256s](assets/2026-09-12-species-groups/order-parents.json), retrieved 15:48:26–27 UTC. No catalogue-wide requests, enrichment or paid run occurred.

Fungal subdivisions remain deferred. 704 fungi have sparse optional facts, nine missing families and one missing class; a fungal class is not evidence of lichenization.

## Regional usefulness

Samples are purposive, not statistically representative: smallest/largest sets, two city states, North Sea coast, Alpine region, and two already exercised release regions. All **362 rows**, including every candidate count, are in [the regional CSV](assets/2026-09-12-species-groups/measurements.regions.csv). National union counts must not be obtained by summing regional rows.

| Region | All | Plants | Insect tile | Fungi | Birds | Mammals | Fish tile | Amphibians | Reptiles |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Nordfriesland | 881 | 239 | 335 | 167 | 105 | 8 | 20 | 4 | 3 |
| Hamburg, Freie und Hansestadt | 1126 | 432 | 519 | 77 | 71 | 11 | 6 | 6 | 4 |
| Lüneburg | 1460 | 302 | 886 | 154 | 84 | 14 | 7 | 8 | 5 |
| Mainz-Bingen | 926 | 388 | 427 | 23 | 68 | 8 | 0 | 7 | 5 |
| Südwestpfalz | 625 | 201 | 318 | 36 | 50 | 11 | 2 | 4 | 3 |
| Garmisch-Partenkirchen | 1200 | 504 | 578 | 18 | 76 | 7 | 7 | 5 | 5 |
| Berlin, Stadt | 1450 | 423 | 728 | 192 | 70 | 11 | 16 | 5 | 5 |
| Sonneberg | 149 | 24 | 65 | 6 | 46 | 1 | 3 | 2 | 2 |

| Region | Grass families | Fern class | Moss/liverwort | Lifeform fact | True insects | Arachnids | Molluscs | Crustacean candidates | Remaining invertebrates |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Nordfriesland | 15 | 2 | 12 | 162 | 260 | 8 | 39 | 13 | 15 |
| Hamburg, Freie und Hansestadt | 16 | 9 | 5 | 274 | 480 | 15 | 16 | 7 | 1 |
| Lüneburg | 12 | 6 | 24 | 206 | 854 | 13 | 12 | 6 | 1 |
| Mainz-Bingen | 13 | 3 | 1 | 353 | 390 | 22 | 12 | 2 | 1 |
| Südwestpfalz | 2 | 12 | 2 | 172 | 309 | 6 | 3 | 0 | 0 |
| Garmisch-Partenkirchen | 56 | 23 | 18 | 182 | 558 | 14 | 6 | 0 | 0 |
| Berlin, Stadt | 18 | 5 | 17 | 270 | 636 | 51 | 15 | 9 | 17 |
| Sonneberg | 0 | 1 | 0 | 17 | 63 | 1 | 1 | 0 | 0 |

These counts favor immediately available insects and plant groups, with additional invertebrate detail in one expandable row. Nordfriesland's 39 molluscs/13 crustacean candidates and Berlin's 51 arachnids make the accurate choices useful; Südwestpfalz has no crustacean candidates, and Sonneberg has no grass-family records. Keep selected zero groups visible across region changes. This is a proposed UX inference from the measured sample, not owner approval.

## Source options and remaining effort

Primary documentation checked on 12 September 2026; source-wide sizes are not catalogue-coverage promises.

| Option | Usable evidence / limitations | Work before any population |
| --- | --- | --- |
| Retained Backbone | Source-qualified family/class/order IDs already cover useful taxonomic splits; CC BY 4.0 | Version exact anchor definitions, audit awkward samples, resolve missing intermediate ancestry only where necessary |
| GIFT | Public [API](https://biogeomacro.github.io/GIFT/articles/web_only/GIFT_API.html) exposes versions, trait metadata, names matching, raw traits and references; [raw-trait contract](https://biogeomacro.github.io/GIFT/reference/GIFT_traits_raw.html) retains match/derivation/bias provenance. Shipped trait `2.3.1` is Raunkiaer lifeform. Public API access is not a blanket redistribution licence | Inspect retained arrays first (done); verify version, complete pagination, actual growth-form trait IDs and terms; obtain explicit identity crosswalk and bibliography. Reconcile ambiguity rather than selecting first name match |
| TRY | [Version 7](https://www.try-db.org/TryWeb/Home.php), released 2026-09-04, advertises GBIF-harmonized taxonomy and GIFT-derived tree/shrub/herb data | [Registration/request process](https://www.try-db.org/TryWeb/Prop0.php) and [IPG](https://www.try-db.org/TryWeb/TRY_Intellectual_Property_Guidelines.pdf): public versus restricted records differ; retain original dataset citations, permissions and exact GBIF namespace. Request delays are currently advertised; no account/request submitted |
| FloraWeb / BIOLFLOR | FloraWeb now has a [nomenclature/taxonomy API](https://www.floraweb.de/ueberfloraweb/api.html), not a verified traits API: [name usage](https://www.floraweb.de/api-taxon/namebyid.html), [taxon](https://www.floraweb.de/api-taxon/taxonbyid.html). [Lifeform sources](https://www.floraweb.de/uebersicht/datenquellen.html) include BIOLFLOR. [UFZ says migration completed](https://www.ufz.de/index.php?de=38567), with a new registered prototype | Verify export/access and identifier alignment; [FloraWeb default rights](https://www.floraweb.de/impressum.html) are reserved unless explicitly licensed. Prototype endpoint was not retrievable in this audit. Do not repeat historical claims that BIOLFLOR is simply offline or that FloraWeb has no API |
| Wikidata | CC0 [structured data](https://www.wikidata.org/wiki/Wikidata:Licensing); 547 retained plant QIDs, with name paths 505 P846 and 42 name-based; 1,518 null paths and 4 `none` | Exact referenced statement/revision audit only. [P846](https://www.wikidata.org/wiki/Property:P846) now explicitly denotes the pre-2026 GBIF ID; [P14607](https://www.wikidata.org/wiki/Property:P14607) is the new taxon ID. A QID/name/label or unreferenced model claim does not establish growth form |
| COL XR / ChecklistBank | Different checklist `7ddf754f-d193-4cc9-b351-99906754a03b`; [published crosswalk contract](https://download.checklistbank.org/col/gbif/README.html) is specifically COL 26.5 XR (May 2026), with usage/accepted IDs. [GBIF migration guide](https://data-blog.gbif.org/post/catalogue-of-life-taxonomic-backbone/) supports legacy scientificNameID matching | Optional future crosswalk only; retain both dataset releases, usages, accepted usages and diagnostics, verify export licence. Never replace existing accepted identities or mix integer namespaces silently |

The next acquisition unit is a **bounded, reviewed identity/trait sample**, not 362 regional enrichments. Include a woody climber, dwarf shrub, ambiguous habit, grass/sedge/rush, aquatic fern, clubmoss, liverwort, alga, hybrid and conflict/missing case. Select exact admitted keys from the measured union only once evidence establishes the sample trait; names are search aids, never classification evidence. Review bibliography and rights, then estimate deduplicated requests and cost from that pilot. No fixed budget, source coverage guarantee or catalogue-wide paid/API run is authorized.

## Reproduction, limits and handoff

[audit.py](assets/2026-09-12-species-groups/audit.py) queries only catalogue, taxonomy, region, taxon and reviewed-gallery metadata inside one repeatable-read **READ ONLY** transaction. It refuses database names outside `dex_check_*`, verifies the union hash, 362-set union and membership count, all 34,739 taxonomy fingerprints, accepted terminal consistency and zero duplicate regional keys. It writes only local aggregate JSON/CSV. Run against a **fresh owned local restore** of the archive above:

```sh
python3 docs/records/assets/2026-09-12-species-groups/audit.py /tmp/species-groups-measurements.json \
  --container atlas-germany-rehearsal-pg18-20260911 \
  --database dex_check_epic93_audit_20260912
```

The executable is an audit artifact, not a production classifier or new importer. It reports candidate intersections and source fields without populating classifications. The archive hash and release's independent production equality proof establish the population; this audit does not reproduce all 34 table comparisons or publish personal rows. Restored personal tables were not queried. Raw temporary exports and release archive stay outside Git. Supplementary cache and bounded provider evidence remain separately qualified.

The active worktree is `/Users/svenreiser/Documents/Develop/standkreis/atlas-worktrees/issue93-species-groups-audit`; preserve it and the dedicated database during cleanup #111–#117. Cross-session messaging is unavailable; the owner was notified early and again when confirming concurrent cleanup. Only new package-specific document paths are edited; no cleanup implementation or operational document is rewritten. Check current main before integrating; code analysis here remains pinned even if cleanup later changes behavior.

Checks for this documentation package: successful fresh restore; deterministic repeat of the aggregate generator; aggregate arithmetic and source-field checks; local document links and whitespace diff checks; independent review against #120. No application build/browser run is claimed or needed for new documentation and a read-only evidence script. B must label wireframes as proposed states, never as tested UI. Later C–F need their own implementation gates.

**Unresolved before implementation:** growth-form source/licence/crosswalk and conflict policy; exact plant boundaries; crustacean and fish/lamprey rules; hierarchy depth and wording; contextual count and persistence decisions; stale metadata presentation. Preserve all admission rules, accepted identities, galleries, personal data and progress definitions. Parent #93 remains open.

Attribution: Codex primary agent; independent source research and bounded provider probe by `source_options`; shipped-UI and retained-GIFT review by `ux_baseline`. Findings are measured or explicitly proposed; no owner UX approval is asserted.
