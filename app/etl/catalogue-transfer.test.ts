import { createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { writeTransferJsonl, type TransferSpec } from './catalogue-transfer'

vi.mock('node:fs', async (original) => {
  const actual = await original<typeof import('node:fs')>()
  return { ...actual, createWriteStream: vi.fn(actual.createWriteStream) }
})

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
    expect(await readdir(root)).toEqual([])
  })

  it('closes and removes partial output before returning an immediate source failure', async () => {
    const root = await mkdtemp(join(tmpdir(), 'atlas-transfer-')); roots.push(root)
    const path = join(root, 'transfer.jsonl')
    await writeFile(path, 'previous reviewed artifact')
    const failure = new Error('source stopped')
    await expect(writeTransferJsonl({ catalogueId: 'x', path, specs: [{ table: 'Taxon', columns: ['id'], sql: 'fixture' }],
      fetchPage: async () => { throw failure },
    })).rejects.toBe(failure)
    expect(await readdir(root)).toEqual(['transfer.jsonl'])
    expect(await readFile(path, 'utf8')).toBe('previous reviewed artifact')
  })

  it('reports asynchronous file-open failure without fetching rows or deleting the obstructing path', async () => {
    const root = await mkdtemp(join(tmpdir(), 'atlas-transfer-')); roots.push(root)
    const path = join(root, 'transfer.jsonl'), partial = `${path}.partial-${process.pid}`
    await mkdir(partial)
    const fetchPage = vi.fn(async () => [])
    await expect(writeTransferJsonl({ catalogueId: 'x', path, specs: [{ table: 'Taxon', columns: ['id'], sql: 'fixture' }], fetchPage })).rejects.toMatchObject({ code: 'EISDIR' })
    expect(fetchPage).not.toHaveBeenCalled()
    expect(await readdir(root)).toEqual([`transfer.jsonl.partial-${process.pid}`])
    expect(await readdir(partial)).toEqual([])
  })

  it('cleans a partially written file after a later asynchronous page failure', async () => {
    const root = await mkdtemp(join(tmpdir(), 'atlas-transfer-')); roots.push(root)
    let calls = 0
    await expect(writeTransferJsonl({ catalogueId: 'x', path: join(root, 'transfer.jsonl'), pageSize: 1,
      specs: [{ table: 'Taxon', columns: ['id'], sql: 'fixture' }], fetchPage: async () => {
        if (++calls === 1) return [{ id: 'first' }]
        await new Promise<void>((done) => setImmediate(done))
        throw new Error('next page failed')
      },
    })).rejects.toThrow('next page failed')
    expect(calls).toBe(2)
    expect(await readdir(root)).toEqual([])
  })

  it('handles an asynchronous stream error while a source page is pending and removes the partial', async () => {
    const root = await mkdtemp(join(tmpdir(), 'atlas-transfer-')); roots.push(root)
    const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
    let stream: ReturnType<typeof createWriteStream> | undefined
    vi.mocked(createWriteStream).mockImplementationOnce((...args) => (stream = actual.createWriteStream(...args)))
    const failure = Object.assign(new Error('simulated disk failure'), { code: 'EIO' })
    await expect(writeTransferJsonl({ catalogueId: 'x', path: join(root, 'transfer.jsonl'),
      specs: [{ table: 'Taxon', columns: ['id'], sql: 'fixture' }], fetchPage: async () => {
        stream!.destroy(failure)
        // Let error/close arrive before the page promise settles: finished() must already
        // have an error handler rather than creating an unhandled rejection during this gap.
        await new Promise<void>((done) => setImmediate(done))
        return []
      },
    })).rejects.toBe(failure)
    expect(await readdir(root)).toEqual([])
  })
})
