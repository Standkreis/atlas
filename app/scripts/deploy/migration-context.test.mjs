import { describe, expect, it, vi } from 'vitest'
import { classifyMigrationContext, MIGRATION_MESSAGES, runDeploymentMigration } from './migration-context.mjs'

const production = (extra = {}) => ({ VERCEL: '1', VERCEL_ENV: 'production', DATABASE_URL: 'postgresql://pooled', ...extra })

function harness({ connectFailures = 0, spawnStatuses = [0], nowValues } = {}) {
  const calls = { clients: [], queries: [], ends: 0 }
  let connects = 0
  class Client {
    constructor(options) { calls.clients.push(options) }
    async connect() {
      connects++
      if (connects <= connectFailures) throw new Error('SECRET connection failure postgresql://user:password@host/db')
    }
    async query(sql) { calls.queries.push(sql) }
    async end() { calls.ends++ }
  }
  const logs = [], errors = []
  const loadPg = vi.fn(async () => ({ default: { Client } }))
  const spawn = vi.fn(() => ({ status: spawnStatuses.shift() ?? 1, stdout: 'SECRET stdout', stderr: 'SECRET stderr' }))
  const sleep = vi.fn(async () => {})
  const now = vi.fn()
  for (const value of nowValues ?? [0]) now.mockReturnValueOnce(value)
  now.mockReturnValue(nowValues?.at(-1) ?? 0)
  return { calls, logs, errors, loadPg, spawn, sleep, now,
    dependencies: { loadPg, spawn, sleep, now, log: (message) => logs.push(message), error: (message) => errors.push(message) } }
}

