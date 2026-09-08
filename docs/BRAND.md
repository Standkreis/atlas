# Standkreis and Atlas

Standkreis is the organisation and master brand. Atlas is its first product; Species, Globe, and Grow are planned product names. Confirmed by Sven on 2026-09-08.

- **Organisation:** Standkreis. The open circle surrounds the point where you stand. The opening suggests stepping out and encountering what is nearby. The mark contains no product initial, leaf or atlas-specific detail.
- **Product:** Atlas. Pair the organisation mark and Standkreis wordmark with a product name. Sven selected space and weight, with roughly half the original gap: Standkreis in semibold, the product name in regular, both at the same size. Use a 7 px gap at the app's 18 px wordmark size, or 12 px at the share card's 30 px size. The mark-to-name spacing stays unchanged. No separator.
- **Full product name:** Standkreis Atlas. Use for page titles, installation details, mail and link previews. Keep Atlas for navigation and compact home-screen labels. Never use Standkreis alone to mean the Atlas product.
- **Colour:** the organisation mark is forest ink or white. Atlas uses the existing moss green and amber palette. Its green app-icon tile is a product treatment, not the only permissible organisation logo.
- **Opening, German:** “Entdecke, was um dich herum lebt.” Supporting copy: “Lerne Arten in deiner Nähe kennen und halte deine Begegnungen fest.” Action: “Deine Region wählen”.
- **Opening, English:** “Discover the wildlife around you.” Supporting copy: “Get to know local species and keep a record of your encounters.” Action: “Choose your region”.

The canonical mark is [standkreis-mark.svg](../app/public/brand/standkreis-mark.svg). The onboarding lockup is [Brand.tsx](../app/src/components/Brand.tsx).

The [wordmark comparison](brand/wordmarks.html) previews space and weight, a stacked product name, and a small dot across Atlas, Species, Globe, and Grow, with a dark-background toggle.

**Typeface: Titillium Web**, selected by Sven on 2026-09-08 after comparing Titillium Web, Nunito, and Rubik. Use regular for reading and product labels, semibold for controls and the Standkreis wordmark, bold for headings, and real italics for scientific names. The four faces are bundled locally through `next/font/local` and included in the offline build manifest. Font provenance and the OFL licence live in [styles/fonts](../app/src/styles/fonts/README.md). The share cards use the same bundled typeface, with text converted to vector paths for portable SVG and PNG exports.

App icons and the two share cards are generated from that mark by `cd app && npm run brand:assets`. Rerun after changing the mark or opening copy, and commit the exports. The share cards are native vector compositions; the PNGs are the social-platform exports. Keep the circle and dot together, retain the opening, and leave clear space around the mark.

The maskable icon keeps the entire mark inside the central safe circle; its background extends to the edges. Apple gets an opaque square PNG so the operating system can apply its own mask.

The locale layouts expose German and English share cards. The root URL supplies German metadata before its client-side language redirect, so links to `atlas.standkreis.de` also have an identity when unfurled without JavaScript.
