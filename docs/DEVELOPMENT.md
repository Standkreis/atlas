# Development and verification

Use Node 24 (`nvm use` at the repository root), then `cd app && npm ci`. The application is a Next.js modular monolith: React Query owns server snapshots, the owner-bound IndexedDB outbox owns pending writes, tRPC validates inputs and ownership, and Postgres stores encounters. Discovery and progress are derived from sightings. Shared pure rules live in `src/domain`; filesystem-cached ETL lives in `etl` and is never imported by runtime routes.

The normal development database is Docker Postgres on port 5433. Keep local servers pointed there or at a disposable check database; never at Neon. Do not run `prisma migrate dev`, `db push`, or reset. Production applies checked-in additive migrations through Vercel’s build command. No migration script terminates other database sessions.

For a reproducible fresh check, choose an unused database name:

```sh
cd app
npm run db:up
export DATABASE_URL=postgresql://dex:dex@localhost:5433/dex_check_local_1
export DATABASE_URL_UNPOOLED="$DATABASE_URL"
npm run db:check:setup
npm run db:seed
npm run test:integration
npm run check
VERCEL=1 VERCEL_ENV=production VERCEL_TARGET_ENV=production npm run build
npm run test:browser
```

`db:check:setup` refuses remote hosts and names outside `dex_check_*`, creates a new database, and applies committed SQL there. It refuses an existing database. Seeding uses committed Mainz-Bingen/Kyoto fixtures without network requests; it is intended for the disposable database. CI uses the same flow with Postgres 17, Node 24, stub service addresses, and both build modes. Real production secrets are unnecessary. Unit tests never call identification or send email.

The extra server build above matches CI’s analytics markers; it runs only `npm run build` against
the disposable local database, not the Vercel migration wrapper. Browser checks intercept analytics
script/intake locally and use stub model/mail services. Without those build markers, the full
browser suite correctly fails its production analytics assertion.

`npm run check` includes the static export because its routes query seeded taxa; it also builds the server, which includes API functions omitted by export. `npm run test:integration` exercises concurrent database behavior. Browser/SW verification must use `next start` after the production build, not `next dev`; `npm run test:browser` starts and stops a local production server, then runs English/German UX and private-cache checks using installed Chrome. Preserve historical scripts and handoffs as evidence rather than treating every old command as supported setup.

Runtime maintenance removes expired codes, quota buckets and abandoned/retryable media. Regional preparation and content tasks use the local [ETL CLI](../app/etl/README.md). Direct `region`/`refresh`/queued-region `sweep` publication requires a database without an active German catalogue; Germany membership refresh uses a new version-explicit staged run in a separate disposable local database and reviewed activation. A newly logged outside-set species is saved immediately with GBIF names; rich content waits for the CLI sweep. The CLI sweep holds a session advisory lock, not an hours-long SQL transaction. HTTP reads have timeouts. `refresh` bypasses the disk cache; other cached GETs expire after 30 days. Both map and ETL read the versioned observation window in `src/domain/observationWindow.ts`; advancing it requires a coordinated region refresh.

Prose uses `Taxon.prose = {version: 1, regions: {"<regionId>": ...}}`. Region writes update one JSON path atomically. Only complete supported audits with valid citations are published; partial/unsupported drafts and missing direction templates remain pending. Old global prose is hidden until reimported. The prompt’s locale falls back to scientific partner names, never the other language. Region membership in the ecology sheet is evaluated for the selected region.

Static export/native hosting remains experimental. `NEXT_PUBLIC_API_URL` alone does not establish credentialed cross-origin cookies, origin policy or dynamic species/sighting rewrites. The production same-origin PWA is the supported deployment; native rollout needs its own tested origin and routing contract.

Application allowances are configured in `src/server/quotas.ts` (environment names also in `.env.example`). Defaults allow 20 scans per identity/day, 100 per network/day, 500 globally/day, with one active scan per identity and four globally. Conservative reservations stop new paid work at $10/day or $300/month; they are estimates based on the configured model pricing, not billing reconciliation. Failed or ambiguous requests retain reservations. Repeated successful identification of the same photo, prompt/model, region and locale reuses its result. Deleting a photo does not release an active concurrency lease.

Uploads allow 50 per identity/day, 200 per network/day, 2,000 globally/day; stored user media is limited to 256 MiB per identity and 10 GiB globally. Actual body bytes are bounded before parsing, then images are decoded, resized and re-encoded without EXIF. Existing user assets conservatively count as 8 MiB each until known sizes are written; pending deletion objects also count against global storage. Storage failures retain durable deletion records after database cascades. Public API calls cannot start region preparation.

On Vercel, network bucketing uses `x-vercel-forwarded-for`, consistent with the platform’s [request-header contract](https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for). A self-hosted proxy must overwrite the explicitly configured `TRUST_PROXY_IP_HEADER`; otherwise all requests share a fallback bucket. Raw addresses are hashed with the server secret before storage. Changing a cookie cannot reset global/network counters.

The prose file driver also binds imports to the exact current prompt. Changed fact sheets or drafts invalidate existing answers/audits, keeping them as `.stale-*` backups; read-only imports refuse a mismatched prompt. Regeneration must finish before publication.
