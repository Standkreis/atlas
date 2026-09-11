import { afterAll, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from './db'
import { taxonRouter } from './routers/taxon'
import { storeRegionalProse } from '../../etl/prose/store'
import type { Prose } from './prose'
import type { Context } from './trpc'

it('concurrent region publication preserves both texts and routes never serve another region', async () => {
  const identity = await db.identity.create({ data: {} })
  const taxon = await db.taxon.create({ data: { gbifKey: -Math.floor(Math.random() * 1000000000), sciName: 'Regional fixture', rank: 'species', tile: 'bird' } })
  const regions = [randomUUID(), randomUUID()]
  const registryId = randomUUID(), catalogueId = randomUUID()
  const previousRegistry = await db.regionRegistryVersion.findMany({ where: { countryCode: 'DE', active: true }, select: { id: true } })
  const previousCatalogues = await db.catalogueVersion.findMany({ where: { countryCode: 'DE', status: 'active' }, select: { id: true, updatedAt: true } })
  const text = (name: string): Prose => ({
    de: null, en: { paragraphs: [{ sentences: [{ text: name, cites: ['F1'] }] }] }, eco: { de: null, en: null },
    facts: { de: [], en: [{ id: 'F1', source: 'fixture', text: name }] }, ecoFacts: null, inputHash: name, model: 'fixture', judged: { supported: 1, partial: 0, unsupported: 0 }, at: new Date().toISOString(),
  })
  const ctx: Context = { db, identity, networkKey: 'fixture', minted: false, cookies: {}, outCookies: [], origin: null, locale: 'en', setCookie: () => 0 }
  const caller = taxonRouter.createCaller(ctx)
  try {
    // Exercise the same regional publication assertions inside an owned active catalogue.
    await db.$transaction(async (tx) => {
      await tx.regionRegistryVersion.updateMany({ where: { id: { in: previousRegistry.map(({ id }) => id) } }, data: { active: false } })
      for (const row of previousCatalogues) await tx.catalogueVersion.update({ where: { id: row.id }, data: { status: 'retired', updatedAt: row.updatedAt } })
    })
    await db.regionRegistryVersion.create({ data: { id: registryId, countryCode: 'DE', version: registryId, artifactSha256: 'a'.repeat(64), expectedRegions: 2, expectedSourceUnits: 0, active: true } })
    const source = await db.regionRegistrySource.create({ data: { registryVersionId: registryId, role: 'regions', name: 'Prose fixture', url: 'https://example.test/prose', topicDate: new Date('2026-09-11'), downloadedAt: new Date(), sha256: 'b'.repeat(64), licenceId: 'test-only', attribution: 'Fixture' } })
    const activatedAt = new Date()
    await db.catalogueVersion.create({ data: { id: catalogueId, countryCode: 'DE', runKey: catalogueId, registryVersionId: registryId, inputFingerprint: 'i', sourceFingerprint: 's', responseFingerprint: 'r', unionFingerprint: 'u', plausibleRulesVersion: 1, tileMappingVersion: 1, observationWindowVersion: 1, yearFrom: 2016, yearTo: 2026, occurrencePredicates: {}, expectedRegions: 2, completedRegions: 2, unionTaxa: 1, status: 'active', generatedAt: activatedAt, auditedAt: activatedAt, activatedAt } })
    await db.region.createMany({ data: regions.map((id, index) => ({ id, canonicalKey: `prose-${id}`, countryCode: 'DE', name: `Prose region ${index}`, higher: 'Deutschland', status: 'ready' })) })
    await db.regionRegistryEntry.createMany({ data: regions.map((regionId, index) => ({ registryVersionId: registryId, sourceId: source.id, regionId, sourceCode: `prose-${index}`, sourceName: 'Prose fixture', displayName: 'Prose fixture', stateCode: '99', stateName: 'Fixture' })) })
    await Promise.all(regions.map((region, i) => storeRegionalProse(db, taxon.id, region, text(`Region ${i}`))))
    for (const [i, regionId] of regions.entries()) expect((await caller.page({ gbifKey: taxon.gbifKey, regionId }))?.prose?.inputHash).toBe(`Region ${i}`)
    expect((await caller.page({ gbifKey: taxon.gbifKey, regionId: randomUUID() }))?.prose).toBeNull()
    expect((await caller.page({ gbifKey: taxon.gbifKey }))?.prose).toBeNull()
    await expect(storeRegionalProse(db, taxon.id, regions[0], { ...text('Rejected'), judged: { supported: 0, partial: 1, unsupported: 0 } })).rejects.toThrow('publication gate')
    expect((await caller.page({ gbifKey: taxon.gbifKey, regionId: regions[0] }))?.prose?.inputHash).toBe('Region 0')
  } finally {
    await db.taxon.delete({ where: { id: taxon.id } })
    await db.catalogueVersion.deleteMany({ where: { id: catalogueId } })
    await db.regionRegistryEntry.deleteMany({ where: { registryVersionId: registryId } })
    await db.regionRegistrySource.deleteMany({ where: { registryVersionId: registryId } })
    await db.regionRegistryVersion.deleteMany({ where: { id: registryId } })
    await db.region.deleteMany({ where: { id: { in: regions } } })
    await db.identity.delete({ where: { id: identity.id } })
    await db.regionRegistryVersion.updateMany({ where: { id: { in: previousRegistry.map(({ id }) => id) } }, data: { active: true } })
    for (const row of previousCatalogues) await db.catalogueVersion.update({ where: { id: row.id }, data: { status: 'active', updatedAt: row.updatedAt } })
  }
})
afterAll(() => db.$disconnect())
