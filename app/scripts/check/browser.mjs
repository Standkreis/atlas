// Reproduces the CI production-browser suite against a disposable database.
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'
import { stopOwnedProcess } from './owned-process.mjs'
import pg from 'pg'
import landManifest from '../../src/server/data/germany-land.manifest.json' with { type: 'json' }
const database = new URL(process.env.DATABASE_URL ?? '')
if (!['localhost', '127.0.0.1'].includes(database.hostname) || !/^\/dex_check_[a-z0-9_]+$/.test(database.pathname)) throw new Error('Browser tests require a local dex_check_* database')
const port = process.env.BROWSER_PORT || '3002'
if (!/^\d+$/.test(port) || +port < 1024 || +port > 65535) throw new Error('Invalid BROWSER_PORT')
const base = `http://localhost:${port}`
const identityId = randomUUID()
const ownedIdentities = [identityId]
process.env.BROWSER_IDENTITY_ID = identityId
const fullCatalogue = process.env.UX_FULL_CATALOGUE === '1'
// Explicit scoped reruns retain the same guarded setup/restoration. An unset selector runs
// every gate; scoped output must never be reported as a successful full browser suite.
const scenarios = process.env.BROWSER_SCENARIOS?.split(',')
const locales = process.env.BROWSER_LOCALES?.split(',') ?? ['en', 'de']
const supported = ['ux', 'wildness', 'capture-sync', 'scan-transition', 'gallery', 'analytics', 'offline', 'full-gallery', 'full-offline']
if (scenarios?.some(name => !supported.includes(name) || (name.startsWith('full-') && !fullCatalogue))) throw new Error('Invalid BROWSER_SCENARIOS selection')
if (locales.some(locale => !['en', 'de'].includes(locale))) throw new Error('Invalid BROWSER_LOCALES selection')
if (scenarios || process.env.BROWSER_LOCALES) console.log(JSON.stringify({ scopedBrowserRun: scenarios ?? supported.filter(name => fullCatalogue || !name.startsWith('full-')), locales, fullGalleryLocales: ['en', 'de'] }))
// Give the current month's preview taxon two distinct local images. The older non-lead catches
// regressions to createdAt ordering, and its URL is a byte-request sentinel in the browser audit.
const previewAssetIds = ['00000000-0000-4000-8100-000000000000', '00000000-0000-4000-8100-000000000001']
const analyticsSightingId = '00000000-0000-4000-8200-000000000000'
let shiftedPreviewAssets = []
let previewVisibility = []
let previewRestored = false
let oldRegistries = [], oldCatalogues = [], oldMainz = []
const fixtureDb = new pg.Client({ connectionString: database.href })
await fixtureDb.connect()
try {
  await fixtureDb.query('BEGIN')
  const { rows: collisions } = await fixtureDb.query(`SELECT id FROM "Asset" WHERE id = ANY($1::text[]) UNION ALL SELECT id FROM "Sighting" WHERE id = $2`, [previewAssetIds, analyticsSightingId])
  if (collisions.length) throw new Error('Reserved browser fixture IDs already exist; refusing to overwrite')
  await fixtureDb.query('INSERT INTO "Identity" (id) VALUES ($1)', [identityId])
  const { rows: [demo] } = await fixtureDb.query(`SELECT p."taxonId" FROM "Plausibility" p JOIN "Region" r ON r.id = p."regionId"
    WHERE r.name = 'Mainz-Bingen' AND p.peak > 0
    ORDER BY p."monthShare"[EXTRACT(MONTH FROM CURRENT_DATE)::int]::numeric / p.peak DESC LIMIT 1`)
  if (!demo) throw new Error('Mainz-Bingen preview taxon missing')
  await fixtureDb.query(`INSERT INTO "Sighting" (id, "identityId", "taxonId", at, lat, lng, place, note, evidence, wildness, "createdAt") VALUES ($1, $3, $2, NOW(), NULL, NULL, 'Private fixture place', 'Private fixture note', 'claimed', 'wild', NOW())`, [analyticsSightingId, demo.taxonId, identityId])
  // Reviewed galleries fail closed for unreviewed inserted rows. Temporarily remove only this
  // demo's visibility decisions, preserving exact rows for restoration after all browsers exit.
  ;({ rows: previewVisibility } = await fixtureDb.query('DELETE FROM "ReferenceAssetVisibility" WHERE "taxonId" = $1 RETURNING to_json("ReferenceAssetVisibility") AS snapshot', [demo.taxonId]))
  const { rows: existingPreviewAssets } = await fixtureDb.query(`SELECT id, position FROM "Asset" WHERE "taxonId" = $1 ORDER BY id`, [demo.taxonId])
  shiftedPreviewAssets = existingPreviewAssets
  if (shiftedPreviewAssets.length) {
    const shift = 2 - Math.min(...shiftedPreviewAssets.map(({ position }) => position))
    if (shift > 0) await fixtureDb.query(`UPDATE "Asset" SET position = position + $1 WHERE "taxonId" = $2`, [shift, demo.taxonId])
  }
  await fixtureDb.query(`
    INSERT INTO "Asset" (id, kind, url, author, licence, "licenceUrl", "sourceUrl", origin, position, "createdAt", "taxonId")
    SELECT '00000000-0000-4000-8100-00000000000' || image.position, 'image'::"AssetKind", image.url,
      'Browser fixture (mock metadata)', 'CC0 1.0', 'https://creativecommons.org/publicdomain/zero/1.0/',
      'https://atlas-fixture.invalid/source/' || image.position, 'commons', image.position,
      CASE WHEN image.position = 0 THEN NOW() ELSE '2000-01-01'::timestamp END, $1
    FROM (VALUES
      (0, 'https://atlas-fixture.invalid/onboarding-lead-fixture.webp'),
      (1, 'https://atlas-fixture.invalid/onboarding-nonlead-sentinel.webp')
    ) AS image(position, url)
    ON CONFLICT (id) DO UPDATE SET url = EXCLUDED.url, licence = EXCLUDED.licence,
      "licenceUrl" = EXCLUDED."licenceUrl", "sourceUrl" = EXCLUDED."sourceUrl", origin = EXCLUDED.origin,
      position = EXCLUDED.position, "createdAt" = EXCLUDED."createdAt", "taxonId" = EXCLUDED."taxonId"
  `, [demo.taxonId])
  if (fullCatalogue) {
    const { rows: states } = await fixtureDb.query(`SELECT c."expectedRegions", c."completedRegions", c."unionTaxa", count(b.id)::int AS builds FROM "CatalogueVersion" c JOIN "RegionRegistryVersion" v ON v.id = c."registryVersionId" AND v.active JOIN "CatalogueRegionBuild" b ON b."catalogueVersionId" = c.id AND b.status = 'complete' WHERE c."countryCode" = 'DE' AND c.status = 'active' GROUP BY c.id`)
    const state = states[0]
    if (states.length !== 1 || state.expectedRegions !== 362 || state.completedRegions !== 362 || state.builds !== 362 || state.unionTaxa < 1) throw new Error('Full-catalogue browser checks require one active, complete 362-region local catalogue')
    console.log(JSON.stringify({ fullCatalogue: { regions: state.builds, nationalTaxa: state.unionTaxa }, database: database.pathname.slice(1) }))
    const { rows: [{ count }] } = await fixtureDb.query(`SELECT count(*)::int AS count FROM "Plausibility" p JOIN "Region" r ON r.id = p."regionId" WHERE r.name = 'Mainz-Bingen' AND r.status = 'ready'`)
    if (count < 1) throw new Error('Full-catalogue browser checks require activated Mainz-Bingen live rows')
  } else {
    // Add the smallest active, geometry-compatible German catalogue so the ordinary CI suite exercises a ready national summary.
    const now = new Date()
    const { rows: reserved } = await fixtureDb.query(`SELECT id FROM "RegionRegistryVersion" WHERE id = 'browser-registry-de' OR ("countryCode" = 'DE' AND version = $1) UNION ALL SELECT id FROM "CatalogueVersion" WHERE id = 'browser-catalogue-de' OR ("countryCode" = 'DE' AND "runKey" = 'browser-fixture-v1')`, [landManifest.registryVersion])
    if (reserved.length) throw new Error('Reserved browser catalogue already exists')
    ;({ rows: oldMainz } = await fixtureDb.query(`SELECT id, "canonicalKey", "countryCode" FROM "Region" WHERE name = 'Mainz-Bingen'`))
    ;({ rows: oldRegistries } = await fixtureDb.query(`SELECT id, active FROM "RegionRegistryVersion" WHERE "countryCode" = 'DE' AND active`))
    ;({ rows: oldCatalogues } = await fixtureDb.query(`SELECT id, status, "updatedAt"::text FROM "CatalogueVersion" WHERE "countryCode" = 'DE' AND status = 'active'`))
    await fixtureDb.query(`UPDATE "CatalogueVersion" SET status = 'retired' WHERE id = ANY($1::text[])`, [oldCatalogues.map(row => row.id)])
    await fixtureDb.query(`UPDATE "RegionRegistryVersion" SET active = false WHERE id = ANY($1::text[])`, [oldRegistries.map(row => row.id)])
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
  }
  // The seed identity deliberately has no filter. Give the focused queued-scan scenario one
  // active fixture region without depending on the identities created by preceding UX checks.
  const { rows: [scanRegion] } = await fixtureDb.query(`SELECT id FROM "Region" WHERE name = 'Mainz-Bingen' AND status = 'ready' ORDER BY "canonicalKey" NULLS LAST LIMIT 1`)
  if (!scanRegion) throw new Error('Queued-scan browser fixture region missing')
  await fixtureDb.query(`INSERT INTO "Filter" (id, "identityId", "regionId", "regionIds", tiles, "nowOnly", "updatedAt") VALUES ($2, $3, $1, ARRAY[$1]::text[], ARRAY['bird']::"Tile"[], false, NOW())`, [scanRegion.id, randomUUID(), identityId])
  await fixtureDb.query('COMMIT')
} catch (error) {
  await fixtureDb.query('ROLLBACK')
  throw error
} finally { await fixtureDb.end() }
let serverStarted = false, serverOutput = '', serverFailure
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', port], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, VERCEL: '1', VERCEL_ENV: 'production', VERCEL_TARGET_ENV: 'production', BLOB_READ_WRITE_TOKEN: '', PHOTO_DIR: '/tmp/dex-check-photos', ANTHROPIC_API_KEY: 'check-only', ANTHROPIC_BASE_URL: 'http://127.0.0.1:9', RESEND_API_KEY: 'check-only', RESEND_BASE_URL: 'http://127.0.0.1:9', WEBAUTHN_RP_ID: 'localhost', WEBAUTHN_ORIGIN: base, WEBAUTHN_SECRET: 'check-only-secret-with-at-least-32-characters' } })
server.stdout.pipe(process.stdout, { end: false }); server.stderr.pipe(process.stderr, { end: false })
server.stdout.on('data', chunk => { serverOutput = (serverOutput + chunk).slice(-1024); if (serverOutput.includes('Ready in')) serverStarted = true })
server.once('error', error => { serverFailure = error })
const run = async (script, args) => {
  if (scenarios && !scenarios.includes(script.split('/').pop().replace('.mjs', ''))) return
  const journeyIdentity = randomUUID()
  const ownerDb = new pg.Client({ connectionString: database.href })
  await ownerDb.connect()
  try { await ownerDb.query('INSERT INTO "Identity" (id) VALUES ($1)', [journeyIdentity]); ownedIdentities.push(journeyIdentity) }
  finally { await ownerDb.end() }
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], { stdio: 'inherit', env: { ...process.env, BROWSER_JOURNEY_ID: journeyIdentity } })
    child.on('error', reject)
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${script} exited ${code}`)))
  })
}
try {
  let ready = false
  for (let i = 0; i < 100; i++) {
    if (serverFailure) throw serverFailure
    if (server.exitCode !== null) throw new Error('Production server exited before checks')
    ready = serverStarted && await fetch(`${base}/api/health`).then((r) => r.ok).catch(() => false)
    if (ready) break
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  if (!ready) throw new Error('Production server did not become ready')
  for (const locale of locales) await run('scripts/check/ux.mjs', [base, locale])
  for (const locale of locales) await run('scripts/check/wildness.mjs', [base, locale])
  for (const locale of locales) await run('scripts/check/capture-sync.mjs', [base, locale])
  for (const locale of locales) await run('scripts/check/scan-transition.mjs', [base, locale])
  await run('scripts/check/gallery.mjs', [base])
  await run('scripts/check/analytics.mjs', [base])
  await run('scripts/check/offline.mjs', [base, identityId])
  if (fullCatalogue) {
    // The demo taxon may occur in any German region. Restore its real lead before
    // measuring target galleries or deriving the actual region pack's eligible URLs.
    const restore = new pg.Client({ connectionString: database.href })
    await restore.connect()
    try {
      await restore.query('BEGIN')
      await restore.query('DELETE FROM "Asset" WHERE id = ANY($1::text[])', [previewAssetIds])
      for (const row of shiftedPreviewAssets) await restore.query('UPDATE "Asset" SET position = $1 WHERE id = $2', [row.position, row.id])
      for (const row of previewVisibility) await restore.query('INSERT INTO "ReferenceAssetVisibility" SELECT * FROM json_populate_record(NULL::"ReferenceAssetVisibility", $1::json)', [JSON.stringify(row.snapshot)])
      await restore.query('COMMIT')
      previewRestored = true
    } catch (error) { await restore.query('ROLLBACK'); throw error }
    finally { await restore.end() }
    await run('scripts/check/full-gallery.mjs', [base])
    for (const locale of locales) await run('scripts/check/full-offline.mjs', [base, locale])
  }
} finally {
  await stopOwnedProcess(server)
  const cleanup = new pg.Client({ connectionString: database.href })
  try {
    await cleanup.connect()
    await cleanup.query('BEGIN')
    await cleanup.query(`DELETE FROM "Sighting" WHERE id = $1`, [analyticsSightingId])
    await cleanup.query(`DELETE FROM "Asset" WHERE id = ANY($1::text[])`, [previewAssetIds])
    for (const asset of shiftedPreviewAssets) await cleanup.query(`UPDATE "Asset" SET position = $1 WHERE id = $2`, [asset.position, asset.id])
    if (!previewRestored) for (const row of previewVisibility) await cleanup.query('INSERT INTO "ReferenceAssetVisibility" SELECT * FROM json_populate_record(NULL::"ReferenceAssetVisibility", $1::json)', [JSON.stringify(row.snapshot)])
    const restoredAssets = await cleanup.query('SELECT id, position FROM "Asset" WHERE id = ANY($1::text[]) ORDER BY id', [shiftedPreviewAssets.map(row => row.id)])
    assert.deepEqual(restoredAssets.rows, shiftedPreviewAssets, 'original gallery positions restored exactly')
    const restoredVisibility = await cleanup.query('SELECT to_json(v) AS snapshot FROM "ReferenceAssetVisibility" v WHERE "assetId" = ANY($1::text[]) ORDER BY "assetId"', [previewVisibility.map(row => row.snapshot.assetId)])
    assert.deepEqual(restoredVisibility.rows, [...previewVisibility].sort((a, b) => a.snapshot.assetId.localeCompare(b.snapshot.assetId)), 'reviewed visibility restored without timestamp or evidence changes')
    await cleanup.query('DELETE FROM "Identity" WHERE id = ANY($1::text[])', [ownedIdentities])
    if (!fullCatalogue) {
      await cleanup.query(`DELETE FROM "CatalogueTaxon" WHERE "catalogueVersionId" = 'browser-catalogue-de'`)
      await cleanup.query(`DELETE FROM "CatalogueRegionBuild" WHERE "catalogueVersionId" = 'browser-catalogue-de'`)
      await cleanup.query(`DELETE FROM "CatalogueVersion" WHERE id = 'browser-catalogue-de'`)
      await cleanup.query(`DELETE FROM "RegionRegistryAlias" WHERE "registryEntryId" = 'browser-entry-mainz'`)
      await cleanup.query(`DELETE FROM "RegionRegistryEntry" WHERE "registryVersionId" = 'browser-registry-de'`)
      await cleanup.query(`DELETE FROM "RegionRegistrySource" WHERE "registryVersionId" = 'browser-registry-de'`)
      await cleanup.query(`DELETE FROM "RegionRegistryVersion" WHERE id = 'browser-registry-de'`)
      for (const row of oldMainz) await cleanup.query('UPDATE "Region" SET "canonicalKey" = $2, "countryCode" = $3 WHERE id = $1', [row.id, row.canonicalKey, row.countryCode])
      for (const row of oldRegistries) await cleanup.query('UPDATE "RegionRegistryVersion" SET active = $2 WHERE id = $1', [row.id, row.active])
      for (const row of oldCatalogues) await cleanup.query('UPDATE "CatalogueVersion" SET status = $2::"CatalogueStatus", "updatedAt" = $3 WHERE id = $1', [row.id, row.status, row.updatedAt])
    }
    await cleanup.query('COMMIT')
  } catch (error) {
    await cleanup.query('ROLLBACK').catch(rollback => console.error('Browser fixture rollback failed:', rollback))
    console.error('Browser fixture restoration failed:', error)
    process.exitCode = 1
  } finally { await cleanup.end().catch(error => { console.error('Browser fixture disconnect failed:', error); process.exitCode = 1 }) }
}
