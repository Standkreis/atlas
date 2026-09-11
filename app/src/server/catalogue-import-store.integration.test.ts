import { randomUUID } from 'node:crypto'
import { afterAll, afterEach, describe, expect, it as test, vi } from 'vitest'
import { createSettledTestLifecycle } from './testing/settledTest'
import { Prisma } from '../generated/prisma/client'
import { db } from './db'
import { admitCatalogueWrite, openCatalogueGate, readCatalogueCutoverState, releaseCatalogueWrite } from './catalogueCutoverGate'
import {
  applyCatalogueTargetPlan,
  catalogueTargetSnapshotFingerprint,
  createCatalogueApplyReceipt,
  recoverCatalogueTarget,
  snapshotCatalogueTarget,
  type CatalogueApplyReceipt,
  type CatalogueInboundBatchEvidence,
} from '../../etl/catalogue-import-store'
import {
  cataloguePostgresTimestamp,
  catalogueTargetPlanFingerprint,
  catalogueProtectionScope,
  type CatalogueProtectionScope,
  type CatalogueTargetPlan,
  type CatalogueTargetRow,
  type PlannedCatalogueRowMutation,
  type TargetCatalogueSnapshot,
} from '../../etl/catalogue-import-plan'
import type { ValidatedCatalogueReleaseImport, ValidatedImportEvidence } from '../../etl/catalogue-import-validation'
import { validateReleaseSpotReport, type ReleaseSpotContract } from '../../etl/catalogue-release-spots'
import { CATALOGUE_WRITE_BATCH, CATALOGUE_KEY_BATCH } from '../../etl/catalogue-import-batches'
import { withCatalogueTelemetry, type CatalogueTelemetryEvent } from '../../etl/catalogue-import-telemetry'

const sourceEvidence: ValidatedImportEvidence = { files: [], tables: [], decodedFingerprint: '1'.repeat(64) }
const assertStillValid = vi.fn(async () => undefined)
const assertReleaseEvidenceStillValid = vi.fn(async () => undefined)
const validated = { pins: {}, tables: new Map(), evidence: sourceEvidence, releaseEvidence: [], assertStillValid,
  assertReleaseEvidenceStillValid } as unknown as ValidatedCatalogueReleaseImport

const ids = new Set<string>()
const lifecycle = createSettledTestLifecycle()
// Full-data apply+recover measured 48.95s after #94; the largest body exercises three cases.
// Our 180s deadline still fails a slow test, but only after its bounded SQL work has settled.
// Disable Vitest's competing timeout race for this suite so it cannot start cleanup mid-write.
const STORE_TEST_BUDGET_MS = 180_000
function it(name: string, body: () => Promise<void>, budgetMs = STORE_TEST_BUDGET_MS) {
  return test(name, () => lifecycle.run(body, budgetMs), 0)
}

function table(snapshot: TargetCatalogueSnapshot, name: string) { return snapshot.tables.get(name) ?? [] }
function byId(snapshot: TargetCatalogueSnapshot, name: string, id: string) {
  const row = table(snapshot, name).find((candidate) => candidate.id === id)
  if (!row) throw new Error(`fixture lacks ${name} ${id}`)
  return row
}

function plan(
  snapshot: TargetCatalogueSnapshot,
  mutations: readonly PlannedCatalogueRowMutation[],
  protectedTables: readonly string[] = [],
  identifiers?: Readonly<{ catalogueVersionId: string, registryVersionId: string }>,
  exactProtectedScopes: readonly CatalogueProtectionScope[] = [],
): CatalogueTargetPlan {
  const protectedScopes = [...protectedTables.map((name) => catalogueProtectionScope(name, table(snapshot, name))), ...exactProtectedScopes]
  const unsigned = {
    schemaVersion: 1,
    catalogueVersionId: identifiers?.catalogueVersionId ?? `catalogue-${randomUUID()}`,
    registryVersionId: identifiers?.registryVersionId ?? `registry-${randomUUID()}`,
    sourceEvidence,
    targetSnapshotFingerprint: catalogueTargetSnapshotFingerprint(snapshot),
    mappings: { taxonIdBySourceId: new Map(), regionIdBySourceId: new Map(), sourceAssetIdToTargetId: new Map() },
    protectedScopes,
    mutations,
    summary: { mutations: mutations.length },
  } as const
  return { ...unsigned, fingerprint: catalogueTargetPlanFingerprint(unsigned) }
}

function receipt(targetPlan: CatalogueTargetPlan) {
  const operationId = `issue-63-store-${randomUUID()}`
  return createCatalogueApplyReceipt({ operationId, plan: targetPlan, validated, createdAt: '2026-09-11T05:00:00.000Z' })
}

async function fixture() {
  const oldRegionId = randomUUID(), newRegionId = randomUUID(), taxonId = randomUUID(), identityId = randomUUID()
  ;[oldRegionId, newRegionId, taxonId, identityId].forEach((id) => ids.add(id))
  await db.region.create({ data: { id: oldRegionId, gadmGid: `fixture-${oldRegionId}`, name: 'Legacy region', higher: 'Fixture', status: 'ready' } })
  await db.taxon.create({ data: { id: taxonId, gbifKey: -Math.floor(Math.random() * 1_000_000_000), sciName: 'Storeus fixture', rank: 'species', tile: 'bird' } })
  await db.identity.create({ data: { id: identityId } })
  await db.filter.create({ data: { identityId, regionId: oldRegionId, regionIds: [oldRegionId], tiles: ['bird'] } })
  const snapshot = await snapshotCatalogueTarget(db)
  const oldRegion = byId(snapshot, 'Region', oldRegionId)
  const beforeFilter = table(snapshot, 'Filter').find((row) => row.identityId === identityId)!
  const newRegion: CatalogueTargetRow = {
    ...oldRegion,
    id: newRegionId,
    gadmGid: null,
    canonicalKey: `de-fixture-${newRegionId}`,
    countryCode: 'DE',
    name: 'Current region',
  }
  const afterFilter: CatalogueTargetRow = { ...beforeFilter, regionId: newRegionId, regionIds: [newRegionId] }
  const mutations: PlannedCatalogueRowMutation[] = [
    { phase: 'materialize', table: 'Region', key: { id: newRegionId }, before: null, after: newRegion },
    { phase: 'publish', table: 'Filter', key: { id: beforeFilter.id as string }, before: beforeFilter, after: afterFilter },
  ]
  return { snapshot, oldRegionId, newRegionId, taxonId, identityId, beforeFilter, afterFilter, newRegion, mutations }
}

