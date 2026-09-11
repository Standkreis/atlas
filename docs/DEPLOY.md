# ▲ Deploy — the live stack

> How the app runs in production as of 2026-09-07. Decisions: [handoff 0011](handoffs/0011-vercel.md) and its findings. The one-VM deploy of [handoff 0010](handoffs/0010-deploy.md) was removed, see §🗑️.

| 🗓️ Updated | 👤 Owner | 🌐 Live | 🔁 Fallback |
| --- | --- | --- | --- |
| 2026-09-07 | Sven Reiser | https://atlas.standkreis.de | https://standkreis-dex.vercel.app |

## 🧱 Stack

| Piece | Service | Where | Notes |
| --- | --- | --- | --- |
| App | **Vercel** (team "Standkreis", Pro), project `standkreis-dex` | functions in `fra1`, Node.js 24 | root directory `app`; build command from `app/vercel.json`: `node scripts/deploy/migrate.mjs && npm run build` (overrides the dashboard) |
| Database | **Neon Postgres** (Free), store `standkreis-atlas` | Frankfurt `eu-central-1` | via the Vercel marketplace; connected to Production and Preview only, so local dev keeps the Docker Postgres on `:5433` |
| Photos | **Vercel Blob**, private store `standkreis-dex-blob` | `iad1` | connected to all three environments; user photos live at `photos/<assetId>.jpg`, streamed by `/api/photo/<id>` (0011 Track A); xeno-canto clips at `sounds/<gbifKey>.mp3`, streamed by `/api/photo/<id>.mp3` (0021 D5) |
| Mail | **Resend** (EU region) | — | the email code (0020): one transactional mail from `atlas@standkreis.de`, no tracking. The domain `standkreis.de` must be verified at Resend (DKIM, return path) before the first real mail |
| DNS | united-domains | — | `atlas` CNAME → Vercel; the apex `standkreis.de` is reserved for a later landing page |

Hosting decision: Hetzner refused the owner's card on 2026-09-05, one day after the VM deploy was merged. Vercel took its place.

## 🔑 Environment

No values here. Set in Vercel → Settings → Environment Variables unless the row says otherwise.

| Variable | Set where | Purpose | Sensitive |
| --- | --- | --- | --- |
| `DATABASE_URL` | Neon integration (prefix `DATABASE_`), Prod + Preview | The app's pooled connection | yes |
| `DATABASE_URL_UNPOOLED` | Neon integration, Prod + Preview | `prisma migrate deploy` in the build (advisory locks through PgBouncer left a stale lock, `P1002`, 2026-09-06) and the ETL from the Mac (§🗄️); unused by the app at runtime | yes |
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

## 🩺 Health, cron, background work

| Route | Who calls it | Answer |
| --- | --- | --- |
| `GET /api/health` | an uptime monitor, you | `200 {ok, buildId, sweepAt}`; `503 {ok: false, error}` when Neon does not answer. `sweepAt` is when the last sweep finished **in this instance** (null on a fresh one; there is no table for the stamp) |
| `GET /api/cron/sweep` | Vercel's cron, hourly (`app/vercel.json`, `0 * * * *`), with `Authorization: Bearer $CRON_SECRET`; by hand with `curl -H "Authorization: Bearer $CRON_SECRET" https://atlas.standkreis.de/api/cron/sweep` | the `SweepResult` JSON (`regions`, `content`, `contentDone`, `contentFailed`, `photos`, `seconds`, `cut`); `null` when another run holds the advisory lock; `401` without the secret. Vercel → project → Cron Jobs shows the runs |

Jobs that must outlive the response (the region job on `dex.requestRegion`, the content kick on `taxon.ensure`) go through `waitUntil` (`app/src/server/jobs.ts`), so the invocation lives until they settle; the tRPC route and the cron route declare `maxDuration = 300` (fluid compute). The sweep stops starting new batches at 240 s and reports `cut: true`; the next hour continues, every step is idempotent. `register()` (instrumentation) only checks the environment on Vercel; the sweep at start is for `next start` on a laptop.

## 🗄️ Filling or refreshing the database from the Mac

Generate and review data in **local Postgres**, never Neon. Transfer a frozen, reviewed catalogue
through the [checked import and recovery process](operations/germany-checked-import.md), using the
unpooled target connection only after the concrete production migration plan is approved.
The former direct-Neon ETL and whole-table restore recipes are superseded for populated targets;
they do not preserve target identities, reviewed galleries and personal references safely.

The historical first fill on 2026-09-06 took 111 seconds and produced a 929-species set. That old
timing is not a Germany migration estimate. Use the production-copy rehearsal's current footprint,
write-pause and recovery measurements instead.

## 🧰 Vercel CLI

`npx vercel` on the Mac is logged in; `app/.vercel/` (git-ignored) links the folder to the project.

| Want | Type (in `app/`) |
| --- | --- |
| Log in | `npx vercel login` |
| Link the folder | `npx vercel link` |
| List variables | `npx vercel env ls` |
| Pull variables | `npx vercel env pull --environment production <file>` |
| Deploy by hand | not needed; push |

## 🚧 Not done yet

[Handoff 0011](handoffs/0011-vercel.md) is closed ([findings](handoffs/0011-vercel-findings.md)); the table keeps what it settled.

| Gap | Today | Track |
| --- | --- | --- |
| Photos persist | ✅ private Blob behind the `photos.ts` seam, streamed with an immutable cache header (0011 A, C1–C3); owner's C6 on the phone | A, done |
| Region job, content kick outlive the response | ✅ `waitUntil` via `server/jobs.ts`, `maxDuration = 300` on the tRPC route (0011 B, C4); proven on Vercel itself by the owner's C6 | B, done |
| Restart sweep | ✅ hourly `GET /api/cron/sweep` with `CRON_SECRET`, `register()` skips the sweep on Vercel (0011 B, C5) | B, done |
| Resend domain, email attach | code built and checked against a stub ([0020](handoffs/0020-email-attach-findings.md)); the domain at Resend and the first real mail (C8) are the owner's | M7b |

## 🗑️ Removed: the VM deploy

[Handoff 0010](handoffs/0010-deploy.md) built a one-VM deploy (Docker Compose, Caddy, Postgres on the box), [findings 0010](handoffs/0010-deploy-findings.md) proved it on the Mac, Hetzner refused the card. `deploy/`, `app/Dockerfile` and `.github/workflows/deploy.yml` were deleted rather than left to rot once 0011 moves photos to Blob. If Vercel ever bills or limits bite:

```bash
git checkout 113a630 -- deploy app/Dockerfile app/.dockerignore .github/workflows/deploy.yml
```

## Reliability deployment (0029)

Review [handoff 0029](handoffs/0029-audit-reliability.md) and its findings with the application changes. Deploy the additive `20260908120000_durable_admission_and_deletion` migration before serving this code: runtime quota/cache/deletion tables and `Asset.byteSize` are required. Vercel’s existing build migration step applies it; never run the new application against an old production schema. No production migration or deployment was performed in the implementation session.

Cron now handles bounded storage/code/quota cleanup only. Region preparation and missing rich content require the development CLI sweep; runtime functions no longer import the ETL filesystem cache. Generated prose is region-scoped and publication-gated; the old five global texts need reimporting and passing audits. Review the configurable default application budgets in [DEVELOPMENT.md](DEVELOPMENT.md). Private photos use `no-store`; offline packs retain public reference images, while queued photo uploads remain in IndexedDB until acknowledged.
