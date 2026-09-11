import { randomUUID } from 'node:crypto'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
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
} from '../../etl/catalogue-import-store'
import {
  catalogueTargetPlanFingerprint,
  catalogueProtectionScope,
  type CatalogueTargetPlan,
  type CatalogueTargetRow,
  type PlannedCatalogueRowMutation,
  type TargetCatalogueSnapshot,
} from '../../etl/catalogue-import-plan'
import type { ValidatedCatalogueImport, ValidatedImportEvidence } from '../../etl/catalogue-import-validation'

const sourceEvidence: ValidatedImportEvidence = { files: [], tables: [], decodedFingerprint: '1'.repeat(64) }
const assertStillValid = vi.fn(async () => undefined)
const validated = { pins: {}, tables: new Map(), evidence: sourceEvidence, assertStillValid } as unknown as ValidatedCatalogueImport

const ids = new Set<string>()

function table(snapshot: TargetCatalogueSnapshot, name: string) { return snapshot.tables.get(name) ?? [] }
function byId(snapshot: TargetCatalogueSnapshot, name: string, id: string) {
  const row = table(snapshot, name).find((candidate) => candidate.id === id)
  if (!row) throw new Error(`fixture lacks ${name} ${id}`)
  return row
}

function plan(snapshot: TargetCatalogueSnapshot, mutations: readonly PlannedCatalogueRowMutation[], protectedTables: readonly string[] = []): CatalogueTargetPlan {
  const protectedScopes = protectedTables.map((name) => catalogueProtectionScope(name, table(snapshot, name)))
  const unsigned = {
    schemaVersion: 1,
    catalogueVersionId: `catalogue-${randomUUID()}`,
    registryVersionId: `registry-${randomUUID()}`,
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
  ids.clear(); assertStillValid.mockClear()
})

afterAll(async () => { await db.$disconnect() })

describe('checked catalogue import store', () => {
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

  it('atomically applies, verifies, opens, and exactly recovers while preserving personal rows', async () => {
    const f = await fixture()
    const targetPlan = plan(f.snapshot, f.mutations, ['Identity', 'Sighting'])
    const applyReceipt = receipt(targetPlan)
    await applyCatalogueTargetPlan(db, { validated, plan: targetPlan, receipt: applyReceipt })
    expect(assertStillValid).toHaveBeenCalledTimes(2)
    expect(await db.region.findUnique({ where: { id: f.newRegionId } })).toMatchObject({ name: 'Current region' })
    expect(await db.filter.findUniqueOrThrow({ where: { identityId: f.identityId } })).toMatchObject({ regionId: f.newRegionId, regionIds: [f.newRegionId] })
    expect(await readCatalogueCutoverState(db)).toMatchObject({ state: 'open', activeWrites: 0 })

    await recoverCatalogueTarget(db, { receipt: applyReceipt })
    expect(await db.region.findUnique({ where: { id: f.newRegionId } })).toBeNull()
    expect(await db.filter.findUniqueOrThrow({ where: { identityId: f.identityId } })).toMatchObject({ regionId: f.oldRegionId, regionIds: [f.oldRegionId] })
    expect(await db.identity.findUnique({ where: { id: f.identityId } })).not.toBeNull()
    expect(await readCatalogueCutoverState(db)).toMatchObject({ state: 'open', activeWrites: 0 })
  })

  it('leaves maintenance closed and writes nothing while an admitted write has not drained', async () => {
    const f = await fixture(), targetPlan = plan(f.snapshot, f.mutations), applyReceipt = receipt(targetPlan)
    const admission = await admitCatalogueWrite(db, 'store-test-held-write', { identityId: f.identityId })
    await expect(applyCatalogueTargetPlan(db, { validated, plan: targetPlan, receipt: applyReceipt })).rejects.toThrow('drain is not empty')
    expect(await db.region.findUnique({ where: { id: f.newRegionId } })).toBeNull()
    expect(await readCatalogueCutoverState(db)).toMatchObject({ state: 'maintenance', activeWrites: 1 })
    await releaseCatalogueWrite(db, admission.id)
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
    await expect(applyCatalogueTargetPlan(db, { validated, plan: targetPlan, receipt: applyReceipt,
      faultInjection: { afterWrites: async () => { throw new Error('injected transaction failure') } } })).rejects.toThrow('injected transaction failure')
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
})
