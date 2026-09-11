import { expect, it } from 'vitest'
import { runNodeWithDeadline } from '../../../scripts/check/integration.mjs'

it('retains normal child success and failure exit codes', async () => {
  await expect(runNodeWithDeadline(['-e', 'process.exit(0)'], { timeoutMs: 5000, stdio: 'ignore' })).resolves.toMatchObject({ code: 0, timedOut: false })
  await expect(runNodeWithDeadline(['-e', 'process.exit(7)'], { timeoutMs: 5000, stdio: 'ignore' })).resolves.toMatchObject({ code: 7, timedOut: false })
})

it('fails and kills an uncooperative test process at the finite outer boundary', async () => {
  await expect(runNodeWithDeadline(['-e', 'setInterval(() => {}, 1000)'], { timeoutMs: 50, stdio: 'ignore' }))
    .resolves.toEqual({ code: 1, timedOut: true, signal: 'SIGKILL' })
})
