# Inside the Atlas

Interactive architecture guide for the local Standkreis Dex codebase. Open [index.html](index.html) directly in a browser, or serve this directory from the repository root:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory docs/architecture
```

Visit **http://localhost:4173**. No database, credentials, package install, CDN or application server is needed to view it. The guide stays outside the application's public directory.

Includes:

- A clickable system map with implementation references.
- Every Prisma model, field, constraint and enum, plus a relationship diagram.
- Walkthroughs for browsing, sightings, identification, passkeys and study.
- An interactive example of discovery, study and seasonality rules.
- The species ETL, its sources and provenance contracts.
- Direct npm dependencies with requested and lockfile-resolved versions.
- Typed API procedures, page/HTTP routes, exported TypeScript types and an import-aware source browser.
- Deployment configuration, offline storage boundaries, checks and implementation gaps.

Use **⌘K / Ctrl+K** to search. Source links open a line-numbered snapshot. All illustrative species values are labeled as examples; no private user records are included.

Refresh the generated inventory after code changes (requires the app's existing TypeScript development dependency):

```sh
node app/scripts/architecture/build.mjs
```

`data.js` is generated from an explicit set of source directories and project files. It excludes environment files, user data, generated Prisma code, experiment answers, bulk datasets and binary assets. It captures **working-tree state**, including uncommitted changes, and records a timestamp and base commit. It does not inspect the deployed system.

`content.js` contains the curated explanations; review these when behavior changes. `app.js` and `style.css` implement the dependency-free guide. The source viewer includes selected application code; review its scope before publishing the documentation publicly.
