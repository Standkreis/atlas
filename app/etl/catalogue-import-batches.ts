/** Limits apply to the exact UTF-8 JSON parameter, including array punctuation. */
export const CATALOGUE_WRITE_BATCH = Object.freeze({ maxRows: 10_000, maxBytes: 4 * 1024 * 1024 })
export const CATALOGUE_KEY_BATCH = Object.freeze({ maxRows: 100_000, maxBytes: 4 * 1024 * 1024 })
// Inbound joins retain the independently rehearsed small hash input from #94.
export const CATALOGUE_INBOUND_BATCH = Object.freeze({ maxRows: 1_000, maxBytes: 4 * 1024 * 1024 })

export type CatalogueBatchLimits = Readonly<{ maxRows: number; maxBytes: number }>
export type CatalogueJsonBatch = Readonly<{ payload: string; rows: number; bytes: number }>

/** Stable, complete coverage; an oversized value throws, never skips or exceeds the cap. */
export function* catalogueJsonBatches(values: Iterable<unknown>, limits: CatalogueBatchLimits): Generator<CatalogueJsonBatch> {
  if (!Number.isSafeInteger(limits.maxRows) || limits.maxRows < 1 ||
    !Number.isSafeInteger(limits.maxBytes) || limits.maxBytes < 2) throw new Error('invalid catalogue batch limits')
  let parts: string[] = [], bytes = 2
  for (const value of values) {
    const encoded = JSON.stringify(value)
    if (encoded === undefined) throw new Error('catalogue batch value is not JSON serializable')
    const valueBytes = Buffer.byteLength(encoded, 'utf8')
    if (valueBytes + 2 > limits.maxBytes) throw new Error(`catalogue batch value exceeds ${limits.maxBytes} UTF-8 JSON bytes`)
    const addition = valueBytes + (parts.length ? 1 : 0)
    if (parts.length && (parts.length === limits.maxRows || bytes + addition > limits.maxBytes)) {
      yield { payload: `[${parts.join(',')}]`, rows: parts.length, bytes }
      parts = []; bytes = 2
    }
    bytes += valueBytes + (parts.length ? 1 : 0)
    parts.push(encoded)
  }
  if (parts.length) yield { payload: `[${parts.join(',')}]`, rows: parts.length, bytes }
}
