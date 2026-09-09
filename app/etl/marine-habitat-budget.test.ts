import { afterAll, expect, it, vi } from 'vitest'

vi.mock('node:fs', () => ({ existsSync: () => false, mkdirSync: () => {}, writeFileSync: () => {} }))
afterAll(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers() })

it('charges real WoRMS HTTP attempts to ETL_BUDGET and preserves the first operational batch', async () => {
  vi.stubEnv('ETL_BUDGET', '1')
  vi.useFakeTimers()
  const network = vi.fn(async (url: string) => {
    const parsed = new URL(url)
    expect(parsed.searchParams.get('marine_only')).toBe('false')
    return Response.json(parsed.searchParams.getAll('scientificnames[]').map(() => []))
  })
  vi.stubGlobal('fetch', network)
  const { catalogueHabitatResolver } = await import('./marine-habitat')
  const { withResponseCapture, failedCaptureRequests } = await import('./fetch')
  type Batch = import('./marine-habitat').StoredHabitatBatch
  const batches: Batch[] = []
  const store = { loadHabitat: async () => batches, saveHabitat: async (_id: string, batch: Batch) => { batches.push(batch) } }
  const names = Array.from({ length: 21 }, (_, index) => `Budget example${index}`)
  const failed = withResponseCapture(() => catalogueHabitatResolver('budget-test', store)(names)).catch((error) => error)
  await vi.runAllTimersAsync()
  const failure = await failed
  expect(failure.message).toContain('total request budget exhausted')
  expect(network).toHaveBeenCalledTimes(1)
  expect(batches).toHaveLength(1)
  expect(batches[0]!.names).toHaveLength(20)
  expect(failedCaptureRequests(failure)).toMatchObject({ networkAttempts: 1, perHost: { 'marinespecies.org': 1 } })
})
