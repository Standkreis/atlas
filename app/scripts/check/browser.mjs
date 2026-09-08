// Reproduces the CI production-browser suite against a disposable database.
import { spawn } from 'node:child_process'
import pg from 'pg'
import landManifest from '../../src/server/data/germany-land.manifest.json' with { type: 'json' }
const database = new URL(process.env.DATABASE_URL ?? '')
if (!['localhost', '127.0.0.1'].includes(database.hostname) || !/^\/dex_check_[a-z0-9_]+$/.test(database.pathname)) throw new Error('Browser tests require a local dex_check_* database')
const base = 'http://localhost:3002'
// Give the current month's preview taxon two distinct local images. The older non-lead catches
// regressions to createdAt ordering, and its URL is a byte-request sentinel in the browser audit.
const fixtureDb = new pg.Client({ connectionString: database.href })
await fixtureDb.connect()
try {
  await fixtureDb.query(`
    WITH demo AS (
      SELECT p."taxonId" FROM "Plausibility" p JOIN "Region" r ON r.id = p."regionId"
      WHERE r.name = 'Mainz-Bingen' AND p.peak > 0
      ORDER BY p."monthShare"[EXTRACT(MONTH FROM CURRENT_DATE)::int]::numeric / p.peak DESC LIMIT 1
    )
    INSERT INTO "Asset" (id, kind, url, author, licence, "licenceUrl", "sourceUrl", origin, position, "createdAt", "taxonId")
    SELECT '00000000-0000-4000-8100-00000000000' || image.position, 'image'::"AssetKind", image.url,
      'Browser fixture (mock metadata)', 'CC0 1.0', 'https://creativecommons.org/publicdomain/zero/1.0/',
      'https://atlas-fixture.invalid/source/' || image.position, 'commons', image.position,
      CASE WHEN image.position = 0 THEN NOW() ELSE '2000-01-01'::timestamp END, demo."taxonId"
    FROM demo CROSS JOIN (VALUES
      (0, 'https://atlas-fixture.invalid/onboarding-lead-fixture.webp'),
      (1, 'https://atlas-fixture.invalid/onboarding-nonlead-sentinel.webp')
    ) AS image(position, url)
    ON CONFLICT (id) DO UPDATE SET url = EXCLUDED.url, licence = EXCLUDED.licence,
      "licenceUrl" = EXCLUDED."licenceUrl", "sourceUrl" = EXCLUDED."sourceUrl", origin = EXCLUDED.origin
  `)
  // Add the smallest active, geometry-compatible German catalogue so the suite exercises the ready national summary.
  const now = new Date()
  const { rows: [mainz] } = await fixtureDb.query(`UPDATE "Region" SET "canonicalKey" = 'de-krg-07339', "countryCode" = 'DE' WHERE name = 'Mainz-Bingen' RETURNING id, name`)
  if (!mainz) throw new Error('Mainz-Bingen seed region missing')
  const registryId = 'browser-registry-de', sourceId = 'browser-source-de', entryId = 'browser-entry-mainz'
  const catalogueId = 'browser-catalogue-de', buildId = 'browser-build-mainz'
  await fixtureDb.query(`INSERT INTO "RegionRegistryVersion" (id, "countryCode", version, "artifactSha256", "expectedRegions", "expectedSourceUnits", active, "activatedAt") VALUES ($1, 'DE', $2, $3, 1, 1, true, $4) ON CONFLICT ("countryCode", version) DO UPDATE SET "artifactSha256" = EXCLUDED."artifactSha256", active = true, "activatedAt" = EXCLUDED."activatedAt"`, [registryId, landManifest.registryVersion, landManifest.registrySha256, now])
  await fixtureDb.query(`INSERT INTO "RegionRegistrySource" (id, "registryVersionId", role, name, url, "topicDate", "downloadedAt", sha256, "licenceId", "licenceUrl", attribution) VALUES ($1, $2, 'regions', 'Browser fixture from checked-in BKG land artefact', 'local://germany-land', $3, $4, $5, $6, $7, $8) ON CONFLICT ("registryVersionId", role) DO NOTHING`, [sourceId, registryId, landManifest.source.topicDate, now, landManifest.geometrySha256, landManifest.source.licence.id, landManifest.source.licence.url, landManifest.source.attribution])
  await fixtureDb.query(`INSERT INTO "RegionRegistryEntry" (id, "registryVersionId", "sourceId", "regionId", "sourceCode", "sourceName", "displayName", "stateCode", "stateName") VALUES ($1, $2, $3, $4, '07339', $5, $5, '07', 'Rheinland-Pfalz') ON CONFLICT ("registryVersionId", "regionId") DO NOTHING`, [entryId, registryId, sourceId, mainz.id, mainz.name])
  await fixtureDb.query(`INSERT INTO "RegionRegistryAlias" (id, "registryEntryId", kind, name, "normalizedName") VALUES ('browser-alias-mainz', $1, 'displayName', 'Mainz-Bingen', 'mainz bingen') ON CONFLICT DO NOTHING`, [entryId])
  const { rows: [{ count }] } = await fixtureDb.query(`SELECT count(*)::int AS count FROM "Plausibility" WHERE "regionId" = $1`, [mainz.id])
  await fixtureDb.query(`INSERT INTO "CatalogueVersion" (id, "countryCode", "runKey", "registryVersionId", "inputFingerprint", "sourceFingerprint", "responseFingerprint", "unionFingerprint", "plausibleRulesVersion", "tileMappingVersion", "observationWindowVersion", "yearFrom", "yearTo", "occurrencePredicates", status, "expectedRegions", "completedRegions", "unionTaxa", "generatedAt", "auditedAt", "activatedAt", "updatedAt") VALUES ($1, 'DE', 'browser-fixture-v1', $2, 'browser-fixture', 'browser-fixture', 'browser-fixture', 'browser-fixture', 1, 1, 1, 2016, 2025, '{"basis":"browser fixture"}', 'active', 1, 1, $3, $4, $4, $4, $4) ON CONFLICT ("countryCode", "runKey") DO UPDATE SET status = 'active', "unionTaxa" = EXCLUDED."unionTaxa", "activatedAt" = EXCLUDED."activatedAt", "updatedAt" = EXCLUDED."updatedAt"`, [catalogueId, registryId, count, now])
  await fixtureDb.query(`INSERT INTO "CatalogueRegionBuild" (id, "catalogueVersionId", "registryVersionId", "registryEntryId", status, "completedAt", "totalObservations", "monthTotals", "regionSize", "nowCounts", "perTile", "rejectedTaxa", "requestStats", "responseFingerprint", "setFingerprint", "updatedAt") VALUES ($1, $2, $3, $4, 'complete', $5, 1, $6, $7, $6, '{"bird":100,"mammal":100,"amphibian":50,"reptile":20,"fish":20,"insect":200,"plant":300,"fungus":139}', '[]', '{}', 'browser-fixture', 'browser-fixture', $5) ON CONFLICT ("catalogueVersionId", "registryEntryId") DO NOTHING`, [buildId, catalogueId, registryId, entryId, now, Array(12).fill(count), count])
  await fixtureDb.query(`INSERT INTO "CatalogueTaxon" ("catalogueVersionId", "taxonId", "createdAt") SELECT $1, "taxonId", $2 FROM "Plausibility" WHERE "regionId" = $3 ON CONFLICT DO NOTHING`, [catalogueId, now, mainz.id])
} finally { await fixtureDb.end() }
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3002'], { stdio: 'inherit', env: { ...process.env, VERCEL: '1', BLOB_READ_WRITE_TOKEN: '', PHOTO_DIR: '/tmp/dex-check-photos', ANTHROPIC_API_KEY: 'check-only', ANTHROPIC_BASE_URL: 'http://127.0.0.1:9', RESEND_API_KEY: 'check-only', RESEND_BASE_URL: 'http://127.0.0.1:9', WEBAUTHN_RP_ID: 'localhost', WEBAUTHN_ORIGIN: base, WEBAUTHN_SECRET: 'check-only-secret-with-at-least-32-characters' } })
const run = (script, args) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [script, ...args], { stdio: 'inherit' })
  child.on('error', reject)
  child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${script} exited ${code}`)))
})
try {
  let ready = false
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error('Production server exited before checks')
    ready = await fetch(`${base}/api/health`).then((r) => r.ok).catch(() => false)
    if (ready) break
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  if (!ready) throw new Error('Production server did not become ready')
  for (const locale of ['en', 'de']) await run('scripts/check/ux.mjs', [base, locale])
  const identity = await fetch(`${base}/api/trpc/identity.me`).then((r) => r.json()).then((j) => j.result.data.json.id)
  await run('scripts/check/offline.mjs', [base, identity])
} finally {
  server.kill('SIGTERM')
  await new Promise((resolve) => { if (server.exitCode !== null) resolve(); else server.once('exit', resolve) })
  const cleanup = new pg.Client({ connectionString: database.href })
  await cleanup.connect()
  try {
    await cleanup.query(`DELETE FROM "Asset" WHERE id IN ('00000000-0000-4000-8100-000000000000', '00000000-0000-4000-8100-000000000001')`)
  } finally { await cleanup.end() }
}
