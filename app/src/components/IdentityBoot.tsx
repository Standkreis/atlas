'use client'

import { useQuery } from '@tanstack/react-query'
import { useTRPC } from '@/trpc/client'

// Mints the anonymous identity on first launch by asking who we are. Renders nothing; M7 builds on this.
export function IdentityBoot() {
  const trpc = useTRPC()
  // This is the version handshake as well as identity bootstrap. A recently persisted response
  // must not suppress the first online check after a catalogue deployment or a short reconnect.
  useQuery(trpc.identity.me.queryOptions(undefined, {
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: 'always',
  }))
  return null
}
