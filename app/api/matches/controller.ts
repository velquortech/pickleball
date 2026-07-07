import 'server-only'

import { z } from 'zod'
import { createClient } from '@/config/supabase/server'
import { requireAdmin } from '@/app/api/_lib/auth'
import { ApiError } from '@/app/api/_lib/http'
import { planAllocations } from '@/app/api/_lib/matchmaking'
import { getFacilitySettings } from '@/app/api/_lib/settings'

export const endMatchSchema = z.object({
  rejoinQueue: z.boolean().default(false),
  autoFill: z.boolean().default(true),
})

export async function listActiveMatches() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('matches')
    .select(
      'id, status, started_at, ends_at, court:courts(id, name, court_type), match_players(player:players(id, display_name))'
    )
    .eq('status', 'active')
    .order('started_at')

  if (error) throw new ApiError(500, error.message)
  return data
}

// Matchmaking (P3/P4): fill every free open-play court from the FIFO queue,
// 4 players preferred, 2 as fallback, never 3. Claims are guarded so two
// concurrent allocations cannot double-assign players or courts (L6).
export async function allocateMatches() {
  const { supabase } = await requireAdmin()
  const settings = await getFacilitySettings()

  const [{ data: courts }, { data: activeMatches }, { data: waiting }] =
    await Promise.all([
      supabase
        .from('courts')
        .select('id')
        .eq('is_active', true)
        .eq('status', 'open')
        .eq('court_type', 'open_play') // L11: bookable VIP courts are never auto-allocated
        .order('sort_order'),
      supabase.from('matches').select('court_id').eq('status', 'active'),
      supabase
        .from('queue_entries')
        .select('id, player_id')
        .eq('status', 'waiting')
        .order('joined_at'),
    ])

  const busyCourtIds = new Set((activeMatches ?? []).map((m) => m.court_id))
  const freeCourts = (courts ?? []).filter((c) => !busyCourtIds.has(c.id))

  const plans = planAllocations(
    freeCourts,
    waiting ?? [],
    settings.max_players_per_match,
    settings.min_players_per_match
  )

  const created = []
  for (const plan of plans) {
    // Atomic claim: only entries still 'waiting' are taken.
    const { data: claimed, error: claimError } = await supabase
      .from('queue_entries')
      .update({ status: 'playing', called_at: new Date().toISOString() })
      .in('id', plan.queueEntryIds)
      .eq('status', 'waiting')
      .select('id, player_id')

    if (claimError) throw new ApiError(500, claimError.message)
    if (!claimed || claimed.length !== plan.queueEntryIds.length) {
      // Another allocation raced us — release what we grabbed and stop.
      await releaseEntries(supabase, (claimed ?? []).map((c) => c.id))
      break
    }

    const startedAt = new Date()
    const endsAt = new Date(
      startedAt.getTime() + settings.match_duration_minutes * 60 * 1000
    )

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        court_id: plan.courtId,
        started_at: startedAt.toISOString(),
        ends_at: endsAt.toISOString(),
      })
      .select()
      .single()

    if (matchError) {
      // Court was claimed concurrently (partial unique index) — release players.
      await releaseEntries(supabase, claimed.map((c) => c.id))
      if (matchError.code === '23505') continue
      throw new ApiError(500, matchError.message)
    }

    const { error: playersError } = await supabase.from('match_players').insert(
      claimed.map((entry) => ({
        match_id: match.id,
        player_id: entry.player_id,
        queue_entry_id: entry.id,
      }))
    )
    if (playersError) throw new ApiError(500, playersError.message)

    created.push({ ...match, playerCount: claimed.length })
  }

  return { created, waitingLeft: (waiting?.length ?? 0) - created.reduce((n, m) => n + m.playerCount, 0) }
}

async function releaseEntries(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[]
) {
  if (ids.length === 0) return
  await supabase
    .from('queue_entries')
    .update({ status: 'waiting', called_at: null })
    .in('id', ids)
}

// End a match (P4/P5): frees the court, marks players done, optionally
// re-queues them at the back and refills courts from the queue.
export async function endMatch(id: string, input: z.infer<typeof endMatchSchema>) {
  const { supabase } = await requireAdmin()

  const { data: match, error } = await supabase
    .from('matches')
    .update({ status: 'completed', ended_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'active')
    .select('id, match_players(player_id, queue_entry_id)')
    .maybeSingle()

  if (error) throw new ApiError(500, error.message)
  if (!match) throw new ApiError(404, 'Active match not found')

  const queueEntryIds = match.match_players
    .map((mp) => mp.queue_entry_id)
    .filter((v): v is string => v !== null)

  if (queueEntryIds.length > 0) {
    await supabase
      .from('queue_entries')
      .update({ status: 'done', left_at: new Date().toISOString() })
      .in('id', queueEntryIds)
  }

  if (input.rejoinQueue) {
    const { error: rejoinError } = await supabase.from('queue_entries').insert(
      match.match_players.map((mp) => ({ player_id: mp.player_id }))
    )
    if (rejoinError && rejoinError.code !== '23505') {
      throw new ApiError(500, rejoinError.message)
    }
  }

  const refill = input.autoFill ? await allocateMatches() : null
  return { endedMatchId: match.id, refill }
}
