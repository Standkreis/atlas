import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { writeTransferJsonl, type TransferSpec } from './catalogue-transfer'

const roots: string[] = []
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))))

describe('catalogue transfer stream', () => {
  it('pages and incrementally hashes a Germany-scale payload without retaining it', async () => {
    const root = await mkdtemp(join(tmpdir(), 'atlas-transfer-')); roots.push(root)
    const rows = 250_000
    const spec: TransferSpec = { table: 'CataloguePlausibility', columns: ['id', 'obs'], sql: 'fixture' }
    let largestPage = 0, calls = 0
    const result = await writeTransferJsonl({
      catalogueId: 'catalogue-1', path: join(root, 'transfer.jsonl'), specs: [spec], pageSize: 1_000,
      fetchPage: async (_spec, limit, offset) => {
        calls++
        const length = Math.max(0, Math.min(limit, rows - offset)); largestPage = Math.max(largestPage, length)
        return Array.from({ length }, (_, index) => ({ id: offset + index, obs: 10 }))
      },
    })
    expect(result.tables[0]).toMatchObject({ rows, columns: ['id', 'obs'] })
    expect(result.artifact.rows).toBe(rows)
    expect(largestPage).toBe(1_000)
    expect(calls).toBe(251)
    const bytes = await readFile(join(root, 'transfer.jsonl'))
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(result.artifact.sha256)
    expect(bytes.subarray(0, 200).toString()).not.toContain('Identity')
  }, 30_000)

  it('rejects an unbounded page size', async () => {
    await expect(writeTransferJsonl({ catalogueId: 'x', path: '/tmp/unused-transfer.jsonl', pageSize: 5_001, specs: [], fetchPage: async () => [] })).rejects.toThrow('1 to 5000')
  })

  it('fails closed when a query returns a column outside its reviewed allowlist', async () => {
    const root = await mkdtemp(join(tmpdir(), 'atlas-transfer-')); roots.push(root)
    const spec: TransferSpec = { table: 'Taxon', columns: ['id'], sql: 'fixture' }
    await expect(writeTransferJsonl({
      catalogueId: 'catalogue-1', path: join(root, 'transfer.jsonl'), specs: [spec],
      fetchPage: async () => [{ id: 'taxon-1', accidentallyAdded: 'not reviewed' }],
    })).rejects.toThrow('expected id')
  })
})
