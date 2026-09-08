# Handoff · Multiple reference images per species

Issue: [#6 · Add curated multi-image galleries to species pages](https://github.com/Standkreis/atlas/issues/6)

Owner decision, 2026-09-08: a species may have several externally hosted reference images. Keep at most **12** per taxon so that the gallery remains useful rather than overwhelming. Every image keeps its own source, author and licence. Atlas continues to store only metadata and remote URLs for reference images; it must not mirror their bytes. The species detail hero becomes the gallery. Places that need one thumbnail continue to use the first image.

## Start with the actual current shape

There is no scalar `Taxon.image` field to convert into JSON or an array column. The normalized model is already the right one:

- `Taxon.assets` is a one-to-many relation.
- Each `Asset` already has `url`, `author`, `licence`, `licenceUrl`, `sourceUrl`, `origin` and `caption`.
- `taxon.page` already returns every asset.
- `SpeciesPage` already filters image assets and passes an array to `SpeciesSlider`.
- `SpeciesSlider` already supports swipe/scroll snap, position indicators and attribution for the active image.

The single-image behavior comes primarily from `app/etl/content.ts`: it resolves one `AssetDraft`, deletes the old taxon assets and creates one image. Most read paths then treat the oldest image as the lead by ordering on `createdAt` and taking one.

Do **not** add an image JSON array to `Taxon`. Keep one `Asset` row per image so attribution remains inseparable from the file it describes.

## Product contract

| Concern | Decision |
| --- | --- |
| Gallery size | Zero to **12 reference images per taxon**, hard-capped in ingestion and defensively capped in the species-page response |
| Hosting | Store metadata and the remote URL. The browser continues to fetch reference bytes from iNaturalist or Wikimedia Commons |
| Lead | Position `0`; preserve the current lead ladder so existing cards do not unexpectedly change |
| Single-image surfaces | Atlas grid, onboarding tiles, search results, look-alikes, ecology cards and fill fallback use the lead only |
| Detail surface | The species hero shows all ordered reference images in the existing slider |
| Attribution | The visible image's info control opens that image's author, licence, licence URL and original source page |
| Offline | The regional offline pack continues to cache only each taxon's small lead image. Do not multiply a region pack by 12 in this issue |
| User photos | Unchanged. This work does not alter sighting-photo upload, ownership, privacy, storage or deletion |
| Sounds | Unchanged and never deleted or reordered by an image refresh |
| Empty state | Zero usable images continues to show the taxon's tile silhouette |

`12` applies to taxon-owned reference images (`kind = image`, `origin = inat | commons`), not user photos or sounds.

## Ordered selection

Keep the present quality ladder for position `0`:

1. Licensed iNaturalist default photo.
2. Acceptable Wikimedia Commons P18 file when the default is unavailable or unlicensed.
3. First other licensed iNaturalist curated taxon photo.
4. No asset; the UI uses its existing silhouette.

Then fill the remaining positions, deduplicating before applying the cap:

1. The acceptable Commons P18 candidate, if it is not already the lead.
2. Remaining licensed iNaturalist `taxon_photos` in the source's curated order, excluding the default and anything already selected.
3. Stop at 12.

This deliberately does not turn an unrestricted Commons text search into a taxonomic truth source. The one Commons candidate remains tied to the matched Wikidata species item. More Commons discovery can be proposed later if a strong species-level link and a measured rejection rule are available.

Use the existing `inatLicensed` allow-list and Commons reject rules. A candidate is unusable when it lacks a renderable URL, source page, author/attribution or supported licence metadata. Keep the exact licence of each file; do not assign one taxon-level licence.

Deduplicate at least by stable source identity:

- iNaturalist photo ID / normalized `https://www.inaturalist.org/photos/<id>` source URL;
- Commons description page / normalized `File:` title;
- exact normalized remote URL as a final guard.

Cross-source perceptual duplicate detection is out of scope.

## Database and migration

Add an explicit integer ordering field to `Asset`, for example `position Int @default(0)`, with an index suitable for `taxonId + kind + position`. Existing rows safely become position `0`. Use `position` only as ordering within the relevant asset kind/owner; do not infer chronology from it.

Write a checked-in additive SQL migration and verify it on a disposable local `dex_check_*` database. Follow the repository rule: no `prisma migrate dev`, `prisma db push` or `prisma migrate reset`.

Order every reference-image read by `position ASC`, then `createdAt ASC` and `id ASC` as deterministic tie-breakers. Update all lead selectors in `dex`, `taxon`, `sighting` and `journal`; otherwise different screens can disagree about the lead.

The gallery refresh for one taxon must be atomic:

1. Fetch and validate all candidates before opening the write transaction.
2. Delete only taxon-owned reference **images** for that taxon.
3. Insert the selected list with positions `0..n-1`.
4. Leave sound assets and every user-owned/sighting asset untouched.

The current broad `deleteMany({ taxonId, sightingId: null })` also matches taxon sounds. Narrow it as part of this work. A failed fetch or validation must not erase the last valid gallery.

Do not add a unique constraint that makes nullable ownership relations collide unexpectedly. Enforce contiguous positions in the writer and tests; the read-side cap remains the safety boundary.

## ETL work

Recommended file ownership:

| File | Work |
| --- | --- |
| `app/etl/sources.ts` | Replace `inatNext`'s single result with a function returning the ordered licensed curated photo candidates; make incomplete photo metadata fail closed |
| `app/etl/prune.ts` | Add pure deduplication/capping/order helpers and focused tests |
| `app/etl/content.ts` | Build `AssetDraft[]`, preserve lead semantics, write positions transactionally, and report gallery counts/source coverage rather than one ladder label only |
| `app/etl/cli.ts` | Add a dedicated image refresh/backfill command or an equally isolated mode that does not refetch GloBI, intros or facts |
| `app/etl/README.md` | Document selection, cap, call volume, local verification and the production transfer procedure |

The iNaturalist detail endpoint is already called to obtain `taxon_photos` when the first photo fails. Fetch it once per matched taxon when building a gallery and reuse that response; do not make one request per photo. Continue respecting the existing host gap and disk-backed response cache.

Backfill should be resumable, idempotent and scoped by region, keys and optional limit. It must print at least: taxa examined, galleries changed, total images stored, zero-image taxa, capped taxa, rejected-unlicensed candidates and failures. Run it against the development database first. Production data moves only through the documented reviewed transfer process.

## API and application work

`taxon.page` currently returns a mixed asset list. It may keep that public shape for compatibility, but it must return reference images in explicit position order and no more than 12. Existing sound behavior must remain intact. A clearer split into `images` and `sounds` is acceptable only if persisted-query compatibility is handled and every caller is migrated.

The current slider is the foundation, not a component to replace. Harden it for real galleries:

- Render the lead eagerly; make later slides lazy and asynchronously decoded so opening a species does not immediately transfer twelve medium images.
- Swipe and scroll snap remain the primary mobile interaction.
- Add operable previous/next controls for pointer and keyboard users when more than one image exists.
- Expose the gallery and active position accessibly (`1 of 12` / `1 von 12`) without announcing every scroll pixel.
- Keep the visible image's attribution control attached to that image as the index changes.
- Verify that 12 indicators fit at 360 px. A compact position counter may replace dots if that is clearer at the cap.
- Clamp the index when a cached response is replaced by a shorter gallery.
- Preserve the zero- and one-image layouts without inactive navigation controls.
- Ensure a failed non-lead image does not make the entire hero empty. The user must still be able to move past it; recording/fallback behavior may be local to the slider.

The page's bottom source sheet already enumerates image credits. Confirm it lists all displayed images exactly once and in gallery order.

No application proxy, Blob copy, filesystem copy or background image mirroring belongs in this issue. The service worker may cache a viewed external image normally, and the explicit regional pack continues to include lead thumbnails only.

## Tests and evidence

At minimum, cover:

### Pure/source tests

- Default iNaturalist photo remains position 0.
- Commons becomes lead only when the current ladder would choose it.
- Commons can appear after an iNaturalist lead.
- Unsupported/unlicensed iNaturalist photos are excluded individually.
- Commons specimen/plate/larva/egg/map rejection still applies.
- Repeated source IDs/URLs collapse to one asset.
- Thirteen valid candidates store exactly twelve in stable order.
- Missing attribution/licence/source metadata fails closed.

### Database/integration tests

- One taxon owns 12 ordered reference image rows, each with independent attribution.
- Refresh from 12 to 3 replaces the gallery and leaves positions `0..2`.
- A refresh failure leaves the previous gallery intact.
- Refreshing images leaves the taxon's sound row untouched.
- User photos and avatar assets are untouched.
- Every lead query selects position 0 consistently.
- The page response never exposes more than 12 reference images even if malformed legacy data contains more.

### Component/browser tests

- Zero images: silhouette and no controls.
- One image: image and its attribution, no navigation.
- Two images: swipe plus previous/next controls update image, position and attribution.
- Twelve images at 360 px and desktop width: no overflow outside the hero, first and last are reachable.
- Keyboard operation and accessible position text work.
- A broken later image does not prevent reaching the remaining images.
- Grid and offline pack still use/download one lead image per taxon.

Capture a small evidence set from real locally backfilled taxa: one with 12 images from both origins if available, one with a single image and one with none. Record transferred bytes and request count for opening the 12-image page, plus the offline-pack image count before and after; the pack count should not increase because of the gallery.

## Acceptance criteria

- A taxon stores and serves an ordered gallery of zero to 12 licensed reference `Asset` rows.
- Each image retains its own author, exact licence, licence link, source page and source origin.
- Reference bytes remain externally hosted.
- The former lead-image choice remains position 0 and all thumbnail surfaces use it consistently.
- The species page exposes a usable and accessible gallery for 2–12 images and preserves its current behavior for 0–1.
- Refresh and backfill are isolated, transactional, resumable and do not touch sounds or private media.
- The regional offline pack remains lead-only.
- Applicable unit, integration, application build and browser checks pass, with the real-data evidence above recorded in findings.

## Delivery

Implement on the issue branch and continue the existing draft PR. Add a findings document beside this handoff with source coverage, rejection/cap counts, performance measurements, visual evidence, checks, uncertainties and the exact production-data state. Do not claim a production backfill or deployment from local success alone.
