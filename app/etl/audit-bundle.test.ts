import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { publishAuditBundle } from './audit-bundle'

const roots: string[] = []
async function root() { const path = await mkdtemp(join(tmpdir(), 'atlas-audit-publication-')); roots.push(path); return path }
afterEach(async () => { for (const path of roots.splice(0)) await rm(path, { recursive: true, force: true }) })

describe('new coherent audit bundle publication', () => {
  it('publishes all companion files together only after preparation succeeds', async () => {
    const directory = await root(), output = join(directory, 'complete')
    const result = await publishAuditBundle(output, async (staging) => {
      await writeFile(join(staging, 'artifact.jsonl'), 'payload')
      await expect(readFile(join(output, 'artifact.jsonl'))).rejects.toMatchObject({ code: 'ENOENT' })
      await writeFile(join(staging, 'manifest.json'), 'checked')
      return 'ready'
    })
    expect(result).toBe('ready')
    expect((await readdir(output)).sort()).toEqual(['artifact.jsonl', 'manifest.json'])
    expect(await readdir(directory)).toEqual(['complete'])
  })

  it('does not publish staged payloads when a write or transaction commit fails', async () => {
    const directory = await root(), output = join(directory, 'failed')
    await expect(publishAuditBundle(output, async (staging) => {
      await writeFile(join(staging, 'artifact.jsonl'), 'unpublished')
      throw new Error('injected COMMIT failure')
    })).rejects.toThrow('injected COMMIT failure')
    await expect(readdir(output)).rejects.toMatchObject({ code: 'ENOENT' })
    const retained = (await readdir(directory)).filter((name) => name.startsWith('.failed.pending-'))
    expect(retained).toHaveLength(1)
    expect(await readFile(join(directory, retained[0]!, 'artifact.jsonl'), 'utf8')).toBe('unpublished')
  })

  it('never overwrites an existing bundle, even with a newly blocked audit', async () => {
    const directory = await root(), output = join(directory, 'existing')
    await mkdir(output); await writeFile(join(output, 'artifact.jsonl'), 'original')
    let called = false
    await expect(publishAuditBundle(output, async () => { called = true })).rejects.toThrow('already exists')
    expect(called).toBe(false)
    expect(await readFile(join(output, 'artifact.jsonl'), 'utf8')).toBe('original')
  })

  it('publishes blocked evidence in a fresh directory with no stale artifact', async () => {
    const output = join(await root(), 'blocked')
    await publishAuditBundle(output, async (staging) => { await writeFile(join(staging, 'manifest.json'), '{"eligible":false}') })
    expect(await readdir(output)).toEqual(['manifest.json'])
  })

  it('rejects a concurrent publisher and an output appearing during preparation', async () => {
    const directory = await root(), output = join(directory, 'raced')
    await expect(publishAuditBundle(output, async (staging) => {
      await expect(publishAuditBundle(output, async () => undefined)).rejects.toMatchObject({ code: 'EEXIST' })
      await writeFile(join(staging, 'manifest.json'), 'new')
      await mkdir(output); await writeFile(join(output, 'manifest.json'), 'external')
    })).rejects.toThrow('already exists')
    expect(await readFile(join(output, 'manifest.json'), 'utf8')).toBe('external')
  })
})
