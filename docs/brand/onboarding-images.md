# Onboarding category photos

Owner-supplied Adobe Stock images, added 2026-09-08 for onboarding step 2. These illustrate categories; they do not assert that the pictured species occurs in the selected region. Species counts remain regional. Original image attribution elsewhere in the atlas is unchanged.

Only optimized derivatives are bundled in `app/public/onboarding/`. Originals remain outside the repository. Each thumbnail is a subject-focused square, 144 × 144 pixels for a 48 CSS-pixel circle at 3× density, encoded as WebP at quality 82 / effort 6 using Sharp. Metadata is stripped. The eight files total 35,348 bytes, down from 38,942,293 bytes of uploaded JPEGs (99.91% smaller). The service worker includes them in its versioned shell cache.

| Category | Supplied original | Crop: left, top, square size (source pixels) | WebP bytes |
| --- | --- | --- | ---: |
| Birds | AdobeStock_366559814.jpeg | 1199, 27, 2402 | 4,220 |
| Insects | AdobeStock_2076025342.jpeg | 1257, 410, 4403 | 3,840 |
| Plants | AdobeStock_2157682158.jpeg | 1511, 245, 2774 | 3,100 |
| Fungi | AdobeStock_2169108805.jpeg | 1224, 160, 2057 | 9,336 |
| Mammals | AdobeStock_858326599.jpeg | 909, 269, 2330 | 3,402 |
| Amphibians | AdobeStock_663121166.jpeg | 1803, 522, 3132 | 3,132 |
| Reptiles | AdobeStock_2158974203.jpeg | 524, 0, 2822 | 4,280 |
| Fish | AdobeStock_719793652.jpeg | 927, 236, 2414 | 4,038 |
