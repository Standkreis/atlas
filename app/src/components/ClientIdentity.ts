'use client'

// The identity this tab has actually displayed. Reading localStorage afresh for
// each mutation would let an old dialog silently act as another tab's new user.
let displayed: string | null | undefined
let generation = 0
const storedIdentity = () => { try { return localStorage.getItem('dex.persist.identity') } catch { return null } }
export function expectedIdentity(): string {
  if (displayed === undefined) {
    try { displayed = localStorage.getItem('dex.persist.identity') } catch { displayed = null }
  }
  return displayed ?? 'unverified'
}
export function acceptIdentity(id: string) {
  if (displayed !== id) { displayed = id; generation++ }
}
export function invalidateIdentity() { displayed = null; generation++ }

/** Buffer the response before tRPC can consume it, so a late identity.me (or
 * private query) cannot overwrite state after another tab signs in or deletes. */
export async function identityFetch(url: RequestInfo | URL, options?: RequestInit) {
  const paths = new URL(typeof url === 'string' ? url : url instanceof URL ? url.href : url.url, location.origin).pathname
  const switching = /identity\.(emailVerify|authenticateVerify)|data\.delete/.test(paths) && options?.method === 'POST'
  if (switching) generation++
  const started = generation
  const startedOwner = storedIdentity()
  const response = await fetch(url, { ...options, credentials: 'include' })
  const body = await response.arrayBuffer()
  if (started !== generation || startedOwner !== storedIdentity()) throw new DOMException('Identity changed', 'AbortError')
  if (switching) generation++
  return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers })
}
