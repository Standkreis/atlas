import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/**
 * A stuck test body must stop the entire disposable-DB run, including Vitest workers.
 * Per-test deadlines in the import-store suite wait for settlement before cleanup.
 * This final process boundary is finite even when a body can never settle.
 * @param {string[]} args
 * @param {{ timeoutMs?: number; stdio?: 'inherit' | 'ignore' }} options
 */
export function runNodeWithDeadline(args, { timeoutMs = 30 * 60_000, stdio = 'inherit' } = {}) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('A finite positive process deadline is required')
  if (process.platform === 'win32') throw new Error('Integration watchdog requires POSIX process-group termination')
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { stdio, detached: true })
    let timedOut = false
    const stop = () => {
      try { process.kill(-child.pid, 'SIGKILL') } catch (error) {
        if (error.code !== 'ESRCH') reject(error)
      }
    }
    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)
    const cleanup = () => {
      clearTimeout(timer)
      process.removeListener('SIGINT', stop)
      process.removeListener('SIGTERM', stop)
    }
    const timer = setTimeout(() => {
      timedOut = true
      if (stdio === 'inherit') console.error(`Integration process exceeded ${timeoutMs} ms; terminating its complete worker group. Discard this disposable DB run.`)
      // No graceful-unwind window: no later test may start against an abandoned writer.
      stop()
    }, timeoutMs)
    child.once('error', (error) => { cleanup(); reject(error) })
    child.once('exit', (code, signal) => {
      cleanup()
      resolve({ code: timedOut ? 1 : (code ?? 1), signal, timedOut })
    })
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const vitest = fileURLToPath(new URL('../../node_modules/vitest/vitest.mjs', import.meta.url))
  const result = await runNodeWithDeadline([vitest, 'run', '--config', 'vitest.integration.config.ts', ...process.argv.slice(2)])
  process.exitCode = result.code
}
