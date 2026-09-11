'use client'

import { useSyncExternalStore } from 'react'
import { Analytics, type BeforeSendEvent } from '@vercel/analytics/react'
import { usePathname } from 'next/navigation'

const PRIVATE_SIGHTING_PATH = /^\/(de|en)\/sighting(?:\/.*)?$/
const PUBLIC_PATH = /^\/(?:$|(de|en)(?:\/?|\/(?:journal|log|onboarding|quests|settings|sources|you)\/?|\/species\/\d+\/?))$/

/** Decode once, then reject ambiguous/double-encoded and unknown routes rather than reporting them. */
export function sanitizeAnalyticsPathname(pathname: string): string | null {
  try {
    if (!pathname.startsWith('/') || pathname.includes('?') || pathname.includes('#')) return null
    const decoded = decodeURIComponent(pathname)
    if (decoded.includes('%') || /[\u0000-\u001f\u007f]/.test(decoded)) return null
    const sighting = decoded.match(PRIVATE_SIGHTING_PATH)
    if (sighting) return `/${sighting[1]}/sighting/[id]`
    return PUBLIC_PATH.test(decoded) ? decoded : null
  } catch {
    return null
  }
}

/** Vercel's callback is the last boundary before a page view enters the analytics script. */
export function sanitizeAnalyticsPageView(event: BeforeSendEvent, expectedOrigin: string): BeforeSendEvent | null {
  if (event.type !== 'pageview') return null

  try {
    const origin = new URL(expectedOrigin)
    const url = new URL(event.url, origin)
    if (!['http:', 'https:'].includes(origin.protocol) || url.origin !== origin.origin || url.username || url.password) return null

    const pathname = sanitizeAnalyticsPathname(url.pathname)
    if (!pathname) return null
    url.search = ''
    url.hash = ''
    url.pathname = pathname
    // Return the documented minimum so future SDK-added fields cannot bypass this boundary.
    return { type: 'pageview', url: url.href }
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
    if (url.origin !== origin.origin) return true
    const pathname = sanitizeAnalyticsPathname(url.pathname)
    return pathname !== null && !pathname.endsWith('/sighting/[id]')
  } catch {
    return false
  }
}

export function AnalyticsClient() {
  const rawPathname = usePathname()
  const pathname = sanitizeAnalyticsPathname(rawPathname)
  const allowed = useSyncExternalStore(
    () => () => undefined,
    () => isSafeAnalyticsReferrer(document.referrer, window.location.origin),
    () => false,
  )

  if (!allowed) return null
  // Supplying our canonical route disables the script's auto tracker, including its raw route field.
  return <Analytics
    mode="production"
    route={pathname}
    path={pathname === null ? null : rawPathname}
    basePath={process.env.NEXT_PUBLIC_VERCEL_OBSERVABILITY_BASEPATH}
    configString={process.env.NEXT_PUBLIC_VERCEL_OBSERVABILITY_CLIENT_CONFIG}
    beforeSend={(event) => sanitizeAnalyticsPageView(event, window.location.origin)}
  />
}
