// Vercel build entrypoint. Context is classified before database credentials,
// the pg module, timers, connections, or subprocesses are touched.
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { runDeploymentMigration } from './migration-context.mjs'

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) process.exitCode = await runDeploymentMigration()
