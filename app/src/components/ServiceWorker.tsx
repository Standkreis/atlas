'use client'

import { useEffect } from 'react'
import { OfflineBanner } from './OfflineBanner'

// The build id rides on the worker URL (handoff 0009 Track A): a new build registers a new worker, which drops the old
// shell cache on activate. The browser fetches the worker script itself past the HTTP cache, so no header is needed.
export const SW_URL = process.env.NODE_ENV === 'production' ? `/sw.js?v=${process.env.NEXT_PUBLIC_BUILD_ID ?? 'build'}` : '/sw.js?v=dev'

export function ServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    // A production worker must never control `next dev`: it can keep an old HTML shell and old chunks alive across
    // branch or worktree restarts, making current source appear to have vanished. Keep the shared image cache and all
    // IndexedDB/localStorage data; only versioned application shells are development build artefacts.
    if (process.env.NODE_ENV !== 'production') {
      void Promise.all([
        navigator.serviceWorker.getRegistrations().then((rs) => Promise.all(rs.map((r) => r.unregister()))),
        caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('dex-shell-') || k.startsWith('dex-static-')).map((k) => caches.delete(k)))),
      ])
      return
    }
    navigator.serviceWorker.register(SW_URL, { scope: '/' }).catch(() => {})
  }, [])
  // The one place the layout mounts for the offline milestone: the banner rides along, so no page has to.
  return <OfflineBanner />
}
