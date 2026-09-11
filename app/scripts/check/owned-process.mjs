import { rmSync } from 'node:fs'

const exited = (proc) => proc.exitCode !== null || proc.signalCode !== null || !proc.pid
const waitForExit = (proc, timeout) => new Promise((resolve) => {
  if (exited(proc)) return resolve(true)
  const done = () => { clearTimeout(timer); resolve(true) }
  const timer = setTimeout(() => { proc.off('exit', done); resolve(false) }, timeout)
  proc.once('exit', done)
})

// Cleanup must never replace the assertion that brought us here. A cleanup failure still
// fails the command, and retains the profile when the owned process cannot be stopped.
export async function stopOwnedProcess(proc, profile) {
  try {
    if (!exited(proc)) proc.kill('SIGTERM')
    if (!await waitForExit(proc, 5000)) {
      proc.kill('SIGKILL')
      if (!await waitForExit(proc, 5000)) throw new Error('Owned process did not exit; profile retained')
    }
    if (profile) rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
  } catch (error) {
    console.error('Owned process cleanup failed:', error)
    process.exitCode = 1
  }
}
