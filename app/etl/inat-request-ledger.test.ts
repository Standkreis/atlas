import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawn } from 'node:child_process'
import { blockInatUntil, dispatchInat, initializeInatLedger, INAT_GAP_MS, INAT_WINDOW_MS } from './inat-request-ledger'

const directories: string[] = []
const start = Date.parse('2026-09-09T10:00:00Z')
const temporary = () => { const dir = mkdtempSync(join(tmpdir(), 'atlas-inat-ledger-')); directories.push(dir); return join(dir, 'ledger.json') }
const state = (path: string) => JSON.parse(readFileSync(path, 'utf8')).ledger
const init = (path: string, dailyLimit = 10_000, holdUntil = start) => initializeInatLedger(path, { holdUntil: new Date(holdUntil).toISOString(), reason: 'Synthetic test history explicitly accounted for', dailyLimit }, start)
afterEach(() => { vi.restoreAllMocks(); for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true }) })

describe('durable participating-process iNaturalist allowance', () => {
  it('requires explicit known history and UTC uncertainty hold; never auto-initializes or overwrites', async () => {
    const path = temporary(), dispatch = vi.fn(async () => 'sent')
    await expect(dispatchInat(dispatch, { path, now: () => start })).rejects.toThrow('missing or corrupt history')
    expect(existsSync(path)).toBe(false)
    await expect(initializeInatLedger(path, { holdUntil: 'tomorrow', reason: 'Unknown history' }, start)).rejects.toThrow('explicit UTC')
    await expect(initializeInatLedger(path, { holdUntil: new Date(start).toISOString(), reason: 'Unknown history', dailyLimit: 10_001 }, start)).rejects.toThrow()
    await init(path, 10_000, start + INAT_WINDOW_MS)
    await expect(dispatchInat(dispatch, { path, now: () => start })).rejects.toThrow('initial uncertainty hold')
    await expect(init(path)).rejects.toThrow('refuses existing')
    expect(dispatch).not.toHaveBeenCalled()
    expect(state(path).attempts).toEqual([])
  })

  it('reserves before callback, counts rejected attempts, and expires only after rolling 24h', async () => {
    const path = temporary(); await init(path, 2)
    const first = vi.fn(async () => { expect(state(path).attempts).toEqual([start]); throw new Error('synthetic network error') })
    await expect(dispatchInat(first, { path, now: () => start })).rejects.toThrow('synthetic network error')
    await expect(dispatchInat(async () => 'ok', { path, now: () => start + INAT_GAP_MS })).resolves.toBe('ok')
    const extra = vi.fn(async () => 'must not dispatch')
    await expect(dispatchInat(extra, { path, now: () => start + INAT_WINDOW_MS - 1 })).rejects.toThrow('allowance exhausted')
    expect(extra).not.toHaveBeenCalled()
    await expect(dispatchInat(async () => 'next window', { path, now: () => start + INAT_WINDOW_MS })).resolves.toBe('next window')
    expect(state(path).attempts).toEqual([start + INAT_GAP_MS, start + INAT_WINDOW_MS])
  })

  it('defaults to a conservative 9000 ceiling and aborts waiters without dispatch', async () => {
    const path = temporary()
    await initializeInatLedger(path, { holdUntil: new Date(start).toISOString(), reason: 'Synthetic accounted history' }, start)
    expect(state(path).dailyLimit).toBe(9_000)
    await dispatchInat(async () => true, { path, now: () => start })
    const controller = new AbortController(), dispatch = vi.fn(async () => 'forbidden')
    const pending = dispatchInat(dispatch, { path, now: () => start, signal: controller.signal })
    const assertion = expect(pending).rejects.toThrow()
    controller.abort()
    await assertion
    expect(dispatch).not.toHaveBeenCalled()
    expect(state(path).attempts).toHaveLength(1)
    expect(existsSync(`${path}.lock`)).toBe(false)
  })

  it('shares spacing/cooldown and uses post-dispatch upper bounds despite slow reservation work', async () => {
    const path = temporary(); await init(path)
    let now = start
    const options = { path, now: () => now, sleep: async (ms: number) => { now += ms } }
    await dispatchInat(async () => { now += 500; return 'first' }, options)
    expect(state(path).attempts).toEqual([start + 500])
    await dispatchInat(async () => { expect(now).toBe(start + 500 + INAT_GAP_MS); return 'second' }, options)
    await blockInatUntil(now + 5_000, options)
    await dispatchInat(async () => { expect(now).toBe(start + 500 + INAT_GAP_MS + 5_000); return 'after cooldown' }, options)
    expect(state(path).attempts).toHaveLength(3)
  })

  it('releases the lock before awaiting network responses', async () => {
    const path = temporary(); await init(path)
    let finish!: (value: string) => void
    const pending = dispatchInat(() => new Promise<string>((done) => { finish = done }), { path, now: () => start })
    await vi.waitFor(() => expect(state(path).attempts).toHaveLength(1))
    expect(existsSync(`${path}.lock`)).toBe(false)
    await expect(dispatchInat(async () => 'second', { path, now: () => start + INAT_GAP_MS })).resolves.toBe('second')
    finish('first'); await expect(pending).resolves.toBe('first')
  })

  it('fails closed on corrupted/unknown history, clock rollback and abandoned locks', async () => {
    const path = temporary(); await init(path)
    const original = readFileSync(path, 'utf8'), dispatch = vi.fn(async () => 'sent')
    for (const corrupt of ['{', '{}', original.replace('Synthetic test', 'Tampered test')]) {
      writeFileSync(path, corrupt)
      await expect(dispatchInat(dispatch, { path, now: () => start })).rejects.toThrow('ledger')
    }
    writeFileSync(path, original)
    await expect(dispatchInat(dispatch, { path, now: () => start - 1 })).rejects.toThrow('backward clock')
    writeFileSync(`${path}.lock`, 'unverifiable stale owner')
    await expect(dispatchInat(dispatch, { path, now: () => start, lockWaitMs: 0 })).rejects.toThrow('never steal')
    expect(readFileSync(`${path}.lock`, 'utf8')).toBe('unverifiable stale owner')
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('rejects relative/traversal/symlink ledger paths', async () => {
    const path = temporary(); await init(path)
    for (const value of ['ledger.json', path.replace('/ledger.json', '/nested/../ledger.json')]) await expect(dispatchInat(async () => true, { path: value })).rejects.toThrow('absolute .json path')
    const alias = path.replace('ledger.json', 'alias.json'); symlinkSync(path, alias)
    await expect(dispatchInat(async () => true, { path: alias })).rejects.toThrow('regular file')
  })

  it('retains a conservative reservation and lock if the process crashes at dispatch', async () => {
    const path = temporary(); await init(path)
    const result = await child(`await dispatchInat(() => { process.exit(17) }, {path: ${JSON.stringify(path)}, now: () => ${start}})`)
    expect(result.code).toBe(17)
    expect(state(path).attempts).toEqual([start])
    expect(existsSync(`${path}.lock`)).toBe(true)
    await expect(dispatchInat(async () => 'forbidden', { path, lockWaitMs: 0 })).rejects.toThrow('never steal')
  })

  it('never dispatches when atomic persistence fails and retains recovery evidence', async () => {
    const path = temporary(); await init(path)
    writeFileSync(`${path}.next`, 'previous interrupted write')
    const dispatch = vi.fn(async () => 'forbidden')
    await expect(dispatchInat(dispatch, { path, now: () => start })).rejects.toThrow('persistence failed')
    expect(dispatch).not.toHaveBeenCalled()
    expect(state(path).attempts).toEqual([])
    expect(existsSync(`${path}.lock`)).toBe(true)
    expect(readFileSync(`${path}.next`, 'utf8')).toBe('previous interrupted write')
  })

  it('preserves ETL_BUDGET=0 misses without requiring or initializing a ledger', async () => {
    const result = await child(`process.env.ETL_BUDGET='0'; delete process.env.ETL_INAT_LEDGER;
      globalThis.fetch=async () => { throw new Error('forbidden synthetic dispatch') };
      const {get,withFreshCache}=await import('./etl/fetch.ts');
      try { await withFreshCache(() => get('https://api.inaturalist.org/synthetic-budget-test')); process.exitCode=18 }
      catch (error) { if (!error.message.includes('total request budget exhausted (0')) throw error }`)
    expect(result).toEqual({ code: 0, stderr: '' })
  })

  it('enforces one allowance across two real processes without losing reservations', async () => {
    const path = temporary(); await init(path, 1)
    const code = `try { await dispatchInat(async () => 'sent', {path: ${JSON.stringify(path)}, now: () => ${start}}); process.exitCode=0 } catch { process.exitCode=19 }`
    const results = await Promise.all([child(code), child(code)])
    expect(results.map((result) => result.code).sort()).toEqual([0, 19])
    expect(state(path).attempts).toEqual([start])
  })
})

function child(code: string) {
  return new Promise<{ code: number | null; stderr: string }>((done, reject) => {
    const process = spawn(globalThis.process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `import {dispatchInat} from './etl/inat-request-ledger.ts'; ${code}`], { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    process.stderr.on('data', (data) => { stderr += data })
    process.on('error', reject)
    process.on('close', (code) => done({ code, stderr }))
  })
}
