/** Owner-only, streaming receipt files for the checked catalogue cutover. */
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { open, stat, unlink } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { catalogueImportDigest, catalogueJsonChunks } from './catalogue-import-json'
import type { CatalogueApplyReceipt } from './catalogue-import-store'

const SHA256 = /^[a-f\d]{64}$/
const UTC_MILLIS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const RECEIPT_FORMAT = 'standkreis-catalogue-apply-receipt-jsonl-v1' as const
const DEFAULT_MAX_LINE_BYTES = 16 * 1024 * 1024

type ReceiptHeader = Readonly<{
  type: 'header'
  format: typeof RECEIPT_FORMAT
  schemaVersion: 1
  operationId: string
  countryCode: 'DE'
  catalogueVersionId: string
  registryVersionId: string
  sourceEvidence: CatalogueApplyReceipt['sourceEvidence']
  sourceEvidenceFingerprint: string
  targetSnapshotFingerprint: string
  planFingerprint: string
  createdAt: string
}>

type ReceiptFooter = Readonly<{
  type: 'footer'
  protectedScopes: number
  mutations: number
  receiptFingerprint: string
  streamSha256: string
}>

export type CatalogueReceiptFileDescriptor = Readonly<{
  path: string
  sha256: string
  bytes: number
  receiptFingerprint: string
  streamSha256: string
  protectedScopes: number
  mutations: number
}>

export type CanonicalFileDescriptor = Readonly<{
  path: string
  sha256: string
  bytes: number
  contentDigest: string
}>

