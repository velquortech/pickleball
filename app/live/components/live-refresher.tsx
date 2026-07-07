'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/config/supabase/client'

const WATCHED_TABLES = ['courts', 'players', 'queue_entries', 'matches', 'match_players']
const FALLBACK_REFRESH_MS = 30_000

// Subscribes to Supabase Realtime and re-runs the page's server render on any
// change — SSR stays the single source of truth for the dashboard data.
export function LiveRefresher() {
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const refresh = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => router.refresh(), 400)
    }

    const channel = supabase.channel('live-dashboard')
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
