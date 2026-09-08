// Reproduces the CI production-browser suite against a disposable database.
import { spawn } from 'node:child_process'
import pg from 'pg'
import landManifest from '../../src/server/data/germany-land.manifest.json' with { type: 'json' }
const database = new URL(process.env.DATABASE_URL ?? '')
if (!['localhost', '127.0.0.1'].includes(database.hostname) || !/^\/dex_check_[a-z0-9_]+$/.test(database.pathname)) throw new Error('Browser tests require a local dex_check_* database')
const base = 'http://localhost:3002'

// The ordinary seed remains a legacy regional fixture. Add the smallest active, geometry-compatible German
// catalogue here so the production-browser suite exercises the ready national summary without network data.
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const now = new Date()
const client = await db.connect()
try {
  await client.query('BEGIN')
  const { rows: [mainz] } = await client.query(`UPDATE "Region" SET "canonicalKey" = 'de-krg-07339', "countryCode" = 'DE' WHERE name = 'Mainz-Bingen' RETURNING id, name`)
  if (!mainz) throw new Error('Mainz-Bingen seed region missing')
  const registryId = 'browser-registry-de'
  const sourceId = 'browser-source-de'
  const entryId = 'browser-entry-mainz'
  const catalogueId = 'browser-catalogue-de'
  const buildId = 'browser-build-mainz'
  await client.query(`INSERT INTO "RegionRegistryVersion" (id, "countryCode", version, "artifactSha256", "expectedRegions", "expectedSourceUnits", active, "activatedAt") VALUES ($1, 'DE', $2, $3, 1, 1, true, $4) ON CONFLICT ("countryCode", version) DO UPDATE SET "artifactSha256" = EXCLUDED."artifactSha256", active = true, "activatedAt" = EXCLUDED."activatedAt"`, [registryId, landManifest.registryVersion, landManifest.registrySha256, now])
  await client.query(`INSERT INTO "RegionRegistrySource" (id, "registryVersionId", role, name, url, "topicDate", "downloadedAt", sha256, "licenceId", "licenceUrl", attribution) VALUES ($1, $2, 'regions', 'Browser fixture from checked-in BKG land artefact', 'local://germany-land', $3, $4, $5, $6, $7, $8) ON CONFLICT ("registryVersionId", role) DO NOTHING`, [sourceId, registryId, landManifest.source.topicDate, now, landManifest.geometrySha256, landManifest.source.licence.id, landManifest.source.licence.url, landManifest.source.attribution])
  await client.query(`INSERT INTO "RegionRegistryEntry" (id, "registryVersionId", "sourceId", "regionId", "sourceCode", "sourceName", "displayName", "stateCode", "stateName") VALUES ($1, $2, $3, $4, '07339', $5, $5, '07', 'Rheinland-Pfalz') ON CONFLICT ("registryVersionId", "regionId") DO NOTHING`, [entryId, registryId, sourceId, mainz.id, mainz.name])
  await client.query(`INSERT INTO "RegionRegistryAlias" (id, "registryEntryId", kind, name, "normalizedName") VALUES ('browser-alias-mainz', $1, 'displayName', 'Mainz-Bingen', 'mainz bingen') ON CONFLICT DO NOTHING`, [entryId])
  const { rows: [{ count }] } = await client.query(`SELECT count(*)::int AS count FROM "Plausibility" WHERE "regionId" = $1`, [mainz.id])
  await client.query(`INSERT INTO "CatalogueVersion" (id, "countryCode", "runKey", "registryVersionId", "inputFingerprint", "sourceFingerprint", "responseFingerprint", "unionFingerprint", "plausibleRulesVersion", "tileMappingVersion", "observationWindowVersion", "yearFrom", "yearTo", "occurrencePredicates", status, "expectedRegions", "completedRegions", "unionTaxa", "generatedAt", "auditedAt", "activatedAt", "updatedAt") VALUES ($1, 'DE', 'browser-fixture-v1', $2, 'browser-fixture', 'browser-fixture', 'browser-fixture', 'browser-fixture', 1, 1, 1, 2016, 2025, '{"basis":"browser fixture"}', 'active', 1, 1, $3, $4, $4, $4, $4) ON CONFLICT ("countryCode", "runKey") DO UPDATE SET status = 'active', "unionTaxa" = EXCLUDED."unionTaxa", "activatedAt" = EXCLUDED."activatedAt", "updatedAt" = EXCLUDED."updatedAt"`, [catalogueId, registryId, count, now])
  await client.query(`INSERT INTO "CatalogueRegionBuild" (id, "catalogueVersionId", "registryVersionId", "registryEntryId", status, "completedAt", "totalObservations", "monthTotals", "regionSize", "nowCounts", "perTile", "rejectedTaxa", "requestStats", "responseFingerprint", "setFingerprint", "updatedAt") VALUES ($1, $2, $3, $4, 'complete', $5, 1, $6, $7, $6, '{"bird":100,"mammal":100,"amphibian":50,"reptile":20,"fish":20,"insect":200,"plant":300,"fungus":139}', '[]', '{}', 'browser-fixture', 'browser-fixture', $5) ON CONFLICT ("catalogueVersionId", "registryEntryId") DO NOTHING`, [buildId, catalogueId, registryId, entryId, now, Array(12).fill(count), count])
  await client.query(`INSERT INTO "CatalogueTaxon" ("catalogueVersionId", "taxonId", "createdAt") SELECT $1, "taxonId", $2 FROM "Plausibility" WHERE "regionId" = $3 ON CONFLICT DO NOTHING`, [catalogueId, now, mainz.id])
  await client.query('COMMIT')
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  client.release()
  await db.end()
}

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
}
