'use client'

import { useSyncExternalStore } from 'react'
import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next'

const PRIVATE_SIGHTING_PATH = /^\/(de|en)\/sighting\/[^/]+\/?$/

/** Vercel's callback is the last boundary before a page view enters the analytics script. */
export function sanitizeAnalyticsPageView(event: BeforeSendEvent, expectedOrigin: string): BeforeSendEvent | null {
  if (event.type !== 'pageview') return null

  try {
    const origin = new URL(expectedOrigin)
    const url = new URL(event.url, origin)
    if (!['http:', 'https:'].includes(origin.protocol) || url.origin !== origin.origin || url.username || url.password) return null

    url.search = ''
    url.hash = ''
    url.pathname = url.pathname.replace(PRIVATE_SIGHTING_PATH, '/$1/sighting/[id]')
    return { ...event, url: url.href }
  } catch {
    return null
  }
}

/**
 * `beforeSend` does not cover the referrer collected by Vercel's script. A document with an
 * unexpectedly detailed initial referrer therefore does not load analytics at all. Cross-origin
 * referrers are accepted only in the origin-only form produced by the site's referrer policy.
 */
export function isSafeAnalyticsReferrer(referrer: string, expectedOrigin: string): boolean {
  if (!referrer) return true
  try {
    const origin = new URL(expectedOrigin)
    const url = new URL(referrer)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) return false
    if (url.origin !== origin.origin && url.pathname !== '/') return false
    return !PRIVATE_SIGHTING_PATH.test(url.pathname)
  } catch {
    return false
  }
}

export function AnalyticsClient() {
  const allowed = useSyncExternalStore(
    () => () => undefined,
    () => isSafeAnalyticsReferrer(document.referrer, window.location.origin),
    () => false,
  )

  if (!allowed) return null
  return <Analytics mode="production" beforeSend={(event) => sanitizeAnalyticsPageView(event, window.location.origin)} />
}
