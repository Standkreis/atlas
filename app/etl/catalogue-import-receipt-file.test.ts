import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { catalogueImportDigest } from './catalogue-import-json'
import {
  readCatalogueReceiptFile,
  writeCanonicalExclusiveFile,
  writeCatalogueReceiptFile,
} from './catalogue-import-receipt-file'
import type { CatalogueApplyReceipt } from './catalogue-import-store'

const digest = (character: string) => character.repeat(64)

function receipt(): CatalogueApplyReceipt {
  const sourceEvidence = {
    files: [{ role: 'base artifact', path: '/owner-only/base.jsonl', sha256: digest('1'), bytes: 123 }],
    tables: [{ table: 'Taxon', columns: ['id'], rows: 1, digest: digest('2') }],
    decodedFingerprint: digest('3'),
  }
  const payload: Omit<CatalogueApplyReceipt, 'fingerprint'> = {
    schemaVersion: 1,
    operationId: 'germany-cutover-test',
    countryCode: 'DE',
    catalogueVersionId: 'catalogue-v7',
    registryVersionId: 'registry-v1',
    sourceEvidence,
    sourceEvidenceFingerprint: catalogueImportDigest(sourceEvidence),
    targetSnapshotFingerprint: digest('5'),
    planFingerprint: digest('6'),
    createdAt: '2026-09-11T12:00:00.000Z',
    protectedScopes: [{ table: 'Identity', columns: ['id'], selector: { kind: 'all' }, beforeRows: 1, beforeFingerprint: digest('7') }],
    mutations: [{
      phase: 'materialize', table: 'Taxon', key: { id: 'taxon-1' }, before: null,
      after: { id: 'taxon-1', sciName: 'Alauda arvensis', commonNames: { de: 'Feldlerche' } },
    }],
  }
  return { ...payload, fingerprint: catalogueImportDigest(payload) }
}

describe('catalogue import receipt files', () => {
  it('writes and reads a canonical owner-only JSONL receipt with two independent digests', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'catalogue-receipt-'))
    const path = join(directory, 'receipt.jsonl')
    const written = await writeCatalogueReceiptFile(path, receipt())
    expect((await stat(path)).mode & 0o777).toBe(0o600)
    const text = await readFile(path, 'utf8')
    expect(text.split('\n').filter(Boolean).map(line => JSON.parse(line).type)).toEqual(['header', 'scope', 'mutation', 'footer'])

    const decoded = await readCatalogueReceiptFile(path, {
      sha256: written.sha256,
      bytes: written.bytes,
      receiptFingerprint: written.receiptFingerprint,
    })
    expect(decoded.receipt).toEqual(receipt())
    expect(decoded.descriptor).toEqual(written)
    expect(Object.isFrozen(decoded.receipt.mutations[0]?.after)).toBe(true)
  })

  it('rejects exact-file drift, payload pin drift, duplicate fields, and noncanonical JSON', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'catalogue-receipt-drift-'))
    const path = join(directory, 'receipt.jsonl')
    const written = await writeCatalogueReceiptFile(path, receipt())
    await expect(readCatalogueReceiptFile(path, { sha256: written.sha256, bytes: written.bytes - 1, receiptFingerprint: written.receiptFingerprint }))
      .rejects.toThrow('file type or byte count mismatch')
    await expect(readCatalogueReceiptFile(path, { sha256: digest('a'), bytes: written.bytes, receiptFingerprint: written.receiptFingerprint }))
      .rejects.toThrow('file SHA-256 mismatch')
    await expect(readCatalogueReceiptFile(path, { sha256: written.sha256, bytes: written.bytes, receiptFingerprint: digest('b') }))
      .rejects.toThrow('footer mismatch')

    const original = await readFile(path, 'utf8')
    const duplicate = join(directory, 'duplicate.jsonl')
    await writeFile(duplicate, original.replace('"type":"header"', '"type":"header","type":"header"'))
    await expect(readCatalogueReceiptFile(duplicate, { sha256: written.sha256, bytes: (await stat(duplicate)).size, receiptFingerprint: written.receiptFingerprint }))
      .rejects.toThrow('not canonical JSON')
    const spaced = join(directory, 'spaced.jsonl')
    await writeFile(spaced, original.replace('{', '{ '))
    await expect(readCatalogueReceiptFile(spaced, { sha256: written.sha256, bytes: (await stat(spaced)).size, receiptFingerprint: written.receiptFingerprint }))
      .rejects.toThrow('not canonical JSON')
  })

  it('uses exclusive creation for receipts and small canonical records', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'catalogue-exclusive-'))
    const receiptPath = join(directory, 'receipt.jsonl')
    await writeCatalogueReceiptFile(receiptPath, receipt())
    await expect(writeCatalogueReceiptFile(receiptPath, receipt())).rejects.toMatchObject({ code: 'EEXIST' })

    const recordPath = join(directory, 'plan-record.json')
    const record = await writeCanonicalExclusiveFile(recordPath, { z: 2, a: 1 })
    expect(await readFile(recordPath, 'utf8')).toBe('{"a":1,"z":2}\n')
    expect(record.contentDigest).toBe(catalogueImportDigest({ z: 2, a: 1 }))
    await expect(writeCanonicalExclusiveFile(recordPath, { a: 1 })).rejects.toMatchObject({ code: 'EEXIST' })
  })
})
