import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it } from 'vitest'
import { db } from './db'

const taxonIds: string[] = []

afterAll(async () => {
  await db.taxon.deleteMany({ where: { id: { in: taxonIds } } })
  await db.$disconnect()
})

describe('ordered gallery storage', () => {
  it('defaults an existing-style single image to lead position zero and rejects negative positions', async () => {
    const taxon = await db.taxon.create({
      data: { gbifKey: -Math.floor(Math.random() * 1_000_000_000), sciName: `Gallery ${randomUUID()}`, rank: 'species', tile: 'bird' },
    })
    taxonIds.push(taxon.id)
    const lead = await db.asset.create({
      data: {
        taxonId: taxon.id,
        kind: 'image',
        url: 'https://example.test/lead.jpg',
        author: 'Fixture Author',
        licence: 'CC BY 4.0',
        licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
        sourceUrl: 'https://example.test/source',
        origin: 'commons',
      },
    })
    expect(lead.position).toBe(0)
    await expect(db.asset.create({
      data: {
        taxonId: taxon.id,
        position: -1,
        kind: 'image',
        url: 'https://example.test/negative.jpg',
        author: 'Fixture Author',
        licence: 'CC BY 4.0',
        licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
        sourceUrl: 'https://example.test/negative-source',
        origin: 'commons',
      },
    })).rejects.toThrow()
  })

  it('has a database index beginning with taxonId and position', async () => {
    const indexes = await db.$queryRaw<{ indexdef: string }[]>`
      SELECT indexdef FROM pg_indexes WHERE schemaname = current_schema() AND tablename = 'Asset'
    `
    expect(indexes.some(({ indexdef }) => indexdef.includes('("taxonId", "position")'))).toBe(true)
  })
})
