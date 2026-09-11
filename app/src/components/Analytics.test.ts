import { describe, expect, it } from 'vitest'
import { isSafeAnalyticsReferrer, sanitizeAnalyticsPageView } from './Analytics'
import { isProductionAnalyticsEnvironment } from './AnalyticsBoundary'

const origin = 'https://atlas.standkreis.de'

describe('analytics production boundary', () => {
  it('enables only the exact Vercel production context', () => {
    expect(isProductionAnalyticsEnvironment({ VERCEL: '1', VERCEL_ENV: 'production' })).toBe(true)
    expect(isProductionAnalyticsEnvironment({ VERCEL: '1', VERCEL_ENV: 'production', VERCEL_TARGET_ENV: 'production' })).toBe(true)
    for (const env of [
      {},
      { VERCEL: '1' },
      { VERCEL: '1', VERCEL_ENV: 'preview' },
      { VERCEL: '1', VERCEL_ENV: 'production', VERCEL_TARGET_ENV: 'preview' },
      { VERCEL: '1', VERCEL_ENV: 'production', VERCEL_TARGET_ENV: '' },
      { VERCEL: '0', VERCEL_ENV: 'production' },
    ]) expect(isProductionAnalyticsEnvironment(env)).toBe(false)
  })
})

describe('analytics page-view privacy', () => {
  it('strips query strings and fragments and replaces private sighting ids', () => {
    expect(sanitizeAnalyticsPageView(
      { type: 'pageview', url: `${origin}/de/sighting/01234567-89ab-cdef-0123-456789abcdef?token=private#note` },
      origin,
    )).toEqual({ type: 'pageview', url: `${origin}/de/sighting/[id]` })
    expect(sanitizeAnalyticsPageView(
      { type: 'pageview', url: '/en/species/123?from=private#facts' },
      origin,
    )).toEqual({ type: 'pageview', url: `${origin}/en/species/123` })
  })

  it('fails closed for custom events, foreign origins, credentials, and malformed URLs', () => {
    expect(sanitizeAnalyticsPageView({ type: 'event', url: `${origin}/en` }, origin)).toBeNull()
    expect(sanitizeAnalyticsPageView({ type: 'pageview', url: 'https://example.com/en' }, origin)).toBeNull()
    expect(sanitizeAnalyticsPageView({ type: 'pageview', url: 'https://name:secret@atlas.standkreis.de/en' }, origin)).toBeNull()
    expect(sanitizeAnalyticsPageView({ type: 'pageview', url: 'http://[' }, origin)).toBeNull()
    expect(sanitizeAnalyticsPageView({ type: 'pageview', url: '::not a URL' }, 'not an origin')).toBeNull()
  })

  it('rejects initial referrers that can carry private paths or URL data', () => {
    expect(isSafeAnalyticsReferrer('', origin)).toBe(true)
    expect(isSafeAnalyticsReferrer(`${origin}/`, origin)).toBe(true)
    expect(isSafeAnalyticsReferrer(`${origin}/en/species/123`, origin)).toBe(true)
    expect(isSafeAnalyticsReferrer(`${origin}/en/sighting/private-id`, origin)).toBe(false)
    expect(isSafeAnalyticsReferrer(`${origin}/en?identity=private`, origin)).toBe(false)
    expect(isSafeAnalyticsReferrer('https://example.com/', origin)).toBe(true)
    expect(isSafeAnalyticsReferrer('https://example.com/article', origin)).toBe(false)
    expect(isSafeAnalyticsReferrer('not a URL', origin)).toBe(false)
  })
})
