'use client'

import { clearOutbox, suspendOutbox } from './Queue'

export const PRIVATE_PAUSE_KEY = 'dex.private.pause'
export const PRIVATE_RESET_KEY = 'dex.private.reset'
/** Old workers cached user photos beside public references in the shared image cache.
 * Purge those entries during upgrade and identity changes; current workers never cache them.
 * Regional pack names are deliberately not opened: a catalogue transition may just have
 * deleted one, and opening a name from a stale `caches.keys()` snapshot recreates it. */
export async function purgePrivatePhotos() {
  if (typeof caches === 'undefined') return
  const cache = await caches.open('dex-images')
  const privateKeys = (await cache.keys()).filter(k => new URL(k.url).pathname.startsWith('/api/photo/'))
  await Promise.all(privateKeys.map(k => cache.delete(k)))
}
export async function clearPrivateData(broadcast = true, identityId?: string) {
  suspendOutbox()
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('dex.scan.') || key === 'dex.queries') localStorage.removeItem(key)
    }
    if (broadcast) localStorage.setItem(PRIVATE_RESET_KEY, JSON.stringify({ nonce: crypto.randomUUID(), identityId }))
  } catch { /* storage unavailable */ }
  await Promise.all([clearOutbox(identityId), purgePrivatePhotos()])
}
