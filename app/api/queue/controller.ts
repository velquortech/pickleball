import 'server-only'

import { z } from 'zod'
import { createClient } from '@/config/supabase/server'
import { createAdminClient } from '@/config/supabase/admin'
import { requireAdmin, requirePlayer } from '@/app/api/_lib/auth'
import { ApiError } from '@/app/api/_lib/http'
import { getFacilitySettings } from '@/app/api/_lib/settings'
import { getPlayerState } from '@/app/api/_lib/player-state'
import {
  assertCanAfford,
  getMinutesRemaining,
  sweepExpiredCredits,
} from '@/app/api/_lib/credits'
import { systemAllocate } from '@/app/api/matches/controller'
import { createCounterPass } from '@/app/api/sessions/controller'
import { projectQueue } from '@/app/api/_lib/queue-projection'
import { MAX_PURCHASE_HOURS, MIN_PURCHASE_HOURS } from '@/app/api/_lib/play-credits'

export const addWalkInSchema = z.object({
  displayName: z.string().trim().min(1).max(60).optional(),
  playerId: z.uuid().optional(), // rejoin an existing player
  skillLevel: z.string().trim().max(40).optional(),
  // Hours paid for at the counter. Walk-ins face the same paywall as everyone
  // else (L22 drops unfunded players from the queue), so staff record the cash
  // sale as a credit adjustment rather than bypassing the ledger.
  hours: z.number().int().min(MIN_PURCHASE_HOURS).max(MAX_PURCHASE_HOURS).default(1),
})

export const updateQueueEntrySchema = z.object({
  status: z.literal('cancelled'),
})

// Public: active queue with FIFO positions (the /live page shows this too).
export async function listQueue() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('queue_entries')
    .select('id, status, joined_at, called_at, player:players(id, display_name, skill_level)')
    .in('status', ['waiting', 'called', 'playing'])
    .order('joined_at')

  if (error) throw new ApiError(500, error.message)

  let position = 0
  return data.map((entry) => ({
    ...entry,
    position: entry.status === 'waiting' ? ++position : null,
  }))
}

// Public: where the queue is headed. Replays the matchmaker forward so every
// waiting player sees the court they will land on and roughly when (P7).
export async function getQueueProjection() {
  const supabase = await createClient()
  const settings = await getFacilitySettings()

  const [{ data: courts, error: courtsError }, { data: liveMatches }, { data: waiting }] =
    await Promise.all([
      supabase
        .from('courts')
        .select('id, name')
        .eq('is_active', true)
        .eq('status', 'open')
        .eq('court_type', 'open_play')
        .order('sort_order'),
      supabase.from('matches').select('court_id, ends_at').in('status', ['forming', 'active']),
      supabase
        .from('queue_entries')
        .select('id, player_id')
        .eq('status', 'waiting')
        .order('joined_at'),
    ])

  if (courtsError) throw new ApiError(500, courtsError.message)

  return projectQueue(
    courts ?? [],
    (liveMatches ?? []).map((match) => ({ courtId: match.court_id, endsAt: match.ends_at })),
    (waiting ?? []).map((entry) => ({ id: entry.id, playerId: entry.player_id })),
    {
      matchDurationMinutes: settings.match_duration_minutes,
      maxPlayersPerMatch: settings.max_players_per_match,
      minPlayersPerMatch: settings.min_players_per_match,
    }
  )
}

// P7: a registered player queues themselves. Paying comes first — the balance
// has to cover a full match before the spot is granted. Right after joining we
// run allocation, so an empty court seats them immediately instead of making
// them wait for staff.
export async function joinQueue() {
  const { player } = await requirePlayer()
  const admin = createAdminClient()

  await sweepExpiredCredits(admin)

  const settings = await getFacilitySettings()
  const state = await getPlayerState(admin, player.id)

  assertCanAfford(state.minutesRemaining, settings.match_duration_minutes)
  if (state.liveMatchId) throw new ApiError(409, 'You are already on a live court')
  if (state.queueEntryId) throw new ApiError(409, 'You are already in the queue')

  const { data: entry, error } = await admin
    .from('queue_entries')
    .insert({ player_id: player.id })
    .select('id, status, joined_at')
    .single()

  // L5: partial unique index — one active queue entry per player.
  if (error?.code === '23505') throw new ApiError(409, 'You are already in the queue')
  if (error) throw new ApiError(500, error.message)

  const allocation = await systemAllocate()

  const { data: refreshed } = await admin
    .from('queue_entries')
    .select('status')
    .eq('id', entry.id)
    .maybeSingle()

  return {
    queueEntryId: entry.id,
    joinedAt: entry.joined_at,
    // 'playing' means allocation seated them on a court on the spot.
    seatedImmediately: refreshed?.status === 'playing',
    courtsFilled: allocation.created.length,
  }
}

export async function leaveQueue() {
  const { player } = await requirePlayer()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('queue_entries')
    .update({ status: 'cancelled', left_at: new Date().toISOString() })
    .eq('player_id', player.id)
    .in('status', ['waiting', 'called'])
    .select('id')
    .maybeSingle()

  if (error) throw new ApiError(500, error.message)
  if (!data) throw new ApiError(404, 'You are not waiting in the queue')
  return { queueEntryId: data.id }
}

// Admin: add a walk-in to the queue — brand-new player or a returning one.
export async function addWalkIn(input: z.infer<typeof addWalkInSchema>) {
  const { supabase } = await requireAdmin()

  let playerId = input.playerId
  if (!playerId) {
    if (!input.displayName) {
      throw new ApiError(400, 'displayName is required for new players')
    }
    const { data: player, error } = await supabase
      .from('players')
      .insert({
        display_name: input.displayName,
        skill_level: input.skillLevel ?? null,
      })
      .select()
      .single()

    if (error) throw new ApiError(500, error.message)
    playerId = player.id
  }

  // Cash paid at the counter becomes an already-paid pass on the same ledger the
  // online passes use. It must be a real pass, not a bare ledger credit: the
  // expiry sweep writes off any balance no active pass accounts for (L17).
  const admin = createAdminClient()
  await createCounterPass(admin, playerId, input.hours)

  const { data, error } = await supabase
    .from('queue_entries')
    .insert({ player_id: playerId })
    .select('id, status, joined_at, called_at, player:players(id, display_name, skill_level)')
    .single()

  // L5: partial unique index — one active queue entry per player.
  if (error?.code === '23505') throw new ApiError(409, 'Player is already in the queue')
  if (error) throw new ApiError(500, error.message)

  return { ...data, minutesRemaining: await getMinutesRemaining(admin, playerId) }
}

export async function cancelQueueEntry(id: string) {
  const { supabase } = await requireAdmin()

  const { data, error } = await supabase
    .from('queue_entries')
    .update({ status: 'cancelled', left_at: new Date().toISOString() })
    .eq('id', id)
    .in('status', ['waiting', 'called'])
    .select()
    .maybeSingle()

  if (error) throw new ApiError(500, error.message)
  if (!data) throw new ApiError(404, 'Queue entry not found or already playing')
  return data
}
