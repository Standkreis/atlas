import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { canonicalContent, contentDigest } from './catalogue-gallery-transfer'
import { catalogueImportDigest, catalogueJsonChunks } from './catalogue-import-json'

const streamed = (value: unknown) => [...catalogueJsonChunks(value)].join('')

describe('streaming catalogue import JSON', () => {
  it.each([
    null,
    true,
    false,
    0,
    -0,
    12.25,
    1e30,
    'quote" slash\\ controls\b\t\n\f\r\0',
    'unicode   separator   and astral 🐦',
    '\ud800 lone high and lone low \udfff',
    new Date('2026-09-11T12:00:00.123Z'),
    { z: 1, a: { beta: true, alpha: null }, omitted: undefined },
    { 10: 'ten', 2: 'two', 1: 'one', ä: 'umlaut', a: 'latin' },
    [1, 'two', { z: 3, a: 1 }, [false, null]],
  ])('is byte-equivalent to canonicalContent for %#', (value) => {
    expect(streamed(value)).toBe(canonicalContent(value))
    expect(catalogueImportDigest(value)).toBe(contentDigest(value))
  })

  it('matches canonical array-hole and explicit undefined behavior', () => {
    const hole = Array(2) as unknown[]
    hole[1] = 'present'
    expect(streamed(hole)).toBe('[null,"present"]')
    expect(streamed(hole)).toBe(canonicalContent(hole))
    expect(() => streamed([undefined])).toThrow('unsupported undefined')
    expect(() => canonicalContent([undefined])).toThrow('unsupported JSON value')
    expect(streamed({ absent: undefined, present: null })).toBe('{"present":null}')
  })

  it.each([undefined, BigInt(1), Symbol('x'), () => null, NaN, Infinity, -Infinity])('rejects unsupported value %#', (value) => {
    expect(() => streamed(value)).toThrow(/unsupported/)
    expect(() => catalogueImportDigest(value)).toThrow(/unsupported/)
  })

  it('rejects invalid dates and cycles while permitting repeated shared values', () => {
    expect(() => streamed(new Date('invalid'))).toThrow('invalid Date')
    const circular: Record<string, unknown> = {}
    circular.self = circular
    expect(() => streamed(circular)).toThrow('circular')
    const shared = { stable: true }
    expect(streamed([shared, shared])).toBe(canonicalContent([shared, shared]))
  })

  it('keeps every yielded chunk bounded while hashing a large graph incrementally', () => {
    const repeated = 'a"\\\n🐦'.repeat(5_000)
    const graph = Array.from({ length: 400 }, (_, index) => ({ index, repeated }))
    const hash = createHash('sha256')
    let chunks = 0
    let maximum = 0
    for (const chunk of catalogueJsonChunks(graph)) {
      chunks++
      maximum = Math.max(maximum, chunk.length)
      hash.update(chunk, 'utf8')
    }
    expect(chunks).toBeGreaterThan(graph.length)
    expect(maximum).toBeLessThanOrEqual(16 * 1024)
    expect(hash.digest('hex')).toBe(catalogueImportDigest(graph))
  })
})
