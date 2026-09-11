import { describe, expect, it } from 'vitest'
import { cataloguePhase, catalogueRequest, withCatalogueTelemetry, type CatalogueTelemetryEvent } from './catalogue-import-telemetry'

describe('private-data-safe catalogue telemetry', () => {
  it('reports only fixed labels and numeric aggregates for nested phases', async () => {
    const events: CatalogueTelemetryEvent[] = []
    const privateRow = { id: 'private-identifier', email: 'private@example.test', note: 'postgresql://secret' }
    const result = await withCatalogueTelemetry((event) => events.push(event), () => cataloguePhase('before-images', () =>
      catalogueRequest('keyed-read', 'Identity', { rows: 1, bytes: 27 }, async () => [privateRow])))
    expect(result).toEqual([privateRow])
    expect(events.map(({ event, phase, requests, inputRows, inputJsonBytes, outputRows, success }) =>
      ({ event, phase, requests, inputRows, inputJsonBytes, outputRows, success }))).toEqual([
      { event: 'batch', phase: 'before-images', requests: 1, inputRows: 1, inputJsonBytes: 27, outputRows: 1, success: true },
      { event: 'phase', phase: 'before-images', requests: 1, inputRows: 1, inputJsonBytes: 27, outputRows: 1, success: true },
      { event: 'phase', phase: 'command', requests: 1, inputRows: 1, inputJsonBytes: 27, outputRows: 1, success: true },
    ])
    expect(events.every((event) => event.elapsedMs >= 0 && Object.isFrozen(event))).toBe(true)
    expect(JSON.stringify(events)).not.toMatch(/private|secret|postgresql|email|note/)
  })

  it('preserves returned results and original failures when telemetry fails', async () => {
    const broken = () => { throw new Error('broken diagnostic sink') }
    await expect(withCatalogueTelemetry(broken, () => catalogueRequest('upsert', 'Taxon', { rows: 1, bytes: 9 }, async () => 42))).resolves.toBe(42)
    const failure = new Error('private failure details')
    await expect(withCatalogueTelemetry(broken, () => catalogueRequest('delete', 'Taxon', { rows: 1, bytes: 9 }, async () => { throw failure }))).rejects.toBe(failure)
    const events: CatalogueTelemetryEvent[] = []
    await expect(withCatalogueTelemetry((event) => events.push(event), () => catalogueRequest('delete', 'Taxon', { rows: 1, bytes: 9 }, async () => { throw failure }))).rejects.toBe(failure)
    expect(events.every((event) => !event.success)).toBe(true)
    expect(JSON.stringify(events)).not.toContain(failure.message)
  })

  it('does not leak context into subsequent work', async () => {
    const events: CatalogueTelemetryEvent[] = []
    await withCatalogueTelemetry((event) => events.push(event), async () => undefined)
    await cataloguePhase('writes', () => catalogueRequest('upsert', 'Taxon', { rows: 2, bytes: 20 }, async () => 2))
    expect(events).toHaveLength(1)
  })
})
