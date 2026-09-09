import { spawnSync } from 'node:child_process'

export const MIGRATION_MESSAGES = Object.freeze({
  skipped: 'migrate: skipped outside the production deployment context',
  refused: 'migrate: context refused (MIGRATE_CONTEXT_REFUSED)',
  missingDatabase: 'migrate: production database configuration is unavailable',
  driverFailure: 'migrate: database driver could not be loaded',
  wakeFailure: 'migrate: database did not wake within 90 s',
  migrationFailure: 'migrate: prisma migrate deploy failed after 3 attempts',
})

const validTarget = (value) => /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(value)

/** Classify only Vercel's deployment-context variables. Never inspect credentials or inference signals. */
export function classifyMigrationContext(environment) {
  if (environment.VERCEL !== '1') return { decision: 'refuse', reason: 'platform' }
  const deployment = environment.VERCEL_ENV
  const target = environment.VERCEL_TARGET_ENV
  const targetPresent = target !== undefined
  if (targetPresent && (typeof target !== 'string' || !validTarget(target))) return { decision: 'refuse', reason: 'target' }
  if (deployment === 'production') {
    return !targetPresent || target === 'production'
      ? { decision: 'allow', reason: 'production' }
      : { decision: 'refuse', reason: 'contradictory-target' }
  }
  if (deployment === 'preview' || deployment === 'development') {
    return target === 'production'
      ? { decision: 'refuse', reason: 'contradictory-target' }
      : { decision: 'skip', reason: 'non-production' }
  }
  return { decision: 'refuse', reason: 'environment' }
}

const defaultDependencies = {
  loadPg: () => import('pg'),
  spawn: spawnSync,
  now: Date.now,
  sleep: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  log: (message) => console.log(message),
  error: (message) => console.error(message),
}

/** Testable orchestration. Returns a process exit code and never prints raw errors or child output. */
export async function runDeploymentMigration(environment = process.env, dependencies = {}) {
  const decision = classifyMigrationContext(environment)
  const tools = { ...defaultDependencies, ...dependencies }
  if (decision.decision === 'skip') {
    tools.log(MIGRATION_MESSAGES.skipped)
    return 0
  }
  if (decision.decision === 'refuse') {
    tools.error(MIGRATION_MESSAGES.refused)
    return 1
  }

  // Credential reads start only after an exact production allow decision.
  const url = environment.DATABASE_URL_UNPOOLED ?? environment.DATABASE_URL
  if (!url) {
    tools.error(MIGRATION_MESSAGES.missingDatabase)
    return 1
  }

  let Client
  try {
    const driverModule = await tools.loadPg()
    Client = driverModule.default?.Client ?? driverModule.Client
    if (typeof Client !== 'function') throw new Error('missing Client export')
  } catch {
    tools.error(MIGRATION_MESSAGES.driverFailure)
    return 1
  }

  const deadline = tools.now() + 90_000
  for (let attempt = 1; ; attempt++) {
    let client
    try {
      client = new Client({ connectionString: url, connectionTimeoutMillis: 20_000 })
      await client.connect()
      await client.query('select 1')
      tools.log(`migrate: database awake after ${attempt} attempt${attempt === 1 ? '' : 's'}`)
      await client.end()
      break
    } catch {
      try { await client?.end() } catch { /* Fixed diagnostics below own the failure. */ }
      if (tools.now() > deadline) {
        tools.error(MIGRATION_MESSAGES.wakeFailure)
        return 1
      }
      tools.log(`migrate: database wake attempt ${attempt} failed; retrying`)
      await tools.sleep(3_000)
    }
  }

  // Prisma retains ownership of migration locking. Output is captured and discarded
  // so a child failure cannot echo a connection URI or other secret into build logs.
  for (let attempt = 1; attempt <= 3; attempt++) {
    let result
    try { result = tools.spawn('npx', ['prisma', 'migrate', 'deploy'], { encoding: 'utf8', stdio: 'pipe' }) }
    catch { result = { status: null } }
    if (result.status === 0) return 0
    tools.log(`migrate: prisma migrate deploy failed (attempt ${attempt} of 3)`)
  }
  tools.error(MIGRATION_MESSAGES.migrationFailure)
  return 1
}
