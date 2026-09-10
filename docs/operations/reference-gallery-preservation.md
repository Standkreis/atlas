# Reference gallery preservation and review

Issue [#61](https://github.com/Standkreis/atlas/issues/61) establishes the data contract for a
future reviewed target import. This change creates no production review rows and transforms no
production gallery. Source enrichment (`TaxonEnrichmentWork`) remains distinct from target merge
approval (`ReferenceGalleryReceipt`).

## Preservation rule

The target planner takes the complete current target Asset rows, incoming reference rows and one
explicit review per in-scope reference. It never deletes or reassigns an Asset or Taxon. Personal
photos, avatars and sounds pass through untouched. Reference rows rejected for rights, subject,
duplicates or the 12-image cap also remain stored; `ReferenceAssetVisibility` records why they are
hidden.

Eligible existing references precede incoming references in stable `position`, `createdAt`, `id`
order. Therefore a valid old lead remains first. Eligible incoming references append until the
gallery has 12 entries. Normalized rendered URLs and source pages are deduplicated. An empty
incoming gallery cannot erase an existing gallery. Target positions are an overlay and consecutive
from zero; the source Asset's original position remains part of its retained before-image.

Every review binds the original Asset metadata fingerprint and its own evidence fingerprint.
Eligible rows require reviewed supported-licence and subject evidence. Provider metadata alone is
not proof of the original grant: absent or unverified rights are retained hidden as
`unverified-rights`. Global taxon images with imported or unknown origins are in scope too; an
unsupported origin cannot evade review and can only remain hidden. A licence URL overlay is allowed
only when it validates against the unchanged licence family and version. It never rewrites the
original `Asset.licenceUrl`.

The known Thalpophila matura reference under GBIF 5110213 has a custom attribution grant. It is not
called unlicensed; it remains hidden as
`custom-attribution-grant-outside-supported-policy`. The known iNaturalist photo 202516664 stored
under Glis glis 5706486 is retained on that original row but hidden as
`confirmed-subject-conflict`; evidence identifying Chelidonium majus 5334186 does not authorize a
photo-ID-driven taxon merge or reassignment. The source page and rendered image URL remain distinct
evidence fields.

The separately approved source-v7 scientific exclusions (three cross-taxon photos plus the earlier
Red bartsia identity) govern new-gallery selection. They do not authorize deleting similarly named
production references; those rows still require this target review.

## Receipt and cutover boundary

`ReferenceGalleryReceipt` is keyed by catalogue and target taxon. It stores and fingerprints:

- the complete ordered reference before-images and per-asset reviews;
- target-level review evidence;
- the retained IDs, hidden reasons and effective ordered gallery, including licence URL overlays.

Receipt verification reruns the deterministic planner. Any changed Asset metadata, review evidence,
target order, corrected URL or receipt field fails closed. The future #63 importer must write all
new Asset rows, one visibility row for every target reference, and the matching receipt in one
transaction after re-verification. It must not write a partial reviewed set. #62 may use the
`referenceVisibility` relation for client compatibility and its distributed write gate, but it does
not weaken this receipt.

Before that atomic cutover, a gallery with no visibility rows uses the legacy metadata validity,
ordering and cap. Once any visibility row exists, public detail, lead and offline-pack reads expose
only explicitly eligible rows at reviewed target positions. Missing rows then fail closed. This
mixed-state behavior is a guard, not a supported partial-import mode.

The migration is additive: two initially empty evidence tables and no Asset, Taxon, personal or
sound updates. Applying it is not the reviewed target import.
