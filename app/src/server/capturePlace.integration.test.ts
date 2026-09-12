import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from './db'
import { sightingRouter } from './routers/sighting'
import { journalRouter } from './routers/journal'
import { dataRouter } from './routers/data'
import type { Context } from './trpc'

const owners: string[] = []
let taxonId: string
async function subject() {
  const identity = await db.identity.create({ data: {} }); owners.push(identity.id)
  const region = await db.region.findFirstOrThrow()
  await db.filter.create({ data: { identityId: identity.id, regionId: region.id, regionIds: [region.id] } })
  const ctx: Context = { db, identity, networkKey: randomUUID(), minted: false, cookies: {}, outCookies: [], origin: 'http://localhost', locale: 'en', setCookie: () => 0 }
  return { ctx, sighting: sightingRouter.createCaller(ctx), journal: journalRouter.createCaller(ctx), data: dataRouter.createCaller(ctx) }
}
beforeAll(async () => { taxonId = (await db.taxon.findFirstOrThrow()).id })
afterAll(async () => { await db.identity.deleteMany({ where: { id: { in: owners } } }); await db.$disconnect() })

describe('capture-time fallback place', () => {
  it('retains historical capture labels through region changes, concurrent retries and all owned reads', async () => {
    const caller = await subject(), id = randomUUID()
    const input = { id, taxonId, at: new Date(), wildness: 'wild' as const, place: 'Retired capture region A' }
    const results = await Promise.all(Array.from({ length: 4 }, () => caller.sighting.create(input)))
    expect(results.map(r => r.place)).toEqual(Array(4).fill(input.place))
    expect(await db.sighting.count({ where: { identityId: caller.ctx.identity.id } })).toBe(1)
    expect(await caller.journal.get({ id })).toMatchObject({ place: input.place, lat: null, lng: null })
    expect((await caller.data.export()).sightings).toMatchObject([{ place: input.place, lat: null, lng: null }])
    const other = await subject()
    await expect(other.sighting.create(input)).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(await other.journal.get({ id })).toBe(null)
  })
  it('does not invent original context for older clients or missing queued labels', async () => {
    const caller = await subject()
    for (const place of [undefined, null, '  ']) {
      const row = await caller.sighting.create({ taxonId, at: new Date(), wildness: 'wild', place })
      expect(row.place).toBe(null)
    }
    await expect(caller.sighting.create({ taxonId, at: new Date(), wildness: 'wild', place: 'x'.repeat(501) })).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })
  it('prefers GPS reverse geocoding and uses captured fallback only when it fails', async () => {
    const caller = await subject()
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify([{ type: 'GADM3', title: 'GPS Gemeinde', distance: 0 }])))
    const input = { taxonId, at: new Date(), wildness: 'wild' as const, place: ' Capture A ', lat: 49.9, lng: 8.1 }
    try {
      const row = await caller.sighting.create(input)
      expect(row.place).toBe('GPS Gemeinde')
      expect(await caller.journal.get({ id: row.id })).toMatchObject({ lat: input.lat, lng: input.lng })
      expect(await caller.sighting.fill({ id: row.id })).not.toHaveProperty('lat')
      fetch.mockRejectedValueOnce(new Error('reverse unavailable'))
      expect((await caller.sighting.create(input)).place).toBe('Capture A')
    } finally { fetch.mockRestore() }
  })
})
