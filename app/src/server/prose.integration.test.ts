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
  const text = (name: string): Prose => ({
    de: null, en: { paragraphs: [{ sentences: [{ text: name, cites: ['F1'] }] }] }, eco: { de: null, en: null },
    facts: { de: [], en: [{ id: 'F1', source: 'fixture', text: name }] }, ecoFacts: null, inputHash: name, model: 'fixture', judged: { supported: 1, partial: 0, unsupported: 0 }, at: new Date().toISOString(),
  })
  const ctx: Context = { db, identity, networkKey: 'fixture', minted: false, cookies: {}, outCookies: [], origin: null, locale: 'en', setCookie: () => 0 }
  const caller = taxonRouter.createCaller(ctx)
  try {
    await db.region.createMany({ data: regions.map((id, index) => ({ id, name: `Prose region ${index}`, higher: 'Deutschland', status: 'ready' })) })
    await Promise.all(regions.map((region, i) => storeRegionalProse(db, taxon.id, region, text(`Region ${i}`))))
    for (const [i, regionId] of regions.entries()) expect((await caller.page({ gbifKey: taxon.gbifKey, regionId }))?.prose?.inputHash).toBe(`Region ${i}`)
    expect((await caller.page({ gbifKey: taxon.gbifKey, regionId: randomUUID() }))?.prose).toBeNull()
    expect((await caller.page({ gbifKey: taxon.gbifKey }))?.prose).toBeNull()
    await expect(storeRegionalProse(db, taxon.id, regions[0], { ...text('Rejected'), judged: { supported: 0, partial: 1, unsupported: 0 } })).rejects.toThrow('publication gate')
    expect((await caller.page({ gbifKey: taxon.gbifKey, regionId: regions[0] }))?.prose?.inputHash).toBe('Region 0')
  } finally {
    await db.taxon.delete({ where: { id: taxon.id } })
    await db.region.deleteMany({ where: { id: { in: regions } } })
    await db.identity.delete({ where: { id: identity.id } })
  }
})
afterAll(() => db.$disconnect())
