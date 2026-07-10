'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/config/supabase/client'

// Courts and queue are public; invites and credits are RLS-scoped to the
// subscriber, so a player only ever receives their own rows (S12).
const WATCHED_TABLES = [
  'courts',
  'queue_entries',
  'matches',
  'match_players',
  'match_invites',
  'player_credits',
]
const FALLBACK_REFRESH_MS = 30_000

// Same contract as the /live board: Realtime is only a nudge to re-run the
// server render, which stays the single source of truth.
export function PlayRefresher() {
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const refresh = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => router.refresh(), 400)
    }

    const channel = supabase.channel('player-hub')
    for (const table of WATCHED_TABLES) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, refresh)
    }
    channel.subscribe()

    const interval = setInterval(() => router.refresh(), FALLBACK_REFRESH_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [router])

  return null
}