function exactKeys(value: Record<string, unknown>, expected: readonly string[], label: string) {
  const actual = Object.keys(value).sort()
  const wanted = [...expected].sort()
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(`${label} has unexpected fields`)
  }
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`)
  return value as Record<string, unknown>
}

function string(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value) throw new Error(`${label} must be a non-empty string`)
  return value
}

function sha256(value: unknown, label: string): string {
  const digest = string(value, label)
  if (!SHA256.test(digest)) throw new Error(`${label} must be a lowercase SHA-256 digest`)
  return digest
}

function integer(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error(`${label} must be a non-negative safe integer`)
  return value as number
}

function receiptPayload(receipt: CatalogueApplyReceipt) {
  return Object.fromEntries(Object.entries(receipt).filter(([key]) => key !== 'fingerprint')) as Omit<CatalogueApplyReceipt, 'fingerprint'>
}

function assertReceiptEnvelope(receipt: CatalogueApplyReceipt) {
  if (receipt.schemaVersion !== 1 || receipt.countryCode !== 'DE' || !receipt.operationId || !receipt.catalogueVersionId || !receipt.registryVersionId ||
    !UTC_MILLIS.test(receipt.createdAt) || !Number.isFinite(Date.parse(receipt.createdAt)) ||
    !SHA256.test(receipt.sourceEvidenceFingerprint) || receipt.sourceEvidenceFingerprint !== catalogueImportDigest(receipt.sourceEvidence) ||
    !SHA256.test(receipt.targetSnapshotFingerprint) || !SHA256.test(receipt.planFingerprint) ||
    !SHA256.test(receipt.fingerprint) || receipt.fingerprint !== catalogueImportDigest(receiptPayload(receipt))) {
    throw new Error('catalogue receipt envelope is invalid')
  }
}

async function writeBuffer(handle: Awaited<ReturnType<typeof open>>, buffer: Buffer) {
  let offset = 0
  while (offset < buffer.length) {
    const { bytesWritten } = await handle.write(buffer, offset, buffer.length - offset, null)
    if (!bytesWritten) throw new Error('catalogue receipt write made no progress')
    offset += bytesWritten
  }
}

async function durableDirectory(path: string) {
  const directory = await open(dirname(path), 'r')
  try { await directory.sync() } finally { await directory.close() }
}

async function exclusiveCanonicalWriter(path: string) {
  const absolute = resolve(path)
  const handle = await open(absolute, 'wx', 0o600)
  const fileHash = createHash('sha256')
  let bytes = 0
  const write = async (value: unknown, hash?: ReturnType<typeof createHash>, maxBytes?: number) => {
    let recordBytes = 0
    for (const chunk of catalogueJsonChunks(value)) {
      const buffer = Buffer.from(chunk, 'utf8')
      recordBytes += buffer.length
      if (maxBytes !== undefined && recordBytes > maxBytes) {
        throw new Error(`catalogue receipt record exceeds the ${maxBytes} byte size limit`)
      }
      await writeBuffer(handle, buffer)
      fileHash.update(buffer)
      hash?.update(buffer)
      bytes += buffer.length
    }
  }
  const newline = async (hash?: ReturnType<typeof createHash>) => {
    const buffer = Buffer.from('\n')
    await writeBuffer(handle, buffer)
    fileHash.update(buffer)
    hash?.update(buffer)
    bytes += 1
  }
  return { absolute, handle, fileHash, get bytes() { return bytes }, write, newline }
}

/** Write one small canonical JSON record, exclusively and durably, with owner-only permissions. */
export async function writeCanonicalExclusiveFile(path: string, value: unknown): Promise<CanonicalFileDescriptor> {
  const writer = await exclusiveCanonicalWriter(path)
  try {
    await writer.write(value)
    await writer.newline()
    await writer.handle.sync()
    await writer.handle.close()
    await durableDirectory(writer.absolute)
    return Object.freeze({
      path: writer.absolute,
      sha256: writer.fileHash.digest('hex'),
      bytes: writer.bytes,
      contentDigest: catalogueImportDigest(value),
    })
  } catch (error) {
    await writer.handle.close().catch(() => undefined)
    await unlink(writer.absolute).catch(() => undefined)
    throw error
  }
}

/**
 * Persist a large receipt without ever constructing its complete JSON representation. The footer
 * binds the canonical bytes of every preceding JSONL record; the returned SHA binds the whole file.
 */
export async function writeCatalogueReceiptFile(path: string, receipt: CatalogueApplyReceipt): Promise<CatalogueReceiptFileDescriptor> {
  assertReceiptEnvelope(receipt)
  const header: ReceiptHeader = {
    type: 'header', format: RECEIPT_FORMAT, schemaVersion: receipt.schemaVersion,
    operationId: receipt.operationId, countryCode: receipt.countryCode,
    catalogueVersionId: receipt.catalogueVersionId, registryVersionId: receipt.registryVersionId,
    sourceEvidence: receipt.sourceEvidence, sourceEvidenceFingerprint: receipt.sourceEvidenceFingerprint,
    targetSnapshotFingerprint: receipt.targetSnapshotFingerprint, planFingerprint: receipt.planFingerprint,
    createdAt: receipt.createdAt,
  }
  const streamHash = createHash('sha256')
  const writer = await exclusiveCanonicalWriter(path)
  try {
    await writer.write(header, streamHash, DEFAULT_MAX_LINE_BYTES); await writer.newline(streamHash)
    for (const [index, scope] of receipt.protectedScopes.entries()) {
      await writer.write({ type: 'scope', index, scope }, streamHash, DEFAULT_MAX_LINE_BYTES); await writer.newline(streamHash)
    }
    for (const [index, mutation] of receipt.mutations.entries()) {
      await writer.write({ type: 'mutation', index, mutation }, streamHash, DEFAULT_MAX_LINE_BYTES); await writer.newline(streamHash)
    }
    const footer: ReceiptFooter = {
      type: 'footer', protectedScopes: receipt.protectedScopes.length, mutations: receipt.mutations.length,
      receiptFingerprint: receipt.fingerprint, streamSha256: streamHash.digest('hex'),
    }
    await writer.write(footer, undefined, DEFAULT_MAX_LINE_BYTES); await writer.newline()
    await writer.handle.sync()
    await writer.handle.close()
    await durableDirectory(writer.absolute)
    return Object.freeze({
      path: writer.absolute, sha256: writer.fileHash.digest('hex'), bytes: writer.bytes,
      receiptFingerprint: receipt.fingerprint, streamSha256: footer.streamSha256,
      protectedScopes: receipt.protectedScopes.length, mutations: receipt.mutations.length,
    })
  } catch (error) {
    await writer.handle.close().catch(() => undefined)
    // Retain the exclusive, owner-only partial file as an unmistakably invalid operation artifact.
    // No descriptor is returned, so the CLI cannot bind it into an approved plan record.
    await durableDirectory(writer.absolute).catch(() => undefined)
    throw error
  }
}

function canonicalLine(line: string, lineNumber: number) {
  let value: unknown
  try { value = JSON.parse(line) } catch { throw new Error(`catalogue receipt line ${lineNumber} is not JSON`) }
  let canonical = ''
  for (const chunk of catalogueJsonChunks(value)) canonical += chunk
  if (canonical !== line) throw new Error(`catalogue receipt line ${lineNumber} is not canonical JSON`)
  return record(value, `catalogue receipt line ${lineNumber}`)
}

function frozen<T>(value: T, seen = new Set<object>()): T {
  if (!value || typeof value !== 'object' || seen.has(value as object)) return value
  seen.add(value as object)
  for (const child of Object.values(value as Record<string, unknown>)) frozen(child, seen)
  return Object.freeze(value)
}

/** Stream, strictly decode, and independently verify both an exact receipt file and its payload. */
export async function readCatalogueReceiptFile(
  path: string,
  expected: { sha256: string; bytes: number; receiptFingerprint: string; maxLineBytes?: number },
): Promise<{ receipt: CatalogueApplyReceipt; descriptor: CatalogueReceiptFileDescriptor }> {
  const expectedFileSha = sha256(expected.sha256, 'expected receipt file SHA-256')
  const expectedReceiptFingerprint = sha256(expected.receiptFingerprint, 'expected receipt fingerprint')
  const maxLineBytes = expected.maxLineBytes ?? DEFAULT_MAX_LINE_BYTES
  if (!Number.isSafeInteger(maxLineBytes) || maxLineBytes < 1024 || maxLineBytes > 64 * 1024 * 1024) {
    throw new Error('receipt maxLineBytes must be between 1 KiB and 64 MiB')
  }
  const absolute = resolve(path)
  const expectedBytes = integer(expected.bytes, 'expected receipt file bytes')
  const metadata = await stat(absolute)
  if (!metadata.isFile() || metadata.size !== expectedBytes) throw new Error('catalogue receipt file type or byte count mismatch')
  const fileHash = createHash('sha256')
  const streamHash = createHash('sha256')
  let pending = Buffer.alloc(0), bytes = 0, lineNumber = 0
  let header: ReceiptHeader | undefined, footer: ReceiptFooter | undefined
  const scopes: CatalogueApplyReceipt['protectedScopes'][number][] = []
  const mutations: CatalogueApplyReceipt['mutations'][number][] = []

  const consume = (lineBuffer: Buffer) => {
    lineNumber++
    if (!lineBuffer.length || lineBuffer.includes(0x0d)) throw new Error(`catalogue receipt line ${lineNumber} is empty or contains CR`)
    if (lineBuffer.length > maxLineBytes) throw new Error(`catalogue receipt line ${lineNumber} exceeds the size limit`)
    const line = new TextDecoder('utf-8', { fatal: true }).decode(lineBuffer)
    const decoded = canonicalLine(line, lineNumber)
    if (footer) throw new Error('catalogue receipt contains data after its footer')
    if (!header) {
      exactKeys(decoded, ['type', 'format', 'schemaVersion', 'operationId', 'countryCode', 'catalogueVersionId', 'registryVersionId', 'sourceEvidence', 'sourceEvidenceFingerprint', 'targetSnapshotFingerprint', 'planFingerprint', 'createdAt'], 'catalogue receipt header')
      if (decoded.type !== 'header' || decoded.format !== RECEIPT_FORMAT || decoded.schemaVersion !== 1 || decoded.countryCode !== 'DE' || !Array.isArray(record(decoded.sourceEvidence, 'sourceEvidence').files) || !Array.isArray(record(decoded.sourceEvidence, 'sourceEvidence').tables)) {
        throw new Error('catalogue receipt header is invalid')
      }
      for (const field of ['operationId', 'catalogueVersionId', 'registryVersionId', 'createdAt']) string(decoded[field], `catalogue receipt header ${field}`)
      for (const field of ['sourceEvidenceFingerprint', 'targetSnapshotFingerprint', 'planFingerprint']) sha256(decoded[field], `catalogue receipt header ${field}`)
      header = decoded as ReceiptHeader
    } else if (decoded.type === 'scope') {
      exactKeys(decoded, ['type', 'index', 'scope'], 'catalogue receipt scope line')
      if (mutations.length || integer(decoded.index, 'catalogue receipt scope index') !== scopes.length) throw new Error('catalogue receipt scope order is invalid')
      scopes.push(record(decoded.scope, 'catalogue receipt scope') as CatalogueApplyReceipt['protectedScopes'][number])
    } else if (decoded.type === 'mutation') {
      exactKeys(decoded, ['type', 'index', 'mutation'], 'catalogue receipt mutation line')
      if (integer(decoded.index, 'catalogue receipt mutation index') !== mutations.length) throw new Error('catalogue receipt mutation order is invalid')
      mutations.push(record(decoded.mutation, 'catalogue receipt mutation') as CatalogueApplyReceipt['mutations'][number])
    } else if (decoded.type === 'footer') {
      exactKeys(decoded, ['type', 'protectedScopes', 'mutations', 'receiptFingerprint', 'streamSha256'], 'catalogue receipt footer')
      footer = decoded as ReceiptFooter
      if (integer(footer.protectedScopes, 'catalogue receipt footer scope count') !== scopes.length || integer(footer.mutations, 'catalogue receipt footer mutation count') !== mutations.length || sha256(footer.receiptFingerprint, 'catalogue receipt footer fingerprint') !== expectedReceiptFingerprint || sha256(footer.streamSha256, 'catalogue receipt stream SHA-256') !== streamHash.copy().digest('hex')) {
        throw new Error('catalogue receipt footer mismatch')
      }
      return
    } else {
      throw new Error(`catalogue receipt line ${lineNumber} has an invalid record type`)
    }
    streamHash.update(lineBuffer); streamHash.update('\n')
  }

  for await (const chunk of createReadStream(absolute)) {
    const buffer = chunk as Buffer
    fileHash.update(buffer); bytes += buffer.length
    if (bytes > expectedBytes) throw new Error('catalogue receipt file byte count changed while reading')
    pending = pending.length ? Buffer.concat([pending, buffer]) : Buffer.from(buffer)
    let newline: number
    while ((newline = pending.indexOf(0x0a)) >= 0) {
      consume(pending.subarray(0, newline))
      pending = pending.subarray(newline + 1)
    }
    if (pending.length > maxLineBytes) throw new Error(`catalogue receipt line ${lineNumber + 1} exceeds the size limit`)
  }
  if (pending.length) throw new Error('catalogue receipt must end with LF')
  if (!header || !footer) throw new Error('catalogue receipt lacks its header or footer')
  if (bytes !== expectedBytes) throw new Error('catalogue receipt file byte count changed while reading')
  const actualFileSha = fileHash.digest('hex')
  if (actualFileSha !== expectedFileSha) throw new Error('catalogue receipt file SHA-256 mismatch')
  const receipt = {
    schemaVersion: header.schemaVersion, operationId: header.operationId, countryCode: header.countryCode,
    catalogueVersionId: header.catalogueVersionId, registryVersionId: header.registryVersionId,
    sourceEvidence: header.sourceEvidence, sourceEvidenceFingerprint: header.sourceEvidenceFingerprint,
    targetSnapshotFingerprint: header.targetSnapshotFingerprint, planFingerprint: header.planFingerprint,
    createdAt: header.createdAt, protectedScopes: scopes, mutations, fingerprint: footer.receiptFingerprint,
  } satisfies CatalogueApplyReceipt
  assertReceiptEnvelope(receipt)
  const descriptor = {
    path: absolute, sha256: actualFileSha, bytes, receiptFingerprint: receipt.fingerprint,
    streamSha256: footer.streamSha256, protectedScopes: scopes.length, mutations: mutations.length,
  }
  return frozen({ receipt, descriptor })
}
