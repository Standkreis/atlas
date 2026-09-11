import { describe, expect, it } from 'vitest'
import { catalogueJsonBatches, CATALOGUE_WRITE_BATCH, CATALOGUE_KEY_BATCH, CATALOGUE_INBOUND_BATCH } from './catalogue-import-batches'

describe('catalogue JSON parameter batches', () => {
  it('retains ordered exact coverage across row and UTF-8 byte boundaries', () => {
    const values = Array.from({ length: 127 }, (_, index) => ({ index, text: ['🦊', 'Größe', '水', '\\"\n'][index % 4]!.repeat(index % 7) }))
    for (const limits of [{ maxRows: 3, maxBytes: 500 }, { maxRows: 10, maxBytes: 160 }, { maxRows: 1, maxBytes: 160 }]) {
      const batches = [...catalogueJsonBatches(values, limits)]
      expect(batches).toEqual([...catalogueJsonBatches(values, limits)])
      expect(batches.flatMap(({ payload }) => JSON.parse(payload))).toEqual(values)
      expect(batches.every((batch) => batch.rows <= limits.maxRows && batch.bytes <= limits.maxBytes &&
        batch.bytes === Buffer.byteLength(batch.payload, 'utf8') && JSON.parse(batch.payload).length === batch.rows)).toBe(true)
    }
  })

  it('counts array brackets and commas, including exact limits and final singleton', () => {
    expect([...catalogueJsonBatches(['é', 'é', 'é'], { maxRows: 10, maxBytes: 11 })])
      .toEqual([{ payload: '["é","é"]', rows: 2, bytes: 11 }, { payload: '["é"]', rows: 1, bytes: 6 }])
    expect([...catalogueJsonBatches([], CATALOGUE_WRITE_BATCH)]).toEqual([])
    expect([...catalogueJsonBatches([null], { maxRows: 1, maxBytes: 6 })]).toEqual([{ payload: '[null]', rows: 1, bytes: 6 }])
  })

  it('rejects an oversized individual value without disclosing it or dropping later rows', () => {
    const batches = catalogueJsonBatches([1, 2, 'private-row-🦊', 3], { maxRows: 1, maxBytes: 8 })
    expect(batches.next().value).toEqual({ payload: '[1]', rows: 1, bytes: 3 })
    expect(() => batches.next()).toThrow('catalogue batch value exceeds 8 UTF-8 JSON bytes')
    expect(() => [...catalogueJsonBatches(['🦊'], { maxRows: 1, maxBytes: 7 })]).toThrow('exceeds')
    expect([...catalogueJsonBatches(['🦊'], { maxRows: 1, maxBytes: 8 })][0]?.bytes).toBe(8)
  })

  it('rejects invalid limits and non-JSON values', () => {
    for (const limits of [{ maxRows: 0, maxBytes: 10 }, { maxRows: 1.5, maxBytes: 10 }, { maxRows: 1, maxBytes: 1 }, { maxRows: 1, maxBytes: Infinity }]) {
      expect(() => [...catalogueJsonBatches([], limits)]).toThrow('invalid catalogue batch limits')
    }
    expect(() => [...catalogueJsonBatches([undefined], CATALOGUE_WRITE_BATCH)]).toThrow('not JSON serializable')
  })

  it('fixes measured write/key caps and retains the smaller inbound join bound', () => {
    expect(CATALOGUE_WRITE_BATCH).toEqual({ maxRows: 10_000, maxBytes: 4_194_304 })
    expect(CATALOGUE_KEY_BATCH).toEqual({ maxRows: 100_000, maxBytes: 4_194_304 })
    expect(CATALOGUE_INBOUND_BATCH).toEqual({ maxRows: 1_000, maxBytes: 4_194_304 })
  })
})
