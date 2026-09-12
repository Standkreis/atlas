# Species groups B — browsing contract and UX proposal

**Proposal for review, 12 September 2026. Not owner-approved and not implemented.** [#121](https://github.com/Standkreis/atlas/issues/121), child of [Epic #93](https://github.com/Standkreis/atlas/issues/93), follows [package A #120](https://github.com/Standkreis/atlas/issues/120). This document records proposed decisions and review cases, not successful UI tests or permission to start C–F.

[The measured audit](https://github.com/Standkreis/atlas/blob/429e491b94198b7350aca1a0acc3b59d7fdab354/docs/records/2026-09-12-species-groups-audit.md) binds the release code, exact restored catalogue, all 362 regional sets and source evidence. The proposal preserves **6,874 accepted taxa**, catalogue `germany-2016-2026-taxonomy-v2-20260909`, registry `de-krg-2024-12-31`, accepted-union SHA-256 `6ede6e5b059fa0d3d5edc0e883654a1c7ecb2df08abae129c32c9953e25ae38e`. A browse definition is an additional navigation layer. It cannot change the tile enum, floor/90% cut, observation years, accepted identities, memberships, galleries, personal records or progress rules.

## Proposed decisions requiring owner review

| Decision | Recommendation | Evidence / unresolved condition |
| --- | --- | --- |
| Plant navigation | One expandable level under **Alle Pflanzen / All plants**, with woody/herbaceous shortcuts only once evidence is reviewed | Taxonomic anchors cover 227 grass-family,43 fern-class,95 moss/liverwort taxa. 1,685 other plants lack reviewed growth-form membership; 496 Raunkiaer facts cannot fill that gap |
| Invertebrate depth | Keep **Insekten / Insects** directly available beside the broad **Wirbellose / Invertebrates** control; one disclosure reveals arachnids, molluscs, candidate crustaceans and fallback rows | Insects dominate every sampled region; coast/city counts justify the other choices without imposing an extra tap for insects |
| Insect detail | Optional disclosure for butterflies & moths, beetles and dragonflies; preserve all-insects and other/unknown routes | National counts 1,216/578/74. Do not expose every scientific order in the first delivery |
| Wording | **Artengruppe / Species group**; **Nach Artengruppe / By species group** | This proposes superseding the earlier explicit owner wording choice, not correcting a typo. Preserve [historical wording evidence](https://github.com/Standkreis/atlas/blob/fae0c81e797f2acaf1aa0a3392166d753208aa20/docs/handoffs/0025-doubt-sweep.md#-abnahme) |
| Ambiguity | Keep proven memberships; retain unresolved axes separately; distinguish known residual from insufficient evidence | Do not claim herbs as the complement of woody plants or fish as the complement of familiar vertebrates |
| Counts | Contextual distinct in-set counts after search/state/month, before all category choices | This deliberately replaces today's whole-year chip counts. Regional progress remains whole-year broad-interest progress; Germany stays 6,874 |
| Detailed state | Versioned URL refinements; explicit all/subset/none; current replace-history convention | Broad interests remain identity preferences. Saved finds have unconditional feedback and explicit reveal |
| Offline failure | Preserve the user's detailed intent and show unavailable metadata, with explicit broad-view recovery | Missing classification is not zero biological matches; packs remain explicit whole-region, position-zero-lead-only |

Owner decisions still needed: accept or amend these recommendations; choose the growth-form source/rights and conflict policy; resolve the candidate crustacean rule, fish/lamprey evidence, and plant label boundaries before population. Acceptance of this documentation as a proposal does not approve the UX or authorize implementation.

## Measured shipped behavior

At the audited code, `dex.set` returns the full regional year set once, including tile/names/seasonal values/lead image, but no ranks, facts, tags or group memberships. Atlas filters locally. Stored empty `tiles` means all eight broad interests; the UI guards the last selected broad tile. Broad interests persist with identity. URL state covers search, state, month, sort and grouping, using `replaceState`: returning from species restores the list; Back does not undo every filter tap.

Tile chip counts are currently whole-year regional counts before narrowing. Header progress is whole-year selected-broad-interest progress. Grouping defaults to exploration state, with discovered ahead of studied; sort/search ranking stays as shipped. Outside-set personal finds trail regional results and do not enter denominators. Saving currently enables its broad tile and shows success even if other filters hide the card. These constraints are traced in `AtlasGrid.tsx`, `AtlasCounters.tsx`, `FilterDrawer.tsx`, `server/routers/dex.ts` and `server/germanyProgress.ts` at the [audit code](https://github.com/Standkreis/atlas/tree/fae0c81e797f2acaf1aa0a3392166d753208aa20/app/src).

Phone and desktop currently share a centered Atlas capped at 520 px and a modal bottom sheet. The grid has two columns below 480 px and three thereafter. Retain that composition for this first change; widening/rebuilding the desktop shell is a separate proposal. Existing modal focus trap, inert background, Escape, opener restoration and 44 px minimum touch targets remain required.

## Bilingual hierarchy and stable identifiers

IDs below are proposed permanent navigation IDs, never translated strings or taxonomic ranks. Exact numeric source anchors and counts live in A. Source-qualified identities use provider=`gbif`, dataset=`d7dddbf4-2cf0-4f39-9b2a-bb099caae36c`, accepted usage key, catalogue ID. Different datasets—including COL XR—need explicit reviewed crosswalks, even if a number or name looks identical.

Broad controls keep these persisted values and full memberships. Proposed visible labels:

| Persisted interest | German | English | Meaning |
| --- | --- | --- | --- |
| `bird` | Vögel | Birds | Existing entire bird tile |
| `mammal` | Säugetiere | Mammals | Existing entire mammal tile |
| `amphibian` | Amphibien | Amphibians | Existing entire amphibian tile |
| `reptile` | Reptilien | Reptiles | Existing entire reptile tile |
| `fish` | Fische & weitere Chordatiere | Fish & other chordates | Explicit legacy 58-record catch-all; helper explains that some records are not fish or lack detailed evidence |
| `insect` | Wirbellose | Invertebrates | Existing 3,660-record non-chordate animal bucket; detailed Insekten is a separate choice |
| `plant` | Pflanzen | Plants | Every current plant, including hybrids and algal-phyla records |
| `fungus` | Pilze | Fungi | Every current fungus; no inferred lichen split |

The fish label is accurate but technical. **Open wording decision:** whether a simpler “Fische & weitere Tiere / Fish & other animals” with the same scope explanation is clearer. Do not adopt the simpler label silently or describe all 58 as vertebrates. Onboarding/Profile show only these broad choices and do not require opening any hierarchy.

| Proposed detail ID | German / English | Membership contract and fallback |
| --- | --- | --- |
| `plant.woody` | Gehölze / Woody plants | Explicit, reviewed tree, shrub, dwarf-shrub or woody-climber evidence; woody climbers remain climbers, not trees. Facultative habit needs a supported context/qualifier. No automatic mapping from phanerophyte/chamaephyte or taxonomic class |
| `plant.herbaceous` | Kräuter & Wildblumen / Herbs & wildflowers | Explicit nonwoody/herbaceous vascular-plant evidence; exclude the grass-family, fern/horsetail and clubmoss shortcuts from this everyday shortcut. “Wildflowers” is a browse phrase, not evidence of wild status, showy flowers, nativeness or admission |
| `plant.graminoid` | Gräser, Seggen & Binsen / Grasses, sedges & rushes | Exactly reviewed Backbone families Poaceae3073, Cyperaceae7708, Juncaceae5353; not all monocots or Poales |
| `plant.fern` | Farne & Schachtelhalme / Ferns & horsetails | Backbone Polypodiopsida7228684, including Equisetales954; aquatic ferns and hybrid identities included |
| `plant.bryophyte` | Moose & Lebermoose / Mosses & liverworts | Backbone phyla Bryophyta35 and Marchantiophyta9. This first definition does **not** claim hornwort coverage; adding hornworts is an explicit keyed version change. UI help spells out scope |
| `plant.other` | Weitere Pflanzen / Other plants | Positive known residuals after reviewed rules: currently six Lycopodiopsida245 and 13 Charophyta/Chlorophyta records. Remain accessible under all plants; future evidence can support a separately approved shortcut |
| `plant.unknown` | Pflanzengruppe noch unklar / Plant group not yet resolved | Remaining plants whose relevant growth-form decision lacks sufficient evidence. Current audit leaves 1,685 after its taxonomic partitions; no woody/herbaceous count is promised |
| `animal.insect` | Insekten / Insects | Backbone class Insecta216 only; no springtails, spiders or molluscs |
| `animal.arachnid` | Spinnentiere / Arachnids | Arachnida367, not only Araneae |
| `animal.mollusc` | Weichtiere / Molluscs | Mollusca52 |
| `animal.crustacean` | Krebstiere / Crustaceans | Candidate reviewed union of Malacostraca229, Maxillopoda203, Branchiopoda281, explicitly excluding hexapods. **Not release-ready:** A's ancestry probe did not verify a Crustacea relationship; require authoritative mapping evidence first |
| `animal.other` | Weitere Wirbellose / Other invertebrates | Source-backed remaining non-chordate animals outside approved shortcuts; 82 known residuals conditional on the candidate class union. If that mapping is deferred, keep those82 known residuals and39 unresolved candidates separate, with all121 accessible in the broad view |
| `animal.unknown` | Tiergruppe noch unklar / Animal group not yet resolved | Missing/conflicting evidence for a desired distinction; do not hide here merely because a group is uncommon |
| `insect.lepidoptera` | Schmetterlinge / Butterflies & moths | Order797, with German help “einschließlich Nachtfaltern”; not only day-flying butterflies |
| `insect.coleoptera` | Käfer / Beetles | Order1470 |
| `insect.odonata` | Libellen / Dragonflies & damselflies | Order789 |
| `insect.other` / `.unknown` | Weitere Insekten / Other insects; Insektengruppe noch unklar / Insect group not yet resolved | Remaining supported orders / insufficient order evidence, respectively; all-insects reaches both |
| `chordate.fish` | Fische / Fish | Explicit reviewed source-backed ancestry/order mapping required; 52 missing-class records cannot enter solely via old tile. Whether this everyday shortcut includes the two Petromyzonti is an owner/definition decision |
| `chordate.other` | Weitere Chordatiere / Other chordates | Confirmed non-fish chordates such as the Ascidiacea record; lampreys here only if deliberately excluded from the fish definition, with clear help |
| `chordate.unknown` | Genauere Gruppe noch unklar / More specific group not yet resolved | Includes the 52 missing-class records until additional source evidence or a reviewed order mapping resolves them |

Every parent also has explicit **Alle … / All …**. A disabled/unavailable future woody or crustacean option is never rendered with count 0. Before release, either satisfy its rule gate or remove the unavailable control with the unresolved coverage honestly explained; choosing that reduced initial scope requires owner review. No hidden automatic enrichment runs when a parent opens.

### Evidence, overlap and one primary bucket

A future immutable definition bundle needs `definitionVersion`, stable group ID, EN/DE labels/help, parent IDs, source-qualified anchor definitions, overlap/exclusion rules and display order. A membership bundle binds **catalogue ID + union fingerprint + definition version + membership version**. Each accepted taxon has explicit positive memberships, a primary display bucket, and axis outcomes `classified`, `unclassified`, `conflict` or `failed`, with reason codes. Retain provider/dataset/release, source usage and accepted usage, crosswalk evidence, source URLs, retrieval time, raw-response hash, licences, bibliography/claim/revision IDs and reviewer/rule version as applicable. This is a logical contract, not an approved schema.

“Processed all 6,874” must report how many were classified, unknown, conflicted and failed per axis. A failure cannot be converted into biological nonmembership. A record can have a proven taxonomic shortcut and an unresolved growth-form axis; it stays selectable by that proven shortcut and the relevant “not yet resolved” diagnostic view. Unknown is epistemic; residual means evidence establishes it falls outside the included shortcuts.

Plant grass/fern/bryophyte/known-residual partitions are disjoint in A. Future woody membership may overlap a taxonomic shortcut if explicit evidence supports both. Herbaceous browsing deliberately excludes grass/fern/clubmoss records for useful navigation; this does not deny that they can be biologically herbaceous. Accept multiple habits only when supported as genuine variation; mutually inconsistent sources without an accepted context become `conflict`, not two asserted memberships.

For **Nach Artengruppe**, proposed primary priority is grass-family → fern/horsetail → moss/liverwort → known other plants → woody → herbaceous → unresolved. Animal primary buckets follow the hierarchy above; detailed insect groups live under insects. Known membership wins display priority over an unresolved secondary axis. When a selected unknown view returns such a record, it remains under its primary bucket with an “also unresolved” marker. Bucket assignment never depends on which shortcut was selected. OR selection and counts deduplicate by the unchanged accepted Taxon ID. This priority is reviewable and versioned; it must not hide a conflict or inflate totals.

## Selection and counts

Let `R` be the exact active regional catalogue. Let `N` be members of R matching the existing search, exploration-state and current-month predicates. Broad interests remain a separate set `B` of the eight legacy values. Every enabled broad parent has a detailed state **all**, **subset(stable IDs)** or **none**. The category selection set `C` is the distinct union of those enabled branches; a parent-all expands to every member of its broad tile, including all descendants, residuals and unknowns. Results are `N ∩ C`. A nested all-insects selection is a union over Insecta only, not the old entire insect tile.

- Clicking a child under an inactive broad parent enables that parent and selects that child subset. Clicking mixed parent selection chooses all; clicking an all-selected broad parent removes it, except the last-broad-interest guard. Removing a parent discards its detailed refinement; re-enabling begins at all.
- The disclosure button expands controls without selecting anything. Its hit target is separate from the checkbox. A partial selection is visually and accessibly indeterminate even when all named children are checked but residual/unknown records are excluded.
- **Auswahl leeren / Clear selection** inside a parent sets detailed `none`; the broad interest stays on, with a clear empty-selection marker. Toggling off the last detailed child also yields none. This may produce zero results and does not violate the last-broad-interest guard.
- **Alle Pflanzen / All plants** restores only that branch to all. Global **Zurücksetzen / Reset** restores all broad interests, removes details/search/month/state and restores current default sort/group, keeping the region. Empty legacy `tiles` continues to mean all; it is never the encoding of detailed none.
- Category counts are `|N ∩ group|`, **before every category choice, including broad interests**. Thus an unselected bird parent can still show a count, letting the user widen knowingly. Parent counts are distinct unions, not sums of overlapping child counts. A selected 0 remains visible; a known empty group differs from unavailable metadata.
- Show a separate **N Arten im regionalen Atlas / N species in this regional atlas** result count. The drawer action names this regional result count. Outside-set finds have their own **+ M eigene Funde außerhalb dieses Atlas / + M personal finds outside this atlas** line. They never enter category counts or regional/national denominators.
- Grouping and sort change order only, preserve shipped search ranking, and omit empty sections. Progress grouping remains the default. One species renders once in its primary section, even if it matched multiple shortcuts.
- The active-filter badge counts one category-narrowing domain (broad or detailed, including none), one exploration-state domain and one current-month domain. Search remains visible in the input and keeps its existing badge exclusion; sort/group do not add badge counts.

**Concrete audit-bound example:** Mainz-Bingen has 388 plants, 13 grass-family and 3 fern/horsetail records. With only plant broad interest and those two details, no search/state/month restriction, the proposal shows **16 regional results**, parent count **388**, and unchanged regional progress denominator **388**. Germany remains **6,874**. Selecting moss/liverwort adds its one distinct taxon →17. Selecting all plants restores388. Counts after month/search/state must be measured from their predicates, not invented from these whole-year numbers.

An abstract overlap test uses two accepted IDs with memberships `{woody, graminoid}` and `{woody}`. Choosing either/both yields1/2/2 distinct results, never3; parent count2. This is a test fixture for algebra, not a claim about any shipped species' biology.

## Persistence, older clients and saved finds

| Event | Proposed observable behavior |
| --- | --- |
| New/default URL | Detailed state absent means all within selected broad interests; existing q/show/now/sort/group semantics remain |
| Detailed URL encoding | Add `bgv=1` and `bg.<parent>=all`, `none` or a sorted comma-separated stable-ID subset; omit default all. Exact serialization can change during D review, but absence/all/none meanings cannot |
| Reload, species return, Back | Restore details and existing origin/scroll; use current replaceState convention for filter taps. Back from species restores prior list; no promise of per-tap undo |
| Locale change | Stable IDs persist; only labels/search presentation localize. A label edit does not silently retire an ID |
| Region switch | Keep broad interests and detailed IDs. Recompute counts for the new region; honest 0 is allowed. Do not auto-broaden because a region lacks that group |
| Unknown/retired ID | Use only an explicit semantics-equivalent alias migration. Otherwise retain unavailable-selection feedback and require explicit clear-details/all-parent action; do not silently broaden or claim 0 biological matches |
| Wrong metadata version | Preserve pending selection and show that detailed groups cannot be evaluated. Never interpret unsupported IDs against a different bundle. Broad recovery requires a user action |
| Incoming URL for disabled broad parent | URL details are dormant under identity broad interests; show a compact “selection outside your interests” notice with enable-parent action. Do not mutate identity on page load |
| Older-client preference write | Still changes only broad interests. New client drops details for removed parents on the next identity snapshot; unchanged parents retain URL refinements. Old `insect` always means the entire original bucket, not only Insecta |
| Privacy/export/delete | Details are URL state, not new personal records. Existing personal exports/deletion and queued work retain semantics. Do not add classification metadata to a user export by accident |

After every successful saved find, feedback remains unconditional. Preserve existing broad auto-enable behavior for its tile; a detailed conflict does not guess membership or silently rewrite the user's refinement. Show **Gespeichert – durch Filter ausgeblendet / Saved – hidden by filters** with **Fund ansehen / View find** (direct detail route) and **Im Atlas zeigen / Show in atlas**. The latter explicitly enables its broad parent, sets that parent's detail to all and clears conflicting search/state/month, then scrolls to the card. Announce that filters were widened; leave unrelated parent details alone. A failed save must never show this success state.

Outside-set wild finds retain the separate trailing section and existing current-month/not-yet-discovered suppression. If source-qualified details are absent, broad/all can reach them; a detailed selection does not assert their subgroup. Show a route to all personal finds/direct detail when they are omitted by detail. After “Show in atlas,” an outside-set find stays in that section; it never gains catalogue membership. Queued/offline saves retain their current ownership and success/queue feedback; classification is not required to log, identify or reveal a find.

## Progress, other surfaces and compatibility

Regional Atlas and Profile progress remain **whole-year regional membership scoped to selected broad interests**. Detailed shortcuts/search/month/state do not shrink that denominator. Label the detailed result count separately; do not present a filtered completion percentage. National collection measures use the full active German union independent of broad/detail selection. Sightings/studies and the separate valid-wild-coordinate territory measures retain the Germany ADR's rules.

Update wording coherently across FilterDrawer, Atlas group headings and card group affordances, onboarding, Profile interest/progress labels and species group display when implementation is approved. Cards keep their existing accepted taxon identity, lead/silhouette and gallery behavior. Detailed browse labels must not change Steckbrief templates or overwrite facts/tags. The current species “Gruppe” cell can be absent when the whole optional facts block is absent; a future reliable browse group display should be independent of optional prose/facts and include a truthful unresolved state. It is curated navigation, not a full scientific classification browser.

No changes to admissions, outside-set behavior, galleries, study/seen meanings, personal record identity, logging/identification, upload/queue quotas, export/delete or source licences are implied. A future “Verwandtschaft ansehen” link requires its own dataset/accepted-ID contract; there is no taxonomy-explorer integration in this package.

## Offline metadata and version transitions

Filtering uses downloaded regional taxa plus a compatible downloaded group bundle, with no live taxonomy or trait calls. Group definitions/memberships version independently of catalogue membership; category payloads are staged and validated as a whole before activation. A regional read cannot adopt a new catalogue version: retain the current identity-handshake authority and existing catalogue cache invalidation.

| Offline/cache state | Required presentation and recovery |
| --- | --- |
| Compatible catalogue + group bundle | All detail filters/counts/grouping work locally, including residual/unknown; show the same counts as online for the same personal state |
| Compatible old pack, no group metadata | Images may remain ready. Show **Detaillierte Gruppen offline nicht verfügbar / Detailed groups unavailable offline**. Preserve pending URL details; offer explicit broad view. No subgroup count0 |
| Group version changes, catalogue unchanged | Stage new compatible metadata and replace atomically; keep unchanged image cache bytes. Re-evaluate active IDs with the reviewed migration rule; no silent narrowing/widening |
| Partial/corrupt/failed metadata download | Keep last validated compatible version or unavailable state; never mix partial memberships into complete counts |
| Incompatible catalogue | Existing authoritative catalogue invalidation applies. Do not attach old memberships to a new accepted union |
| Offline region switch | Existing cached full regional set still required. If available but detail metadata absent, show the unavailable state; do not fetch or guess |

Packs stay explicit, **whole-region**, and **position-zero eligible lead only**, deduplicated by existing image identity. Changing filters neither starts a download, resizes a pack, nor fetches extra gallery images. Distinguish image-pack readiness from group-metadata readiness; an image-ready old pack is not proof of available detail classification. Downloads require the existing explicit action. On reconnection, compatible metadata refresh may follow the ordinary online query policy; it must not silently override an unresolved selection or trigger image downloads.

## Representative interaction storyboards

These are static review sketches and future acceptance cases, **not screenshots of an implementation or owner-approved designs**. Whole-year numbers below come from A; no personal progress values are fabricated.

**390 px phone, German, Mainz-Bingen.** Plant is the sole broad interest; choosing grass and fern creates a mixed parent. Other broad controls remain immediately available above. Labels wrap inside the sheet; footer stays reachable above the safe area.

```text
Artengruppe                              ×
[−] Pflanzen                  388       ▴
    Alle Pflanzen
    [✓] Gräser, Seggen & Binsen          13
    [✓] Farne & Schachtelhalme            3
    [ ] Moose & Lebermoose               1
    [ ] Weitere Pflanzen                 0
    [ ] Pflanzengruppe noch unklar      371
    Auswahl leeren

    Gehölze / Kräuter & Wildblumen:
    erst nach geprüfter Definition verfügbar

16 Arten im regionalen Atlas
[16 Arten anzeigen]     [Zurücksetzen]
```

The two-line availability annotation is for reviewers, not proposed product copy. At implementation review choose either evidence-ready controls or the explicitly reduced approved scope. The 371 count assumes A's current taxonomic partition and no growth-form population; later evidence changes it under a new membership version.

**1280/1440 px desktop, English.** Keep the centered520 px Atlas; the same keyboard-accessible modal opens over it. With Berlin and only the Insecta detail selected, whole-year regional result count636; broad invertebrate progress denominator728. An optional insect disclosure contains butterflies & moths214, beetles135, dragonflies & damselflies25 and remaining other insects262. Subset selection can narrow these, while the all-insects parent remains reachable without visiting every child. Tab reaches separate disclosure/checkbox targets; Space toggles; Escape closes and restores the opener.

| Review state | Visible behavior and future assertion |
| --- | --- |
| 320/390 px, EN and DE | No horizontal scroll or clipped long labels; at least44 px targets; count stays associated with label; modal content scrolls with a reachable sticky result action |
| All → grass-only → grass+fern → none → all | Mixed parent and explicit none differ; last broad guard survives; Mainz results13→16→0→388, parent count388 |
| Overlap + search/state/current-month | Each accepted row once, contextual category union counts; no changed regional/national progress denominator |
| Sonneberg, grass-only | Preserve selected grass ID with count0 and a helpful all-plants action; region remains Sonneberg and plant progress denominator24 |
| Nordfriesland animals | Coast molluscs39 and candidate crustaceans13 are reachable if that rule is approved; ascidian has an honest residual home, no fish-only claim |
| Unknown + imageless + hybrid | Broad/all always reaches each admitted record; no name truncation, guessed membership or required image/fact gate |
| Grouping change | No result loss; same taxon once in deterministic primary bucket; discovered/studied state badges and sort preserved |
| Saved find hidden by detail | Successful save remains visible; direct route and explicit widening reveal work for in-set/outside-set/queued finds |
| Reload/species Back/locale/region | Restore stable IDs and origin scroll; selected zero remains; filter taps use replace-history; no identity mutation from a URL alone |
| Old client and retired ID | Legacy broad meaning preserved; invalid/retired distinction displayed with explicit recovery |
| Offline compatible/no-metadata/stale/partial | Cached correct filtering or unavailable message, never fabricated0; image-pack scope/bytes unchanged |
| Keyboard/screen reader | Proper named checkbox groups, mixed state, aria-expanded disclosures, existing radio arrow behavior, modal focus trap/Escape/restoration; updates announced politely and coalesced rather than every keystroke |

## Exit evidence before implementation and delivery

This package is reviewable when the above choices, omissions and decision owners are explicit. It is **not** the implementation acceptance pass. After owner contract review, C should first demonstrate source-qualified awkward-sample memberships, provenance/rights, conflicts and complete outcome reporting on the frozen union. D can then settle additive metadata payload/storage/URL validation and version contracts. No additive migration or catalogue-wide acquisition is approved here.

Later C–F must verify: unchanged accepted-key union and per-region membership fingerprints; full catalogue reachability including six hybrids and424 imageless taxa; unchanged gallery receipts/lead order and personal record semantics; distinct selection/count/group algebra; explicit none/invalid ID/saved-find/old-client behavior; all eight representative regions; EN/DE320/390/1280/1440 px keyboard/touch states; compatible/old/partial offline packs. Applicable `npm run check`, builds, DB integration and production-server browser/SW gates follow `app/AGENTS.md`. Measure query count and payload, filter response time and offline bytes against the shipped full-catalogue baseline before setting performance acceptance targets. No invented timing/bandwidth target or pass claim is made now.

The observed release reference is Sonneberg's149-taxon pack with147 eligible leads /4,507,756 bytes, not an invariant for future CDN bytes. A group bundle must be measured separately; filters must add no taxonomy requests or image downloads. A later release needs preservation diffs, reviewed data transfer and production readback separate from merge, followed by a lasting decision record before closing #93.

This branch starts from remote main `c896690` after cleanup #113, #115, #116 and #117 integrated. Those changes touch plant wildness correction, regional ETL guards, workflow checks and operational guidance; they do not implement group browsing. This documentation is isolated from cleanup #111–#117. Integration review must inspect current main and any changed filter/progress/cache contracts before coding; historical pinned measurements remain valid for their release. No existing glossary/ADR or cleanup document is rewritten as if these proposals were accepted.

Attribution: Codex primary agent, using independent measured-source work by `source_options` and shipped-UI/cache research by `ux_baseline`. Owner approval: **pending**. Parent epic and implementation packages: **open/unstarted**.
