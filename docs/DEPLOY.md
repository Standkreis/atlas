# ▲ Deploy — the live stack

> Current operations after the Germany release, checked against source on 2026-09-12. Decisions: [handoff 0011](handoffs/0011-vercel.md) and its findings. The one-VM deploy of [handoff 0010](handoffs/0010-deploy.md) was removed, see §🗑️.

| 🗓️ Updated | 👤 Owner | 🌐 Live | 🔁 Fallback |
| --- | --- | --- | --- |
| 2026-09-12 | Sven Reiser | https://atlas.standkreis.de | https://standkreis-dex.vercel.app |

## 🧱 Stack

| Piece | Service | Where | Notes |
| --- | --- | --- | --- |
| App | **Vercel** (team "Standkreis", Pro), project `standkreis-dex` | functions in `fra1`, Node.js 24 | root directory `app`; build command from `app/vercel.json`: `node scripts/deploy/migrate.mjs && npm run build` (overrides the dashboard) |
| Database | **Neon Postgres** (Launch, verified 2026-09-11), store `standkreis-atlas` | Frankfurt `eu-central-1` | via the Vercel marketplace; connected to Production and Preview only, so local dev keeps the Docker Postgres on `:5433`; [upgrade verification](https://github.com/Standkreis/atlas/issues/28#issuecomment-5633156461) |
| Photos | **Vercel Blob**, private store `standkreis-dex-blob` | `iad1` | connected to all three environments; user photos live at `photos/<assetId>.jpg`, streamed by `/api/photo/<id>` (0011 Track A); xeno-canto clips at `sounds/<gbifKey>.mp3`, streamed by `/api/photo/<id>.mp3` (0021 D5) |
| Mail | **Resend** (EU region) | — | the email code (0020): one transactional mail from `atlas@standkreis.de`, no tracking. The domain `standkreis.de` must be verified at Resend (DKIM, return path) before the first real mail |
| DNS | united-domains | — | `atlas` CNAME → Vercel; the apex `standkreis.de` is reserved for a later landing page |

Hosting decision: Hetzner refused the owner's card on 2026-09-05, one day after the VM deploy was merged. Vercel took its place.

## 🔑 Environment

No values here. Set in Vercel → Settings → Environment Variables unless the row says otherwise.

| Variable | Set where | Purpose | Sensitive |
| --- | --- | --- | --- |
| `DATABASE_URL` | Neon integration (prefix `DATABASE_`), Prod + Preview | The app's pooled connection | yes |
| `DATABASE_URL_UNPOOLED` | Neon integration, Prod + Preview | `prisma migrate deploy` in the build (advisory locks through PgBouncer left a stale lock, `P1002`, 2026-09-06) and separately authorized transfer operations (§🗄️); never local development or source ETL | yes |
| `DATABASE_*` (the rest) | Neon integration | Host, user, password pieces the integration adds; unused | yes |
| `BLOB_READ_WRITE_TOKEN` | Blob integration, all environments; also `app/.env.local` on the Mac (git-ignored) | Photo store: set → Blob, unset → disk under `PHOTO_DIR` | yes |
| `WEBAUTHN_RP_ID` | project, value `standkreis.de` | Passkey relying-party id: the **apex**, so passkeys survive a subdomain move | no |
| `WEBAUTHN_ORIGIN` | project, value `https://atlas.standkreis.de` | The origin passkeys are minted for | no |
| `WEBAUTHN_SECRET` | project | HMAC key for challenge cookies and delete tokens, 64 hex | yes |
| `PHOTO_DIR` | not set on Vercel (removed 2026-09-06 after 0011 A) | Disk photo store for dev and `next start`; on Vercel the Blob token replaces it | no |
| `CRON_SECRET` | project, Prod + Preview | Guards `GET /api/cron/sweep`; Vercel's cron sends it as `Authorization: Bearer …` (0011 Track B). Unset: the route answers 401 to everyone | yes |
| `ANTHROPIC_API_KEY` | project, Prod + Preview; also `app/.env.local` on the Mac | The scan (0016 Track A): `sighting.identify` proxies the photo to Claude Sonnet 5, the key never leaves the server. **Required**: the server refuses to start without it, like the others | yes |
| `ANTHROPIC_BASE_URL` | never on Vercel | Checks only: points `identify` at a stub (`app/scripts/m12/identify.mjs errors`) | no |
| `RESEND_API_KEY` | project, Prod + Preview; also `app/.env.local` on the Mac | The email attach (0020 E4): `identity.emailStart` sends the code through Resend. **Required**: the server refuses to start without it; unset in dev the code goes to the server log | yes |
| `XENO_CANTO_API_KEY` | never on Vercel; `app/.env.local` on the Mac | The sounds ETL (0021 D5): `npm run etl -- sounds` fetches one xeno-canto clip per bird, frog, grasshopper and bat into the Blob store (`sounds/<gbifKey>.mp3`); the app only streams them through `/api/photo/<id>.mp3` | yes |
| `RESEND_BASE_URL` | never on Vercel | Checks only: points the Resend SDK at a stub (`app/scripts/m7b/email.mjs`) | no |
| `PROSE_API_KEY` | never set anywhere (0028) | The `api` driver seam of the prose ETL throws without it; the prose is written on the plan with the `files` driver and the `20260910000000_prose` migration runs in Vercel's build like every other, nothing on Neon by hand | no |

`next.config.ts` picks `output` by environment: `'export'` for the static export, `undefined` otherwise (Vercel's tracer fails on `standalone`: `ENOENT next-server.js.nft.json`).

## 🚀 Deploying

| Trigger | Result |
| --- | --- |
| Push to `main` | Production deploy → atlas.standkreis.de |
| Push to any other branch | Preview deploy on a `*.vercel.app` URL, against the same Neon DB (Preview is connected). Passkeys fail there by design (RP id) |

The build command runs `scripts/deploy/migrate.mjs` first. Since 2026-09-09, that wrapper permits migration work only when Vercel reports the exact Production context (`VERCEL=1`, `VERCEL_ENV=production`, and an absent or matching `VERCEL_TARGET_ENV`). Preview and Development skip before database credentials are read; missing, malformed, unknown, or contradictory platform context fails closed before loading the database driver, waking Neon, waiting, or spawning Prisma. Production retains the existing wake polling and three `prisma migrate deploy` attempts over `DATABASE_URL_UNPOOLED` (`prisma.config.ts` also prefers it).

This guard protects the build migration entrypoint only. It does not isolate Preview runtime connections or prevent application reads/writes when Preview still has shared database credentials. Do not publish a schema-bearing Preview from an older branch/base that lacks this guard, and do not redeploy such an older unguarded artifact. Old deployments are not retroactively protected. An exact Production target authorizes this wrapper's context check; it does not prove that the resulting deployment has been promoted, assigned the production domain, or is serving users.

Local and CI schema checks continue through `npm run db:check:setup`, which accepts only a fresh disposable local `dex_check_*` database; never invent a production-like Vercel context as a local bypass. Do not run local `vercel build --prod` with production credentials: the guard is not a substitute for the local-only database policy. The repository's separate migration review and production-data rules still apply.

The historical `20260913120000_catalogue_marine_habitat` migration must remain exact. It is additive
and represented by inert Prisma fields/table solely to reconcile an already-applied checksum; it
does not reactivate the cancelled habitat experiment. Existing catalogue rows retain the default
rule version `0`, existing regional membership is unchanged, and the empty evidence table remains
untouched. Never resolve migration history by dropping these objects or deleting/editing its row.

After the guarded migration step, `npm run build` runs normally: `prebuild` mints the build id, `next build`, and `postbuild` writes the worker manifest.

## 📈 Web Analytics

The application includes `@vercel/analytics` v2 for automatic page views only. The shared boundary
is present in both disjoint root layouts, but renders only when all platform markers describe the
exact Vercel Production context: `VERCEL=1`, `VERCEL_ENV=production`, and
`VERCEL_TARGET_ENV` either absent or `production`. Local, Development, Preview, contradictory and
unknown contexts collect nothing. There are no custom product events or Atlas identity properties.

Before a page view can leave the browser, the boundary removes every query string and fragment,
decodes and normalizes the URL against the current same origin, and rewrites
`/{locale}/sighting/{id}` to `/{locale}/sighting/[id]`. Ambiguous/double-encoded, unknown,
unparseable, cross-origin and non-page-view events are dropped. The framework-neutral SDK adapter
uses the same canonical value for both the URL and the separately transported dynamic-route field,
while retaining the raw pathname only as the SDK's navigation-change token; that value is processed
by the URL callback and is not the reported dynamic route. This prevents a raw ID from bypassing
the URL callback without collapsing consecutive visits to two different sightings. The adapter
also forwards Vercel's public resilient-intake configuration just as the Next adapter does. The site
uses an origin-only referrer policy. Because the SDK's `beforeSend` callback does not cover its
separately collected initial referrer, a document with a private sighting path, query, fragment or
unexpectedly detailed cross-origin referrer does not load analytics at all.

Vercel documents that a page-view data point may also include its timestamp, canonical dynamic
route, referrer, approximate city-level geolocation, OS/browser/device type and script version. It derives
a visitor hash from the request without a third-party analytics cookie and discards the visitor
session after 24 hours. The Settings disclosure distinguishes that collection from the app's
same-origin HttpOnly `dex_id` cookie. The app does not read that cookie into an analytics event.
Because the intake is same-origin, browser transport may nevertheless attach same-origin cookies
as HTTP request headers; that is distinct from the event body and configured dashboard fields, but
does not by itself resolve legal consent or disclosure requirements. Cookie-free analytics is not
by itself a compliance claim; revisit that open legal question if the provider configuration,
collected fields or applicable requirements change.

Dashboard enablement is a separate owner-controlled prerequisite, potentially subject to the
Vercel plan, usage limits and billing authority. A repository build cannot prove enablement or
collection. After deploying, the owner must check the Production environment in Vercel Web
Analytics, then use a public non-sensitive route on `atlas.standkreis.de` and verify both the
analytics script and view intake succeed and only the aggregate, sanitized route appears in the
dashboard. Do not use a real sighting identifier or query value as a production probe. Preview must
show no analytics script or intake request. Until those checks are recorded, production analytics
verification remains pending.

Rollback is one code operation: remove both shared boundary mounts and the `@vercel/analytics`
package, then redeploy. Disabling Web Analytics in the dashboard may stop intake sooner, but does
not replace the code rollback or prove that previously deployed clients stopped attempting sends.

## 🩺 Health, cron, background work

| Route | Who calls it | Answer |
| --- | --- | --- |
| `GET /api/health` | an uptime monitor, you | `200 {ok, buildId, sweepAt}`; `503 {ok: false, error}` when Neon does not answer. `sweepAt` is when the last sweep finished **in this instance** (null on a fresh one; there is no table for the stamp) |
| `GET /api/cron/sweep` | Vercel's cron, hourly (`app/vercel.json`, `0 * * * *`), with `Authorization: Bearer $CRON_SECRET`; by hand with `curl -H "Authorization: Bearer $CRON_SECRET" https://atlas.standkreis.de/api/cron/sweep` | the cleanup `SweepResult` JSON (`photos`, `codes`, `seconds`, `cut`, plus legacy `regions: []` and zero content counters); `401` without the secret, `503` while catalogue cutover denies writes, `500` on failure. Vercel → project → Cron Jobs shows the runs |

Runtime maintenance deletes abandoned photos, retries pending media deletion, removes expired
email codes and cleans quota records. The cron passes a 240-second deadline under a 300-second
function ceiling; `cut` reports elapsed budget, not pending ETL batches. Catalogue write admission
protects maintenance during cutover. `register()` checks the environment on Vercel and leaves
cleanup to cron; local `next start` also starts cleanup once per process.

Public `dex.requestRegion` returns an already-ready legacy region or rejects preparation.
`taxon.ensure` saves/returns minimal GBIF taxonomy and names for a logged species; it does not
launch rich-content enrichment. Regional preparation and content work belong to the local CLI
under the [ETL guidance](../app/etl/README.md). Adding regions through the UI remains out of scope.

Private user photos are ownership-checked on every request and use `private, no-store`.
Public reference images may enter offline packs; public sound responses use immutable caching.
Queued private uploads remain in IndexedDB until acknowledged. See
[`/api/photo/[id]`](../app/src/app/api/photo/[id]/route.ts) and
[`sweep`](../app/src/server/sweep.ts) for the current behavior.

## 🗄️ Filling or refreshing the database from the Mac

Generate and review data in **local Postgres**, never Neon. Germany #14 shipped on 12 September:
[release record](records/2026-09-11-germany-release.md),
[adopted Germany ADR](adr/2026-09-11-germany-atlas.md), and the actual
[native replacement plan](operations/2026-09-12-germany-native-replacement.md).
The direct production importer attempts under the
[11 September plan](operations/2026-09-11-germany-production-migration-plan.md) did not commit;
the native plan superseded that execution route. It used the checked importer **locally** to build
a frozen candidate, then a separately rehearsed native replacement to publish it.

That pre-alpha replacement had a **one-time data-loss waiver**. It is consumed, not standing
permission for another replacement. Future production transformations require a new concrete
source/target, preservation, backup, rehearsal and recovery agreement. The
[checked import/planner/audit runbook](operations/germany-checked-import.md) remains supported
for local candidate preparation and reviewed transfer design; neither its existence nor a normal
code deployment authorizes production data changes. Retain migration checksums, private source
archives, receipts and recovery helpers. Do not run enrichment or whole-table restore recipes on
production as a shortcut.

For a future Germany refresh, build a new version-explicit staged catalogue in local Postgres,
audit it and rehearse activation/transfer. Legacy direct regional publication must not bypass the
active national union/version; [#115](https://github.com/Standkreis/atlas/issues/115) owns its guard.
See the [ETL command contract](../app/etl/README.md) before running any region/refresh/sweep job.

After a code release, verify the exact merged Git SHA has a Ready Production deployment and the
production aliases point to it. Read `/api/health` for the serving build, check representative public
English/German routes and affected flows, and record deployment identity, UTC time and results.
CI or a main-branch commit alone does not establish production delivery. Local verification uses
[DEVELOPMENT.md](DEVELOPMENT.md), including production builds and browser/SW checks on local Postgres.

## 🧰 Vercel CLI

`npx vercel` on the Mac is logged in; `app/.vercel/` (git-ignored) links the folder to the project.

| Want | Type (in `app/`) |
| --- | --- |
| Log in | `npx vercel login` |
| Link the folder | `npx vercel link` |
| List variables | `npx vercel env ls` |
| Pull variables | `npx vercel env pull --environment production <file>` |
| Deploy by hand | not needed; push |

## 📚 Historical deployment evidence

[Handoff 0011](handoffs/0011-vercel.md) and its [findings](handoffs/0011-vercel-findings.md)
record the original Vercel move. Its immutable private-photo caching and runtime ETL job design
were superseded by the reliability work; the current behavior is described above.
The owner verified Resend email attachment on 7 September (roadmap M7b).

## 🗑️ Removed: the VM deploy

[Handoff 0010](handoffs/0010-deploy.md) built a one-VM deploy (Docker Compose, Caddy, Postgres on the box), [findings 0010](handoffs/0010-deploy-findings.md) proved it on the Mac, Hetzner refused the card. `deploy/`, `app/Dockerfile` and `.github/workflows/deploy.yml` were deleted rather than left to rot once 0011 moves photos to Blob. If Vercel ever bills or limits bite:

```bash
git checkout 113a630 -- deploy app/Dockerfile app/.dockerignore .github/workflows/deploy.yml
```

## Reliability migration history (0029)

[Handoff 0029](handoffs/0029-audit-reliability.md) and its
[findings](handoffs/0029-audit-reliability-findings.md) preserve pre-release evidence.
The additive `20260908120000_durable_admission_and_deletion` migration supplies runtime
quota/cache/deletion tables and `Asset.byteSize`; keep it and all later applied checksums exact.
The Germany release record owns subsequent production verification. Future additive migrations
continue through the guarded Vercel Production build. Default application budgets and the
region-scoped prose publication contract are documented in [DEVELOPMENT.md](DEVELOPMENT.md).