async function forceOpen() {
  await db.catalogueWriteAdmission.deleteMany({ where: { countryCode: 'DE' } })
  const gate = await db.catalogueCutoverGate.findUnique({ where: { countryCode: 'DE' } })
  if (gate?.state === 'maintenance' && gate.operationId) await db.$transaction((tx) => openCatalogueGate(tx, { operationId: gate.operationId! }))
}

afterEach(async () => {
  await lifecycle.settle()
  await forceOpen()
  await db.scanWork.deleteMany({ where: { OR: [...ids].map((id) => ({ identityId: id })) } })
  await db.filter.deleteMany({ where: { identityId: { in: [...ids] } } })
  await db.sighting.deleteMany({ where: { OR: [{ identityId: { in: [...ids] } }, { taxonId: { in: [...ids] } }] } })
  await db.study.deleteMany({ where: { OR: [{ identityId: { in: [...ids] } }, { taxonId: { in: [...ids] } }] } })
  await db.asset.deleteMany({ where: { OR: [{ id: { in: [...ids] } }, { taxonId: { in: [...ids] } }, { ownerId: { in: [...ids] } }] } })
  await db.lookalike.deleteMany({ where: { OR: [{ regionId: { in: [...ids] } }, { taxonId: { in: [...ids] } }, { siblingId: { in: [...ids] } }] } })
  await db.plausibility.deleteMany({ where: { OR: [{ regionId: { in: [...ids] } }, { taxonId: { in: [...ids] } }] } })
  await db.identity.deleteMany({ where: { id: { in: [...ids] } } })
  await db.region.deleteMany({ where: { id: { in: [...ids] } } })
  await db.taxon.deleteMany({ where: { id: { in: [...ids] } } })
  await db.catalogueVersion.deleteMany({ where: { id: { in: [...ids] } } })
  await db.regionRegistrySource.deleteMany({ where: { id: { in: [...ids] } } })
  await db.regionRegistryVersion.deleteMany({ where: { id: { in: [...ids] } } })
  ids.clear(); assertStillValid.mockClear(); assertReleaseEvidenceStillValid.mockClear()
})

afterAll(async () => { await db.$disconnect() })