describe('migration deployment context', () => {
  it.each([
    [{ VERCEL: '1', VERCEL_ENV: 'production' }, 'allow'],
    [{ VERCEL: '1', VERCEL_ENV: 'production', VERCEL_TARGET_ENV: 'production' }, 'allow'],
    [{ VERCEL: '1', VERCEL_ENV: 'preview' }, 'skip'],
    [{ VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_TARGET_ENV: 'staging' }, 'skip'],
    [{ VERCEL: '1', VERCEL_ENV: 'development', VERCEL_TARGET_ENV: 'development' }, 'skip'],
    [{ VERCEL: '1', VERCEL_ENV: 'production', VERCEL_TARGET_ENV: 'preview' }, 'refuse'],
    [{ VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_TARGET_ENV: 'production' }, 'refuse'],
    [{ VERCEL: '1' }, 'refuse'],
    [{ VERCEL: '1', VERCEL_ENV: 'Production' }, 'refuse'],
    [{ VERCEL: '1', VERCEL_ENV: ' production ' }, 'refuse'],
    [{ VERCEL: '1', VERCEL_ENV: 'custom' }, 'refuse'],
    [{ VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_TARGET_ENV: '' }, 'refuse'],
    [{ VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_TARGET_ENV: ' bad ' }, 'refuse'],
    [{ VERCEL: undefined, VERCEL_ENV: 'production' }, 'refuse'],
    [{ VERCEL: '', VERCEL_ENV: 'production' }, 'refuse'],
    [{ VERCEL: '0', VERCEL_ENV: 'production' }, 'refuse'],
    [{ VERCEL: 'true', VERCEL_ENV: 'production' }, 'refuse'],
    [{ VERCEL: ' 1 ', VERCEL_ENV: 'production' }, 'refuse'],
  ])('classifies %o as %s', (environment, expected) => {
    expect(classifyMigrationContext(environment).decision).toBe(expected)
  })

  it.each(['preview', 'development'])('skips %s before reading malformed credentials or invoking side effects', async (deployment) => {
    let credentialReads = 0
    const environment = new Proxy({ VERCEL: '1', VERCEL_ENV: deployment }, { get(target, property) {
      if (String(property).startsWith('DATABASE_')) { credentialReads++; throw new Error('SECRET malformed credential') }
      return target[property]
    } })
    const h = harness()
    expect(await runDeploymentMigration(environment, h.dependencies)).toBe(0)
    expect(credentialReads).toBe(0)
    expect(h.loadPg).not.toHaveBeenCalled()
    expect(h.spawn).not.toHaveBeenCalled()
    expect(h.sleep).not.toHaveBeenCalled()
    expect(h.calls.clients).toEqual([])
    expect(h.logs).toEqual([MIGRATION_MESSAGES.skipped])
  })

  it.each(['preview', 'development'])('skips %s with missing credentials', async (deployment) => {
    const h = harness()
    expect(await runDeploymentMigration({ VERCEL: '1', VERCEL_ENV: deployment }, h.dependencies)).toBe(0)
    expect(h.loadPg).not.toHaveBeenCalled()
    expect(h.spawn).not.toHaveBeenCalled()
    expect(h.sleep).not.toHaveBeenCalled()
    expect(h.calls.clients).toEqual([])
  })

  it.each([
    {},
    { VERCEL: '1' },
    { VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_TARGET_ENV: 'production' },
    { VERCEL: '1', VERCEL_ENV: 'Production', CI: '1', NODE_ENV: 'production', VERCEL_GIT_COMMIT_REF: 'main', VERCEL_PROJECT_PRODUCTION_URL: 'atlas.example' },
  ])('refuses unverified context before credentials and every effect', async (base) => {
    let credentialReads = 0
    const environment = new Proxy(base, { get(target, property) {
      if (String(property).startsWith('DATABASE_')) { credentialReads++; throw new Error('SECRET') }
      return target[property]
    } })
    const h = harness()
    expect(await runDeploymentMigration(environment, h.dependencies)).toBe(1)
    expect(credentialReads).toBe(0)
    expect(h.loadPg).not.toHaveBeenCalled()
    expect(h.spawn).not.toHaveBeenCalled()
    expect(h.sleep).not.toHaveBeenCalled()
    expect(h.errors).toEqual([MIGRATION_MESSAGES.refused])
  })

  it.each([undefined, 'production'])('allows exact production target %s and prefers the unpooled URL', async (target) => {
    const h = harness()
    const environment = production({ DATABASE_URL_UNPOOLED: 'postgresql://unpooled', ...(target ? { VERCEL_TARGET_ENV: target } : {}) })
    expect(await runDeploymentMigration(environment, h.dependencies)).toBe(0)
    expect(h.calls.clients).toEqual([{ connectionString: 'postgresql://unpooled', connectionTimeoutMillis: 20_000 }])
    expect(h.calls.queries).toEqual(['select 1'])
    expect(h.spawn).toHaveBeenCalledOnce()
    expect(h.spawn).toHaveBeenCalledWith('npx', ['prisma', 'migrate', 'deploy'], { encoding: 'utf8', stdio: 'pipe' })
  })

  it('fails safely when production database configuration is missing', async () => {
    const h = harness()
    expect(await runDeploymentMigration({ VERCEL: '1', VERCEL_ENV: 'production' }, h.dependencies)).toBe(1)
    expect(h.errors).toEqual([MIGRATION_MESSAGES.missingDatabase])
    expect(h.loadPg).not.toHaveBeenCalled()
    expect(h.spawn).not.toHaveBeenCalled()
  })

  it('retains bounded wake and Prisma retry behavior', async () => {
    const h = harness({ connectFailures: 2, spawnStatuses: [1, 1, 0], nowValues: [0, 1_000, 2_000] })
    expect(await runDeploymentMigration(production(), h.dependencies)).toBe(0)
    expect(h.calls.clients).toHaveLength(3)
    expect(h.sleep).toHaveBeenCalledTimes(2)
    expect(h.sleep).toHaveBeenCalledWith(3_000)
    expect(h.spawn).toHaveBeenCalledTimes(3)
  })

  it('bounds wake failures and never emits injected secrets', async () => {
    const h = harness({ connectFailures: 2, nowValues: [0, 90_001] })
    const environment = production({ DATABASE_URL_UNPOOLED: 'postgresql://SECRET-user:SECRET-password@SECRET-host/db' })
    expect(await runDeploymentMigration(environment, h.dependencies)).toBe(1)
    expect(h.errors).toContain(MIGRATION_MESSAGES.wakeFailure)
    expect([...h.logs, ...h.errors].join('\n')).not.toMatch(/SECRET|password|postgresql:\/\//)
  })

  it('captures child output, retries three times, and emits only fixed diagnostics', async () => {
    const h = harness({ spawnStatuses: [1, 1, 1] })
    h.spawn.mockImplementation(() => ({ status: 1, stdout: 'SECRET URI postgresql://user:password@host/db', stderr: 'SECRET failure' }))
    expect(await runDeploymentMigration(production(), h.dependencies)).toBe(1)
    expect(h.spawn).toHaveBeenCalledTimes(3)
    expect(h.errors).toContain(MIGRATION_MESSAGES.migrationFailure)
    expect([...h.logs, ...h.errors].join('\n')).not.toMatch(/SECRET|password|postgresql:\/\//)
  })

  it('sanitizes driver and spawn exceptions', async () => {
    const driver = harness()
    driver.loadPg.mockRejectedValue(new Error('SECRET driver'))
    expect(await runDeploymentMigration(production(), driver.dependencies)).toBe(1)
    expect(driver.errors).toEqual([MIGRATION_MESSAGES.driverFailure])

    const child = harness()
    child.spawn.mockImplementation(() => { throw new Error('SECRET child') })
    expect(await runDeploymentMigration(production(), child.dependencies)).toBe(1)
    expect([...child.logs, ...child.errors].join('\n')).not.toContain('SECRET')
  })
})
