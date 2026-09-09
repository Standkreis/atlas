# German content pilot: real-gallery review

Evidence for [#21](https://github.com/Standkreis/atlas/issues/21), 9 September 2026. This is a
pilot checkpoint, not evidence that the complete national content run or production transfer
has finished. The issue and final release audit own those completion gates.

## 🖥️ Actual rendered result

Reviewed the clean-main preview at commit `c4fca71c5ce7006ecbd4e58171e69059dc9b4ebf`, build
`mttsnfi6`, against a disposable copy of the real initial 100-taxon gallery pilot. No synthetic
image fixtures or request interception were used. The copied data predates the names pass and
the licence-URL pilot corrections; scientific-name headings here are expected.

Primary Codex agent inspected the collaborative browser and saved screenshots. Independent
Codex reviewer `/root/audit19_scientific_final` exercised isolated Chrome/CDP at exact
390 × 844 and 1280 × 900 sizes; the collaborative host's requested viewport was scaled and
therefore was not used as exact-width evidence.

| Real taxon | State | Observed result |
| --- | --- | --- |
| Ciconia nigra, GBIF 2481909 | 12 images, iNaturalist and Commons | All 12 decoded at both sizes; selected-image author/licence/source links match stored provenance; Home/End/arrows and endpoint clamps work |
| Phytomyza cirsii, GBIF 1551313 | One image | Decoded at both sizes; source control remains; no unnecessary navigation or counter |
| Megachile pilidens, GBIF 1335229 | Zero eligible images | Explicit “No image yet” fallback; no image controls or misleading empty carousel |

The check verified 26 active-image attribution states across the two viewports. Controls are
44 px, the position announcement is polite, desktop content remains 520 px wide, and no
horizontal overflow was observed. Thirteen distinct real CDN image URLs were loaded. A host
sleep/connectivity interruption affected an earlier attempt; the complete rerun passed after
recovery. It is not evidence of an application defect.

![Phone: active Commons attribution](2026-09-09-germany-content/phone-mixed-gallery-commons-attribution.webp)

![Desktop: active Commons image](2026-09-09-germany-content/desktop-mixed-gallery-commons.webp)

Both black-stork screenshots show Chris Eason's photograph,
[Ciconia nigra – Kruger National Park](https://commons.wikimedia.org/wiki/File:Ciconia_nigra_-Kruger_National_Park-8.jpg),
under [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/), displayed cropped within the
application gallery. Screenshots were resized/encoded to WebP for review evidence.

![Phone: single diagnostic leaf-mine image](2026-09-09-germany-content/phone-single-diagnostic-leafmine.webp)

The single image is a diagnostic leaf mine, not an adult fly. Photograph by Vytautas,
[iNaturalist photo 214407360](https://www.inaturalist.org/photos/214407360),
[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/), displayed cropped and encoded
within this non-commercial review screenshot. Source identifications are not independently
certified by successful rendering or matching attribution links.

## 🔬 Pilot and recovery evidence

The final versioned 100-taxon pilot produced 601 eligible reference images and six completed
zero-image results. Version `licensed-gallery-v3` corrects false rejection of matching legacy
HTTP/localized Creative Commons deed URLs without changing licence family, version or
jurisdiction. Credentials and custom ports are rejected. The unchanged second invocation
examined zero taxa and made zero network requests. The names pilot reused cached Wikidata
responses and added 58 German labels; missing names remain honest scientific-name fallbacks.

A real SIGTERM interruption of the nationwide gallery process at 08:04 UTC left 181 completed
checkpoints and two leased unfinished taxa. Restarting the same command continued other work
without reclaiming live leases. All 181 previously completed records retained their exact
serialized checkpoint digest (`ae84f214d29c8fd42b9b41ab4cb7a854`, PostgreSQL MD5 equality check)
after restart. This equality check is recovery evidence, not an artifact security digest.
Final expired-lease completion and whole-union retry counts remain release-audit gates.

The initial 588 pilot URLs passed HTTP/image-MIME checks. Later local connectivity failures
also affected GitHub and CDN requests; they remain failed/retryable observations, not reasons
to remove taxa or certify zero-image coverage. Final release requires a fresh complete URL
report, independently bound decoded samples and reproducible base/gallery artifacts. Precise
per-process request counters from the deliberately terminated segment were not emitted;
its stderr and database checkpoints are retained, while completed run reports retain their
exact request/cache/retry counts. Do not present that missing segment as zero requests.

## 📊 Whole-union API check (pilot content)

The exact 6,874-key union was enumerated from the disposable preview database and checked via
`taxon.page` with concurrency four. Every key returned HTTP 200 with matching identity,
scientific display fallback, supported tile and a valid bounded gallery; there were no failures
or HTTP 500 responses. The union fingerprint remained
`6ede6e5b059fa0d3d5edc0e883654a1c7ecb2df08abae129c32c9953e25ae38e`.

Local wall time was 8.78 seconds; per-request p50/p95/p99 were 4.9/7.2/8.9 ms. Responses totaled
2,916,356 bytes, with a 5,234-byte maximum. These are local API/transport measurements on the
pilot's 588-image content snapshot, not final-gallery payload measurements, browser rendering
coverage, production latency or CDN transfer bytes. No upstream APIs/images were requested.
The exact-key check must be repeated against the frozen final dataset in #29.

## 🔎 Source-evidence review addendum

At 10:18–10:27 UTC, independent Codex reviewer `/root/audit19_scientific_final` decoded and
visually inspected ten deterministic interim sample images. Both Commons file pages exposed
their file-specific credits and licence versions. Eight iNaturalist photo pages returned a
Cloudflare challenge, including in an ordinary collaborative browser tab. The owner
[approved retained official API records as a distinct source-evidence method](https://github.com/Standkreis/atlas/issues/21#issuecomment-5600270992),
not a claim that blocked public pages had been inspected.

The audit binds retained JSON bytes to the exact official detail request, taxon/photo identity,
image URL, author and licence code. Review still checks the official version mapping, and
sample decoding and complete fresh image-URL checks remain separate gates. The current
[iNaturalist licence module](https://github.com/inaturalist/inaturalist/blob/d65e6756e8c249d9e56798138cd55a90649a2409/app/models/shared/license_module.rb)
maps CC families to version 4.0 and CC0 to 1.0. This establishes its current published mapping,
not every photograph's original historical grant.

That distinction is material: the original [Nimbus contaminatus Flickr photograph](https://www.flickr.com/photos/coleoptera-us/33331825142/)
links CC BY-SA 2.0, while imported iNaturalist photo 61832344 received the common 4.0 mapping.
The API fallback therefore requires detailed native-free provenance; an abbreviated default
photo, a `LocalPhoto` type alone, or an iNaturalist CDN URL is insufficient. A source-record
census at 10:24:06 UTC matched all 8,543 then-collected iNaturalist references: 7,280 had null
native provenance and 1,263 had imported provenance. This is an interim risk census, not a
final gallery count or a claim that every imported image has an incorrect licence.

The [issue records the release-blocking finding and pending collection-policy decision](https://github.com/Standkreis/atlas/issues/21#issuecomment-5600392398).
No source-policy change, automatic rights relabelling or production transformation is implied
by this evidence. Final samples must be selected again and bound to the frozen content snapshot.
