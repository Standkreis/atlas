import { afterEach, expect, it, vi } from 'vitest'
import { createSettledTestLifecycle } from './settledTest'

afterEach(() => vi.useRealTimers())

it('holds timeout failure and cleanup until the late body settles, then permits the next test', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] })
  const lifecycle = createSettledTestLifecycle(), events: string[] = []
  let release!: () => void
  const hold = new Promise<void>((resolve) => { release = resolve })
  const run = lifecycle.run(async () => { await hold; events.push('late write') }, 10)
  const failure = expect(run).rejects.toThrow('exceeded its 10 ms deadline')
  let reported = false
  void run.catch(() => { reported = true })
  await vi.advanceTimersByTimeAsync(11)
  const cleanup = lifecycle.settle().then(() => { events.push('cleanup') })
  await Promise.resolve()
  expect(reported).toBe(false)
  expect(events).toEqual([])
  release()
  await failure
  await cleanup
  await lifecycle.run(async () => { events.push('next test') }, 10)
  expect(events).toEqual(['late write', 'cleanup', 'next test'])
})

it('retains a body rejection after the deadline instead of reporting a pass', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] })
  const lifecycle = createSettledTestLifecycle(), original = new Error('late database failure')
  let reject!: (reason: unknown) => void
  const hold = new Promise<never>((_resolve, fail) => { reject = fail })
  const run = lifecycle.run(() => hold, 10)
  const failure = expect(run).rejects.toMatchObject({ errors: [expect.any(Error), original] })
  await vi.advanceTimersByTimeAsync(11)
  reject(original)
  await failure
  await lifecycle.settle()
})

it('preserves an ordinary failure and returns successful results within the deadline', async () => {
  const lifecycle = createSettledTestLifecycle(), original = new Error('assertion failed')
  await expect(lifecycle.run(async () => { throw original }, 1000)).rejects.toBe(original)
  await lifecycle.settle()
  await expect(lifecycle.run(async () => 42, 1000)).resolves.toBe(42)
})