describe('checked catalogue import store', () => {
  it('bounds Unicode writes and keyed reads, preserves exact snapshots through failed and successful apply/inverse', async () => {
    const f = await fixture()
    // Long, valid text primary keys make the real 4 MiB read boundary observable with few rows.
    const newIds = Array.from({ length: 2_200 }, () => `${randomUUID()}-${'k'.repeat(1_970)}`)
    newIds.forEach((id) => ids.add(id))
    const oldRegion = byId(f.snapshot, 'Region', f.oldRegionId)
    const mutations: PlannedCatalogueRowMutation[] = newIds.map((id, index) => ({
      phase: 'materialize', table: 'Region', key: { id }, before: null,
      after: { ...oldRegion, id, gadmGid: null, canonicalKey: null, name: `Größe 水 🦊 ${index}` },
    }))
    const targetPlan = plan(f.snapshot, mutations, ['Identity', 'Filter', 'Taxon', 'Asset'])
    const applyReceipt = receipt(targetPlan), baseline = catalogueTargetSnapshotFingerprint(f.snapshot)
    const events: CatalogueTelemetryEvent[] = []
    const capture = <T>(work: () => Promise<T>) => withCatalogueTelemetry((event) => events.push(event), work)
    const fail = async () => { throw new Error('injected multi-batch failure') }
    await expect(capture(() => applyCatalogueTargetPlan(db, {
      validated, plan: targetPlan, receipt: applyReceipt, faultInjection: { afterWrites: fail },
    }))).rejects.toThrow('injected multi-batch failure')
    expect(catalogueTargetSnapshotFingerprint(await snapshotCatalogueTarget(db))).toBe(baseline)
    expect(await readCatalogueCutoverState(db)).toMatchObject({ state: 'maintenance', activeWrites: 0 })
    await capture(() => applyCatalogueTargetPlan(db, { validated, plan: targetPlan, receipt: applyReceipt }))
    const appliedSnapshot = await snapshotCatalogueTarget(db)
    const applied = catalogueTargetSnapshotFingerprint(appliedSnapshot)
    expect(applied).not.toBe(baseline)
    const importedIds = new Set(newIds)
    const keyedProtection = catalogueProtectionScope('Region', table(appliedSnapshot, 'Region').filter((row) => importedIds.has(row.id as string)), {
      kind: 'keys', keys: [...newIds].reverse().map((id) => ({ id })),
    })
    const protectionPlan = plan(appliedSnapshot, [], [], undefined, [keyedProtection])
    await capture(() => applyCatalogueTargetPlan(db, { validated, plan: protectionPlan, receipt: receipt(protectionPlan) }))
    const partialProtection = catalogueProtectionScope('Region',
      table(appliedSnapshot, 'Region').filter((row) => importedIds.has(row.id as string)).map(({ name }) => ({ name })),
      keyedProtection.selector)
    const partialPlan = plan(appliedSnapshot, [], [], undefined, [partialProtection])
    await capture(() => applyCatalogueTargetPlan(db, { validated, plan: partialPlan, receipt: receipt(partialPlan) }))
    await expect(capture(() => recoverCatalogueTarget(db, { receipt: applyReceipt, faultInjection: { afterWrites: fail } })))
      .rejects.toThrow('injected multi-batch failure')
    expect(catalogueTargetSnapshotFingerprint(await snapshotCatalogueTarget(db))).toBe(applied)
    await capture(() => recoverCatalogueTarget(db, { receipt: applyReceipt }))
    expect(catalogueTargetSnapshotFingerprint(await snapshotCatalogueTarget(db))).toBe(baseline)
    expect(await readCatalogueCutoverState(db)).toMatchObject({ state: 'open', activeWrites: 0 })
    for (const operation of ['upsert', 'delete', 'keyed-read', 'scope-read'] as const) {
      const batches = events.filter((event) => event.event === 'batch' && event.operation === operation && event.table === 'Region')
      expect(batches.length).toBeGreaterThan(1)
      const limits = operation === 'keyed-read' || operation === 'scope-read' ? CATALOGUE_KEY_BATCH : CATALOGUE_WRITE_BATCH
      expect(batches.every((batch) => batch.inputRows <= limits.maxRows && batch.inputJsonBytes <= limits.maxBytes)).toBe(true)
    }
    expect(JSON.stringify(events)).not.toContain(newIds[0])
    expect(JSON.stringify(events)).not.toContain('Größe')

    const oversizedPlan = plan(f.snapshot, [{ ...mutations[0]!, after: { ...mutations[0]!.after, name: '🦊'.repeat(CATALOGUE_WRITE_BATCH.maxBytes / 4) } }])
    await expect(applyCatalogueTargetPlan(db, { validated, plan: oversizedPlan, receipt: receipt(oversizedPlan) })).rejects.toThrow('exceeds 4194304 UTF-8 JSON bytes')
    expect(catalogueTargetSnapshotFingerprint(await snapshotCatalogueTarget(db))).toBe(baseline)
    expect(await readCatalogueCutoverState(db)).toMatchObject({ state: 'maintenance' })
  })

  it('uses the bounded nationwide budget on every long path without extending short gate transactions', async () => {
    const f = await fixture(), targetPlan = plan(f.snapshot, f.mutations), applyReceipt = receipt(targetPlan)
    const transactions = vi.spyOn(db, '$transaction')
    try {
      await snapshotCatalogueTarget(db)
      await applyCatalogueTargetPlan(db, { validated, plan: targetPlan, receipt: applyReceipt })
      await recoverCatalogueTarget(db, { receipt: applyReceipt })
      const repeatable = { isolationLevel: 'RepeatableRead', timeout: 600_000, maxWait: 30_000 }
      const serializable = { isolationLevel: 'Serializable', timeout: 600_000, maxWait: 30_000 }
      expect(transactions.mock.calls.map((call) => call[1])).toEqual([
        repeatable,
        undefined, serializable, repeatable, undefined,
        undefined, serializable, repeatable, undefined,
      ])
    } finally { transactions.mockRestore() }
    expect(catalogueTargetSnapshotFingerprint(await snapshotCatalogueTarget(db))).toBe(catalogueTargetSnapshotFingerprint(f.snapshot))
  })

  it('survives more than 120 seconds of short SQL operations and still rolls back an injected failure', async () => {
    const f = await fixture(), targetPlan = plan(f.snapshot, f.mutations), applyReceipt = receipt(targetPlan)
    let completedShortStatements = 0
    let elapsedMs = 0
    await expect(applyCatalogueTargetPlan(db, { validated, plan: targetPlan, receipt: applyReceipt,
      faultInjection: { afterWrites: async (tx) => {
        const started = performance.now()
        // Neither statement reaches statement_timeout. Together they exceed the old aggregate
        // deadline using real PostgreSQL time, not fake timers or a mocked transaction client.
        for (let index = 0; index < 2; index++) {
          await tx.$queryRawUnsafe('SELECT pg_sleep(61)::text AS waited')
          completedShortStatements++
        }
        elapsedMs = performance.now() - started
        const [limits] = await tx.$queryRawUnsafe<{ statementBound: boolean, lockBound: boolean }[]>(
          `SELECT current_setting('statement_timeout')::interval = interval '120 seconds' AS "statementBound",
                  current_setting('lock_timeout')::interval = interval '30 seconds' AS "lockBound"`)
        expect(limits).toEqual({ statementBound: true, lockBound: true })
        throw new Error('injected failure after the old aggregate deadline')
      } } })).rejects.toThrow('injected failure after the old aggregate deadline')
    expect(completedShortStatements).toBe(2)
    expect(elapsedMs).toBeGreaterThan(120_000)
    expect(await db.region.findUnique({ where: { id: f.newRegionId } })).toBeNull()
    expect(await db.filter.findUniqueOrThrow({ where: { identityId: f.identityId } })).toMatchObject({ regionId: f.oldRegionId })
    expect(await readCatalogueCutoverState(db)).toMatchObject({ state: 'maintenance', activeWrites: 0 })
    expect(catalogueTargetSnapshotFingerprint(await snapshotCatalogueTarget(db))).toBe(catalogueTargetSnapshotFingerprint(f.snapshot))
  }, 360_000)

  it('captures all fixed target tables with raw timestamp strings and a non-mutating map facade', async () => {
    const rowId = randomUUID(); ids.add(rowId)
    await db.region.create({ data: { id: rowId, name: 'Snapshot region', higher: 'Fixture' } })
    const snapshot = await snapshotCatalogueTarget(db)
    expect(snapshot.tables.size).toBe(31)
    expect(typeof byId(snapshot, 'Region', rowId).createdAt).toBe('string')
    expect('set' in snapshot.tables).toBe(false)
    expect(() => (snapshot.tables as Map<string, unknown>).set('Region', [])).toThrow()
    expect(catalogueTargetSnapshotFingerprint(snapshot)).toMatch(/^[a-f\d]{64}$/)
  })

  it('uses an indexed or hashed equality plan when reading ten thousand catalogue keys', async () => {
    const prefix = `store-key-plan-${randomUUID()}`
    const rows = Array.from({ length: 10_000 }, (_, index) => ({
      id: randomUUID(),
      canonicalKey: `${prefix}-${index}`,
      countryCode: 'DE',
      name: `Key plan ${index}`,
      higher: 'Fixture',
      status: 'ready' as const,
    }))
    try {
      for (let index = 0; index < rows.length; index += 1_000) {
        await db.region.createMany({ data: rows.slice(index, index + 1_000) })
      }
      const keys = rows.map(({ id }) => ({ id }))
      const explained = await db.$queryRawUnsafe<Record<string, unknown>[]>(
        `EXPLAIN (ANALYZE, FORMAT JSON) SELECT count(*) FROM "Region" t
         JOIN jsonb_populate_recordset(NULL::"Region", $1::jsonb) k ON t.id = k.id`,
        JSON.stringify(keys),
      )
      const planText = JSON.stringify(explained[0]?.['QUERY PLAN'])
      expect(planText).toMatch(/"Node Type":"(?:Hash Join|Index(?: Only)? Scan)"/)
      expect(planText).not.toContain('Join Filter')
      expect(planText).toContain('Actual Rows":10000')
    } finally {
      await db.region.deleteMany({ where: { canonicalKey: { startsWith: prefix } } })
    }
  }, 30_000)

  it('atomically applies, verifies, opens, and exactly recovers while preserving personal rows', async () => {
    const f = await fixture()
    const targetPlan = plan(f.snapshot, f.mutations, ['Identity', 'Sighting'])
    const applyReceipt = receipt(targetPlan)
    await applyCatalogueTargetPlan(db, { validated, plan: targetPlan, receipt: applyReceipt })
    expect(assertReleaseEvidenceStillValid).toHaveBeenCalledTimes(2)
    expect(await db.region.findUnique({ where: { id: f.newRegionId } })).toMatchObject({ name: 'Current region' })
    expect(await db.filter.findUniqueOrThrow({ where: { identityId: f.identityId } })).toMatchObject({ regionId: f.newRegionId, regionIds: [f.newRegionId] })
    expect(await readCatalogueCutoverState(db)).toMatchObject({ state: 'open', activeWrites: 0 })

    await recoverCatalogueTarget(db, { receipt: applyReceipt })
    expect(await db.region.findUnique({ where: { id: f.newRegionId } })).toBeNull()
    expect(await db.filter.findUniqueOrThrow({ where: { identityId: f.identityId } })).toMatchObject({ regionId: f.oldRegionId, regionIds: [f.oldRegionId] })
    expect(await db.identity.findUnique({ where: { id: f.identityId } })).not.toBeNull()
    expect(await readCatalogueCutoverState(db)).toMatchObject({ state: 'open', activeWrites: 0 })
  })

  it('retires active registry and catalogue rows before activating successors, including during recovery', async () => {
    const oldRegistryId = randomUUID(), newRegistryId = randomUUID(), oldCatalogueId = randomUUID(), newCatalogueId = randomUUID()
    ;[oldRegistryId, newRegistryId, oldCatalogueId, newCatalogueId].forEach((id) => ids.add(id))
    const countryCode = `test-${randomUUID()}`
    await db.regionRegistryVersion.createMany({ data: [
      {
        id: oldRegistryId,
        countryCode,
        version: `old-${randomUUID()}`,
        artifactSha256: 'a'.repeat(64),
        expectedRegions: 1,
        expectedSourceUnits: 1,
        active: true,
        activatedAt: new Date('2026-09-10T00:00:00.000Z'),
      },
      {
        id: newRegistryId,
        countryCode,
        version: `new-${randomUUID()}`,
        artifactSha256: 'b'.repeat(64),
        expectedRegions: 1,
        expectedSourceUnits: 1,
      },
    ] })
    const completeCatalogue = {
      countryCode,
      inputFingerprint: 'c'.repeat(64),
      sourceFingerprint: 'd'.repeat(64),
      responseFingerprint: 'e'.repeat(64),
      unionFingerprint: 'f'.repeat(64),
      plausibleRulesVersion: 1,
      tileMappingVersion: 1,
      observationWindowVersion: 1,
      yearFrom: 2021,
      yearTo: 2025,
      occurrencePredicates: { fixture: true },
      expectedRegions: 1,
      completedRegions: 1,
      unionTaxa: 1,
      generatedAt: new Date('2026-09-10T00:00:00.000Z'),
      auditedAt: new Date('2026-09-10T01:00:00.000Z'),
    } as const
    await db.catalogueVersion.createMany({ data: [
      {
        ...completeCatalogue,
        id: oldCatalogueId,
        runKey: `old-${randomUUID()}`,
        registryVersionId: oldRegistryId,
        status: 'active',
        activatedAt: new Date('2026-09-10T02:00:00.000Z'),
      },
      {
        ...completeCatalogue,
        id: newCatalogueId,
        runKey: `new-${randomUUID()}`,
        registryVersionId: newRegistryId,
        status: 'audited',
      },
    ] })
    const snapshot = await snapshotCatalogueTarget(db)
    const oldRegistry = byId(snapshot, 'RegionRegistryVersion', oldRegistryId)
    const newRegistry = byId(snapshot, 'RegionRegistryVersion', newRegistryId)
    const oldCatalogue = byId(snapshot, 'CatalogueVersion', oldCatalogueId)
    const newCatalogue = byId(snapshot, 'CatalogueVersion', newCatalogueId)
    const mutations: PlannedCatalogueRowMutation[] = [
      {
        phase: 'publish',
        table: 'RegionRegistryVersion',
        key: { id: oldRegistryId },
        before: oldRegistry,
        after: { ...oldRegistry, active: false },
      },
      {
        phase: 'publish',
        table: 'RegionRegistryVersion',
        key: { id: newRegistryId },
        before: newRegistry,
        after: { ...newRegistry, active: true, activatedAt: oldRegistry.activatedAt },
      },
      {
        phase: 'publish',
        table: 'CatalogueVersion',
        key: { id: oldCatalogueId },
        before: oldCatalogue,
        after: { ...oldCatalogue, status: 'retired' },
      },
      {
        phase: 'publish',
        table: 'CatalogueVersion',
        key: { id: newCatalogueId },
        before: newCatalogue,
        after: { ...newCatalogue, status: 'active', activatedAt: oldCatalogue.activatedAt },
      },
    ]
    const targetPlan = plan(snapshot, mutations, [], { catalogueVersionId: newCatalogueId, registryVersionId: newRegistryId })
    const applyReceipt = receipt(targetPlan)

    await applyCatalogueTargetPlan(db, { validated, plan: targetPlan, receipt: applyReceipt })
    expect(await db.regionRegistryVersion.findUniqueOrThrow({ where: { id: oldRegistryId } })).toMatchObject({ active: false })
    expect(await db.regionRegistryVersion.findUniqueOrThrow({ where: { id: newRegistryId } })).toMatchObject({ active: true })
    expect(await db.catalogueVersion.findUniqueOrThrow({ where: { id: oldCatalogueId } })).toMatchObject({ status: 'retired' })
    expect(await db.catalogueVersion.findUniqueOrThrow({ where: { id: newCatalogueId } })).toMatchObject({ status: 'active' })

    await recoverCatalogueTarget(db, { receipt: applyReceipt })
    expect(await db.regionRegistryVersion.findUniqueOrThrow({ where: { id: oldRegistryId } })).toMatchObject({ active: true })
    expect(await db.regionRegistryVersion.findUniqueOrThrow({ where: { id: newRegistryId } })).toMatchObject({ active: false })
    expect(await db.catalogueVersion.findUniqueOrThrow({ where: { id: oldCatalogueId } })).toMatchObject({ status: 'active' })
    expect(await db.catalogueVersion.findUniqueOrThrow({ where: { id: newCatalogueId } })).toMatchObject({ status: 'audited' })
  })

  it('recovers an inserted row updated during publication while ignoring its operation-owned references', async () => {
    const registryVersionId = randomUUID(), sourceId = randomUUID()
    ;[registryVersionId, sourceId].forEach((id) => ids.add(id))
    const snapshot = await snapshotCatalogueTarget(db)
    const importedAt = cataloguePostgresTimestamp('2026-09-11T05:00:00.000Z')
    const inactiveRegistry: CatalogueTargetRow = {
      id: registryVersionId,
      countryCode: `test-${randomUUID()}`,
      version: `recovery-index-${randomUUID()}`,
      artifactSha256: 'a'.repeat(64),
      expectedRegions: 0,
      expectedSourceUnits: 0,
      active: false,
      importedAt,
      activatedAt: null,
    }
    const activeRegistry: CatalogueTargetRow = { ...inactiveRegistry, active: true, activatedAt: importedAt }
    const registrySource: CatalogueTargetRow = {
      id: sourceId,
      registryVersionId,
      role: 'regions',
      name: 'Recovery index fixture',
      url: 'https://example.test/recovery-index.json',
      topicDate: '2026-09-11',
      downloadedAt: importedAt,
      sha256: 'b'.repeat(64),
      licenceId: 'test-only',
      licenceUrl: null,
      attribution: 'Test fixture',
      metadata: null,
    }
    const mutations: PlannedCatalogueRowMutation[] = [
      { phase: 'materialize', table: 'RegionRegistryVersion', key: { id: registryVersionId }, before: null, after: inactiveRegistry },
      { phase: 'materialize', table: 'RegionRegistrySource', key: { id: sourceId }, before: null, after: registrySource },
      { phase: 'publish', table: 'RegionRegistryVersion', key: { id: registryVersionId }, before: inactiveRegistry, after: activeRegistry },
    ]
    const targetPlan = plan(snapshot, mutations, [], { catalogueVersionId: randomUUID(), registryVersionId })
    const applyReceipt = receipt(targetPlan)

    await applyCatalogueTargetPlan(db, { validated, plan: targetPlan, receipt: applyReceipt })
    expect(await db.regionRegistryVersion.findUniqueOrThrow({ where: { id: registryVersionId } })).toMatchObject({ active: true })
    expect(await db.regionRegistrySource.findUniqueOrThrow({ where: { id: sourceId } })).toMatchObject({ registryVersionId })

    await recoverCatalogueTarget(db, { receipt: applyReceipt })
    expect(await db.regionRegistrySource.findUnique({ where: { id: sourceId } })).toBeNull()
    expect(await db.regionRegistryVersion.findUnique({ where: { id: registryVersionId } })).toBeNull()
  })

  it('leaves maintenance closed and writes nothing while an admitted write has not drained', async () => {
    const f = await fixture(), targetPlan = plan(f.snapshot, f.mutations), applyReceipt = receipt(targetPlan)
    const admission = await admitCatalogueWrite(db, 'store-test-held-write', { identityId: f.identityId })
    await expect(applyCatalogueTargetPlan(db, { validated, plan: targetPlan, receipt: applyReceipt })).rejects.toThrow('drain is not empty')
    expect(await db.region.findUnique({ where: { id: f.newRegionId } })).toBeNull()
    expect(await readCatalogueCutoverState(db)).toMatchObject({ state: 'maintenance', activeWrites: 1 })
    await releaseCatalogueWrite(db, admission.id)
  })

  it('rejects representative availability that expires after drain without applying product mutations', async () => {
    const { snapshot, mutations, newRegionId, beforeFilter } = await fixture()
    const targetPlan = plan(snapshot, mutations), applyReceipt = receipt(targetPlan)
    const url = 'https://static.inaturalist.org/photos/1/medium.jpg', at = '2026-09-11T00:00:00.000Z'
    const contract: ReleaseSpotContract = { catalogueId: 'fixture', unionFingerprint: '1'.repeat(64), contentFingerprint: '2'.repeat(64),
      sourceFilesFingerprint: '3'.repeat(64), sourcePinsFingerprint: '4'.repeat(64), auditUrlReportSha256: '5'.repeat(64),
      fullTargetsFingerprint: '6'.repeat(64), reviewedTargetsFingerprint: '7'.repeat(64), targets: [{ assetId: 'fixture', url }] }
    const report = { schemaVersion: 1, kind: 'catalogue-release-image-spots', contract, generatedAt: at,
      checks: [{ url, checkedAt: at, ok: true, method: 'HEAD', status: 200, contentType: 'image/jpeg', finalUrl: url, reason: null }],
      attempted: 1, networkRequests: 1, reused: 0, limitation: 'HTTP only' }
    assertReleaseEvidenceStillValid
      .mockImplementationOnce(async () => { validateReleaseSpotReport(report, contract, new Date('2026-09-11T23:59:59.999Z')) })
      .mockImplementationOnce(async () => { validateReleaseSpotReport(report, contract, new Date('2026-09-12T00:00:00.000Z')) })
    await expect(applyCatalogueTargetPlan(db, { validated, plan: targetPlan, receipt: applyReceipt })).rejects.toThrow('stale')
    expect(assertReleaseEvidenceStillValid).toHaveBeenCalledTimes(2)
    expect(await db.region.findUnique({ where: { id: newRegionId } })).toBeNull()
    expect((await db.filter.findUniqueOrThrow({ where: { id: String(beforeFilter.id) } })).regionId).toBe(beforeFilter.regionId)
    expect((await readCatalogueCutoverState(db)).state).toBe('maintenance')
    expect(catalogueTargetSnapshotFingerprint(await snapshotCatalogueTarget(db))).toBe(catalogueTargetSnapshotFingerprint(snapshot))
  })

  it('fails closed when the complete target snapshot or a scoped before-image is stale', async () => {
    const f = await fixture(), targetPlan = plan(f.snapshot, f.mutations), applyReceipt = receipt(targetPlan)
    await db.identity.update({ where: { id: f.identityId }, data: { displayName: 'changed after plan' } })
    await expect(applyCatalogueTargetPlan(db, { validated, plan: targetPlan, receipt: applyReceipt })).rejects.toThrow('complete target snapshot changed')
    expect(await db.region.findUnique({ where: { id: f.newRegionId } })).toBeNull()
    expect(await readCatalogueCutoverState(db)).toMatchObject({ state: 'maintenance' })
  })

  it('rolls the serializable transaction back on an injected write failure', async () => {
    const f = await fixture(), targetPlan = plan(f.snapshot, f.mutations), applyReceipt = receipt(targetPlan)
    let transactionLimits: { statementBound: boolean, lockBound: boolean } | undefined
    await expect(applyCatalogueTargetPlan(db, { validated, plan: targetPlan, receipt: applyReceipt,
      faultInjection: { afterWrites: async (tx) => {
        ;[transactionLimits] = await tx.$queryRawUnsafe<{ statementBound: boolean, lockBound: boolean }[]>(
          `SELECT current_setting('statement_timeout')::interval = interval '120 seconds' AS "statementBound",
                  current_setting('lock_timeout')::interval = interval '30 seconds' AS "lockBound"`)
        throw new Error('injected transaction failure')
      } } })).rejects.toThrow('injected transaction failure')
    expect(transactionLimits).toEqual({ statementBound: true, lockBound: true })
    expect(await db.region.findUnique({ where: { id: f.newRegionId } })).toBeNull()
    expect(await db.filter.findUniqueOrThrow({ where: { identityId: f.identityId } })).toMatchObject({ regionId: f.oldRegionId })
    expect(await readCatalogueCutoverState(db)).toMatchObject({ state: 'maintenance' })
  })

  it('keeps the gate closed when post-commit verification observes drift', async () => {
    const f = await fixture(), targetPlan = plan(f.snapshot, f.mutations), applyReceipt = receipt(targetPlan)
    await expect(applyCatalogueTargetPlan(db, { validated, plan: targetPlan, receipt: applyReceipt,
      faultInjection: { afterCommit: async () => { await db.region.update({ where: { id: f.newRegionId }, data: { name: 'post-commit drift' } }) } } })).rejects.toThrow('after-image mismatch')
    expect(await db.filter.findUniqueOrThrow({ where: { identityId: f.identityId } })).toMatchObject({ regionId: f.newRegionId })
    expect(await readCatalogueCutoverState(db)).toMatchObject({ state: 'maintenance' })
  })

  it('rejects recovery after an owned after-image gains newer user state', async () => {
    const f = await fixture(), targetPlan = plan(f.snapshot, f.mutations), applyReceipt = receipt(targetPlan)
    await applyCatalogueTargetPlan(db, { validated, plan: targetPlan, receipt: applyReceipt })
    await db.filter.update({ where: { identityId: f.identityId }, data: { nowOnly: true } })
    await expect(recoverCatalogueTarget(db, { receipt: applyReceipt })).rejects.toThrow('after-image mismatch')
    expect(await db.region.findUnique({ where: { id: f.newRegionId } })).not.toBeNull()
    expect(await readCatalogueCutoverState(db)).toMatchObject({ state: 'maintenance' })
  })

  it('deletes and restores an enumerated live Plausibility/Lookalike pair in dependency-safe order', async () => {
    const f = await fixture(), siblingId = randomUUID(), plausibilityId = randomUUID(), siblingPlausibilityId = randomUUID()
    ;[siblingId, plausibilityId, siblingPlausibilityId].forEach((id) => ids.add(id))
    await db.taxon.create({ data: { id: siblingId, gbifKey: -Math.floor(Math.random() * 1_000_000_000), sciName: 'Storeus sibling', rank: 'species', tile: 'bird' } })
    await db.plausibility.createMany({ data: [
      { id: plausibilityId, taxonId: f.taxonId, regionId: f.oldRegionId, obs: 2, monthShare: Array(12).fill(1), peak: 1, words: 'all year' },
      { id: siblingPlausibilityId, taxonId: siblingId, regionId: f.oldRegionId, obs: 2, monthShare: Array(12).fill(1), peak: 1, words: 'all year' },
    ] })
    await db.lookalike.create({ data: { taxonId: f.taxonId, siblingId, regionId: f.oldRegionId } })
    const snapshot = await snapshotCatalogueTarget(db)
    const beforePlausibility = byId(snapshot, 'Plausibility', plausibilityId)
    const beforeLookalike = table(snapshot, 'Lookalike').find((row) => row.taxonId === f.taxonId && row.siblingId === siblingId)!
    const mutations: PlannedCatalogueRowMutation[] = [
      { phase: 'publish', table: 'Plausibility', key: { id: plausibilityId }, before: beforePlausibility, after: null },
      { phase: 'publish', table: 'Lookalike', key: { taxonId: f.taxonId, regionId: f.oldRegionId, siblingId }, before: beforeLookalike, after: null },
    ]
    const targetPlan = plan(snapshot, mutations), applyReceipt = receipt(targetPlan)
    await applyCatalogueTargetPlan(db, { validated, plan: targetPlan, receipt: applyReceipt })
    expect(await db.plausibility.findUnique({ where: { id: plausibilityId } })).toBeNull()
    expect(await db.lookalike.findUnique({ where: { taxonId_regionId_siblingId: { taxonId: f.taxonId, regionId: f.oldRegionId, siblingId } } })).toBeNull()
    await recoverCatalogueTarget(db, { receipt: applyReceipt })
    expect(await db.plausibility.findUnique({ where: { id: plausibilityId } })).not.toBeNull()
    expect(await db.lookalike.findUnique({ where: { taxonId_regionId_siblingId: { taxonId: f.taxonId, regionId: f.oldRegionId, siblingId } } })).not.toBeNull()
  })

  it('does not delete a newly imported Taxon after a new Sighting references it', async () => {
    const f = await fixture(), newTaxonId = randomUUID(), sightingId = randomUUID()
    ;[newTaxonId, sightingId].forEach((id) => ids.add(id))
    const sourceTaxon = byId(f.snapshot, 'Taxon', f.taxonId)
    const newTaxon = { ...sourceTaxon, id: newTaxonId, gbifKey: -Math.floor(Math.random() * 1_000_000_000), sciName: 'Storeus imported' }
    const mutations: PlannedCatalogueRowMutation[] = [
      { phase: 'materialize', table: 'Taxon', key: { id: newTaxonId }, before: null, after: newTaxon },
    ]
    const targetPlan = plan(f.snapshot, mutations), applyReceipt = receipt(targetPlan)
    await applyCatalogueTargetPlan(db, { validated, plan: targetPlan, receipt: applyReceipt })
    await db.sighting.create({ data: { id: sightingId, identityId: f.identityId, taxonId: newTaxonId, at: new Date(), wildness: 'wild' } })
    await expect(recoverCatalogueTarget(db, { receipt: applyReceipt })).rejects.toThrow('newer inbound references')
    expect(await db.taxon.findUnique({ where: { id: newTaxonId } })).not.toBeNull()
    expect(await db.sighting.findUnique({ where: { id: sightingId } })).not.toBeNull()
  })

  it('does not cascade-delete a new ScanWork reference to an imported Asset', async () => {
    const f = await fixture(), assetId = randomUUID(), scanKey = randomUUID()
    ids.add(assetId)
    const importedAsset: CatalogueTargetRow = {
      id: assetId,
      kind: 'image',
      url: 'https://images.example.test/imported.jpg',
      author: 'Reviewed author',
      licence: 'CC BY 4.0',
      licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
      sourceUrl: 'https://example.test/source/imported',
      origin: 'commons',
      caption: 'Imported reference',
      meta: null,
      position: 0,
      createdAt: byId(f.snapshot, 'Region', f.oldRegionId).createdAt,
      taxonId: f.taxonId,
      sightingId: null,
      ownerId: null,
      byteSize: 0,
    }
    const mutations: PlannedCatalogueRowMutation[] = [
      { phase: 'materialize', table: 'Asset', key: { id: assetId }, before: null, after: importedAsset },
    ]
    const targetPlan = plan(f.snapshot, mutations), applyReceipt = receipt(targetPlan)
    await applyCatalogueTargetPlan(db, { validated, plan: targetPlan, receipt: applyReceipt })
    await db.scanWork.create({ data: { key: scanKey, photoId: assetId, identityId: f.identityId, token: randomUUID(), leaseUntil: new Date(0) } })
    await expect(recoverCatalogueTarget(db, { receipt: applyReceipt })).rejects.toThrow('newer inbound references')
    expect(await db.asset.findUnique({ where: { id: assetId } })).not.toBeNull()
    expect(await db.scanWork.findUnique({ where: { key: scanKey } })).not.toBeNull()
  })

  it('batches composite inbound targets and still rejects a newer reference in a later batch', async () => {
    const registryVersionId = randomUUID(), sourceId = randomUUID(), regionId = randomUUID()
    const registryEntryId = randomUUID(), catalogueVersionId = randomUUID(), regionBuildId = randomUUID()
    const taxonIds = Array.from({ length: 10_002 }, () => randomUUID())
    const plausibilityIds = taxonIds.map(() => randomUUID())
    const externalLookalikeId = randomUUID()
    const countryCode = `test-${randomUUID()}`
    const batchEvidence: CatalogueInboundBatchEvidence[] = []
    try {
      await db.region.create({ data: { id: regionId, canonicalKey: `batch-${regionId}`, countryCode, name: 'Batch region', higher: 'Fixture', status: 'ready' } })
      await db.regionRegistryVersion.create({ data: {
        id: registryVersionId, countryCode, version: `batch-${randomUUID()}`, artifactSha256: 'a'.repeat(64),
        expectedRegions: 1, expectedSourceUnits: 0,
      } })
      await db.regionRegistrySource.create({ data: {
        id: sourceId, registryVersionId, role: 'regions', name: 'Batch source', url: 'https://example.test/batch.json',
        topicDate: new Date('2026-09-11T00:00:00.000Z'), downloadedAt: new Date('2026-09-11T00:00:00.000Z'),
        sha256: 'b'.repeat(64), licenceId: 'test-only', attribution: 'Test fixture',
      } })
      await db.regionRegistryEntry.create({ data: {
        id: registryEntryId, registryVersionId, sourceId, regionId, sourceCode: `batch-${randomUUID()}`,
        sourceName: 'Batch region', displayName: 'Batch region', stateCode: 'BT', stateName: 'Batch test',
      } })
      await db.catalogueVersion.create({ data: {
        id: catalogueVersionId, countryCode, runKey: `batch-${randomUUID()}`, registryVersionId,
        inputFingerprint: 'c'.repeat(64), sourceFingerprint: 'd'.repeat(64), responseFingerprint: 'e'.repeat(64),
        unionFingerprint: 'f'.repeat(64), plausibleRulesVersion: 1, tileMappingVersion: 1,
        observationWindowVersion: 1, yearFrom: 2021, yearTo: 2026, occurrencePredicates: { fixture: true },
        status: 'audited', expectedRegions: 1, completedRegions: 1, unionTaxa: taxonIds.length,
        generatedAt: new Date('2026-09-11T00:00:00.000Z'), auditedAt: new Date('2026-09-11T00:00:00.000Z'),
      } })
      await db.catalogueRegionBuild.create({ data: {
        id: regionBuildId, catalogueVersionId, registryVersionId, registryEntryId, status: 'pending',
        totalObservations: taxonIds.length, regionSize: taxonIds.length,
      } })
      await db.taxon.createMany({ data: taxonIds.map((id, index) => ({
        id, gbifKey: -1_500_000_000 + index, sciName: `Batchus ${index}`, rank: 'species', tile: 'bird' as const,
      })) })
      const snapshot = await snapshotCatalogueTarget(db)
      const mutations: PlannedCatalogueRowMutation[] = taxonIds.map((taxonId, index) => ({
        phase: 'materialize',
        table: 'CataloguePlausibility',
        key: { id: plausibilityIds[index]! },
        before: null,
        after: {
          id: plausibilityIds[index]!, regionBuildId, taxonId, obs: 1,
          monthShare: Array(12).fill(1), peak: 1, words: 'all year',
        },
      }))
      const targetPlan = plan(snapshot, mutations, [], { catalogueVersionId, registryVersionId })
      const applyReceipt = receipt(targetPlan)
      await applyCatalogueTargetPlan(db, { validated, plan: targetPlan, receipt: applyReceipt })
      await db.catalogueLookalike.create({ data: {
        id: externalLookalikeId, regionBuildId, taxonId: taxonIds[10_000]!, siblingId: taxonIds[10_001]!,
      } })

      await expect(recoverCatalogueTarget(db, {
        receipt: applyReceipt,
        faultInjection: { inboundBatch: (evidence) => batchEvidence.push(evidence) },
      })).rejects.toThrow('newer inbound references')
      const composite = batchEvidence.filter((evidence) =>
        evidence.targetTable === 'CataloguePlausibility' && evidence.sourceTable === 'CatalogueLookalike')
      expect(composite.filter(({ label }) => label === 'member').map(({ targetRows, sourceRows }) => ({ targetRows, sourceRows })))
        .toEqual([...Array.from({ length: 10 }, () => ({ targetRows: 1_000, sourceRows: 0 })), { targetRows: 2, sourceRows: 1 }])
      expect(composite.filter(({ label }) => label === 'sibling-member').map(({ targetRows, sourceRows }) => ({ targetRows, sourceRows })))
        .toEqual([...Array.from({ length: 10 }, () => ({ targetRows: 1_000, sourceRows: 0 })), { targetRows: 2, sourceRows: 1 }])
      expect(composite.every((evidence) =>
        evidence.targetRows <= 1_000 && evidence.targetJsonBytes < 128 * 1_024 &&
        JSON.stringify(evidence.targetColumns) === JSON.stringify(['regionBuildId', 'taxonId']) &&
        JSON.stringify(evidence.sourceKeyColumns) === JSON.stringify(['id']))).toBe(true)
      expect(await db.cataloguePlausibility.count({ where: { regionBuildId } })).toBe(taxonIds.length)
      expect(await readCatalogueCutoverState(db)).toMatchObject({ state: 'maintenance', activeWrites: 0 })
    } finally {
      await forceOpen()
      await db.catalogueLookalike.deleteMany({ where: { regionBuildId } })
      await db.cataloguePlausibility.deleteMany({ where: { regionBuildId } })
      await db.catalogueRegionBuild.deleteMany({ where: { id: regionBuildId } })
      await db.catalogueVersion.deleteMany({ where: { id: catalogueVersionId } })
      await db.regionRegistryEntry.deleteMany({ where: { id: registryEntryId } })
      await db.regionRegistrySource.deleteMany({ where: { id: sourceId } })
      await db.regionRegistryVersion.deleteMany({ where: { id: registryVersionId } })
      await db.region.deleteMany({ where: { id: regionId } })
      await db.taxon.deleteMany({ where: { id: { in: taxonIds } } })
    }
  })

  it('permits an inserted Asset beside an exact protected old row and still rejects old-row drift', async () => {
    const f = await fixture(), existingAssetId = randomUUID(), incomingAssetId = randomUUID(), secondIncomingAssetId = randomUUID()
    ;[existingAssetId, incomingAssetId, secondIncomingAssetId].forEach((id) => ids.add(id))
    await db.asset.create({ data: {
      id: existingAssetId,
      kind: 'image',
      url: 'https://images.example.test/existing.jpg',
      author: 'Existing author',
      licence: 'CC BY 4.0',
      licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
      sourceUrl: 'https://example.test/source/existing',
      origin: 'commons',
      caption: 'Existing reference',
      position: 0,
      taxonId: f.taxonId,
      byteSize: 123,
    } })
    const snapshot = await snapshotCatalogueTarget(db)
    const existingAsset = byId(snapshot, 'Asset', existingAssetId)
    const assetScope = catalogueProtectionScope('Asset', [existingAsset], {
      kind: 'keys', keys: [{ id: existingAssetId }],
    })
    const incomingAsset: CatalogueTargetRow = {
      ...existingAsset,
      id: incomingAssetId,
      url: 'https://images.example.test/incoming.jpg',
      sourceUrl: 'https://example.test/source/incoming',
      caption: 'Incoming reference',
    }
    const mutations: PlannedCatalogueRowMutation[] = [
      { phase: 'materialize', table: 'Asset', key: { id: incomingAssetId }, before: null, after: incomingAsset },
    ]
    const targetPlan = plan(snapshot, mutations, [], undefined, [assetScope])
    const applyReceipt = receipt(targetPlan)

    await applyCatalogueTargetPlan(db, { validated, plan: targetPlan, receipt: applyReceipt })
    expect(await db.asset.findUniqueOrThrow({ where: { id: existingAssetId } })).toMatchObject({ author: 'Existing author' })
    expect(await db.asset.findUniqueOrThrow({ where: { id: incomingAssetId } })).toMatchObject({ caption: 'Incoming reference' })
    await recoverCatalogueTarget(db, { receipt: applyReceipt })
    expect(await db.asset.findUnique({ where: { id: incomingAssetId } })).toBeNull()

    await db.asset.update({ where: { id: existingAssetId }, data: { author: 'Changed after review' } })
    const driftedSnapshot = await snapshotCatalogueTarget(db)
    const secondIncoming = { ...incomingAsset, id: secondIncomingAssetId }
    const driftPlan = plan(driftedSnapshot, [
      { phase: 'materialize', table: 'Asset', key: { id: secondIncomingAssetId }, before: null, after: secondIncoming },
    ], [], undefined, [assetScope])
    await expect(applyCatalogueTargetPlan(db, {
      validated, plan: driftPlan, receipt: receipt(driftPlan),
    })).rejects.toThrow('protected scope')
    expect(await db.asset.findUnique({ where: { id: secondIncomingAssetId } })).toBeNull()
    expect(await db.asset.findUniqueOrThrow({ where: { id: existingAssetId } })).toMatchObject({ author: 'Changed after review' })
  })

  it('rejects recovery when a new Filter array, prose key, or ScanWork result references an inserted region', async () => {
    for (const kind of ['filter', 'prose', 'scan'] as const) {
      const f = await fixture(), targetPlan = plan(f.snapshot, f.mutations), applyReceipt = receipt(targetPlan)
      await applyCatalogueTargetPlan(db, { validated, plan: targetPlan, receipt: applyReceipt })
      if (kind === 'filter') {
        const identityId = randomUUID(); ids.add(identityId)
        await db.identity.create({ data: { id: identityId, filter: { create: { regionIds: [f.newRegionId], tiles: ['bird'] } } } })
      } else if (kind === 'prose') {
        await db.taxon.update({ where: { id: f.taxonId }, data: { prose: { version: 1, regions: { [f.newRegionId]: { de: 'new work' } } } } })
      } else {
        const photoId = randomUUID(), scanKey = randomUUID(); ids.add(photoId)
        await db.asset.create({ data: { id: photoId, kind: 'image', url: `/api/photo/${photoId}`, author: 'User', licence: 'private', sourceUrl: 'user', origin: 'user', ownerId: f.identityId } })
        await db.scanWork.create({ data: { key: scanKey, photoId, identityId: f.identityId, token: randomUUID(), leaseUntil: new Date(0), result: { regionId: f.newRegionId } } })
      }
      await expect(recoverCatalogueTarget(db, { receipt: applyReceipt })).rejects.toThrow('newer inbound references')
      expect(await db.region.findUnique({ where: { id: f.newRegionId } })).not.toBeNull()
      await forceOpen()
      await db.scanWork.deleteMany({ where: { identityId: f.identityId } })
      await db.filter.deleteMany({ where: { regionIds: { has: f.newRegionId } } })
      await db.asset.deleteMany({ where: { ownerId: f.identityId } })
      await db.taxon.update({ where: { id: f.taxonId }, data: { prose: Prisma.DbNull } })
      await db.filter.deleteMany({ where: { identityId: f.identityId } })
      await db.identity.deleteMany({ where: { id: f.identityId } })
      await db.region.deleteMany({ where: { id: f.newRegionId } })
      await db.region.deleteMany({ where: { id: f.oldRegionId } })
      await db.taxon.deleteMany({ where: { id: f.taxonId } })
    }
  })

  it('rejects a modified external receipt before changing the gate', async () => {
    const f = await fixture(), targetPlan = plan(f.snapshot, f.mutations), applyReceipt = receipt(targetPlan)
    expect(() => receipt({ ...targetPlan, summary: { mutations: 999 } })).toThrow('plan fingerprint mismatch')
    const changed = { ...applyReceipt, catalogueVersionId: 'forged' } as CatalogueApplyReceipt
    await expect(applyCatalogueTargetPlan(db, { validated, plan: targetPlan, receipt: changed })).rejects.toThrow('receipt is invalid')
    expect(await readCatalogueCutoverState(db)).toMatchObject({ state: 'open' })
  })

  it('rejects a frozen-source validator without current release evidence before changing the gate', async () => {
    const f = await fixture(), targetPlan = plan(f.snapshot, f.mutations), applyReceipt = receipt(targetPlan)
    const frozenOnly = {
      pins: validated.pins,
      tables: validated.tables,
      evidence: validated.evidence,
      assertStillValid,
    } as unknown as ValidatedCatalogueReleaseImport
    await expect(applyCatalogueTargetPlan(db, { validated: frozenOnly, plan: targetPlan, receipt: applyReceipt }))
      .rejects.toThrow('requires validated current release evidence')
    expect(await db.region.findUnique({ where: { id: f.newRegionId } })).toBeNull()
    expect(await readCatalogueCutoverState(db)).toMatchObject({ state: 'open' })
  })
})
