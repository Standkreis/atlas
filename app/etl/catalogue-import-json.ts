/** Streaming canonical JSON for large checked-import plans and receipts. */
import { createHash } from 'node:crypto'

const STRING_CHUNK_CODE_UNITS = 16 * 1024

function unsupported(value: unknown): never {
  throw new Error(`catalogue import JSON contains unsupported ${value === null ? 'null' : typeof value} value`)
}

function* quotedString(value: string): Generator<string> {
  let chunk = '"'
  const append = function* (encoded: string) {
    if (chunk.length + encoded.length > STRING_CHUNK_CODE_UNITS) {
      yield chunk
      chunk = ''
    }
    chunk += encoded
  }
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index)
    let encoded: string
    if (code === 0x22) encoded = '\\"'
    else if (code === 0x5c) encoded = '\\\\'
    else if (code === 0x08) encoded = '\\b'
    else if (code === 0x09) encoded = '\\t'
    else if (code === 0x0a) encoded = '\\n'
    else if (code === 0x0c) encoded = '\\f'
    else if (code === 0x0d) encoded = '\\r'
    else if (code < 0x20) encoded = `\\u${code.toString(16).padStart(4, '0')}`
    else if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1)
      if (next >= 0xdc00 && next <= 0xdfff) { encoded = value[index]! + value[++index]! }
      else encoded = `\\u${code.toString(16)}`
    } else if (code >= 0xdc00 && code <= 0xdfff) encoded = `\\u${code.toString(16)}`
    else encoded = value[index]!
    yield* append(encoded)
  }
  yield* append('"')
  if (chunk) yield chunk
}

function objectEntries(value: object) {
  const entries = Object.entries(value).filter(([, child]) => child !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
  // canonicalContent builds Object.fromEntries after sorting. JavaScript then enumerates array-
  // index keys numerically before other keys, so reproduce that final JSON.stringify order.
  const values = new Map(entries)
  const keys = Object.keys(Object.fromEntries(entries.map(([key]) => [key, null])))
  return keys.map((key) => [key, values.get(key)] as const)
}

function* encode(value: unknown, ancestors: Set<object>): Generator<string> {
  if (value === null) { yield 'null'; return }
  if (typeof value === 'string') { yield* quotedString(value); return }
  if (typeof value === 'boolean') { yield value ? 'true' : 'false'; return }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) unsupported(value)
    yield JSON.stringify(value)
    return
  }
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) throw new Error('catalogue import JSON contains an invalid Date')
    yield* quotedString(value.toISOString())
    return
  }
  if (!value || typeof value !== 'object') unsupported(value)
  if (ancestors.has(value)) throw new Error('catalogue import JSON contains a circular value')
  ancestors.add(value)
  try {
    if (Array.isArray(value)) {
      yield '['
      for (let index = 0; index < value.length; index++) {
        if (index) yield ','
        // Array.prototype.map preserves holes, which JSON.stringify serializes as null. An own or
        // inherited explicit undefined is visited by map and rejected by canonicalContent.
        if (!(index in value)) yield 'null'
        else yield* encode(value[index], ancestors)
      }
      yield ']'
      return
    }
    yield '{'
    let first = true
    for (const [key, child] of objectEntries(value)) {
      if (!first) yield ','
      first = false
      yield* quotedString(key)
      yield ':'
      yield* encode(child, ancestors)
    }
    yield '}'
  } finally {
    ancestors.delete(value)
  }
}

/** Yield byte-equivalent canonicalContent JSON without materializing the whole encoded graph. */
export function* catalogueJsonChunks(value: unknown): Generator<string> {
  let chunk = ''
  for (const encoded of encode(value, new Set())) {
    if (chunk.length + encoded.length > STRING_CHUNK_CODE_UNITS) {
      if (chunk) yield chunk
      chunk = ''
    }
    chunk += encoded
  }
  if (chunk) yield chunk
}

/** Incremental SHA-256 for plans/receipts that may exceed V8's maximum string length. */
export function catalogueImportDigest(value: unknown) {
  const hash = createHash('sha256')
  for (const chunk of catalogueJsonChunks(value)) hash.update(chunk, 'utf8')
  return hash.digest('hex')
}
