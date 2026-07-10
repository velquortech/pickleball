import 'server-only'

import { createAdminClient } from '@/config/supabase/admin'
import { ApiError } from './http'

type AdminClient = ReturnType<typeof createAdminClient>

// Postgres raises this when a debit would push a balance below zero. That check
// constraint is the real paywall — every controller treats it as authoritative.
const OVERDRAFT = '23514'

// L17: no cron in local dev, so the sweep runs lazily ahead of anything that
// reads or spends a balance — same pattern as expireStaleBookings().
export async function sweepExpiredCredits(admin: AdminClient) {
  const { error } = await admin.rpc('expire_play_credits')
  if (error) throw new ApiError(500, error.message)
}

export async function getMinutesRemaining(
  admin: AdminClient,
  playerId: string
): Promise<number> {
  const { data, error } = await admin
    .from('player_credits')
    .select('minutes_remaining')
    .eq('player_id', playerId)
    .maybeSingle()

  if (error) throw new ApiError(500, error.message)
  return data?.minutes_remaining ?? 0
}

export async function getMinutesRemainingFor(
  admin: AdminClient,
  playerIds: string[]
): Promise<Map<string, number>> {
  if (playerIds.length === 0) return new Map()

  const { data, error } = await admin
    .from('player_credits')
    .select('player_id, minutes_remaining')
    .in('player_id', playerIds)

  if (error) throw new ApiError(500, error.message)
  return new Map((data ?? []).map((row) => [row.player_id, row.minutes_remaining]))
}

// 402 Payment Required is the whole point of this feature: no playing time,
// no queue, no court, no invite.
export function assertCanAfford(minutesRemaining: number, matchDurationMinutes: number) {
  if (minutesRemaining < matchDurationMinutes) {
    throw new ApiError(402, 'Buy playing time before you can play')
  }
}

// Charges every player on a starting match. The unique partial index
// (one_debit_per_player_per_match) makes this idempotent, so a retried start
// never double-charges (L16).
export async function debitForMatch(
  admin: AdminClient,
  matchId: string,
  playerIds: string[],
  minutes: number
) {
  if (playerIds.length === 0) return

  const { error } = await admin.from('play_credit_ledger').insert(
    playerIds.map((playerId) => ({
      player_id: playerId,
      match_id: matchId,
      minutes_delta: -minutes,
      reason: 'match_debit' as const,
    }))
  )

  if (!error) return
  if (error.code === '23505') return // already charged for this match
  if (error.code === OVERDRAFT) {
    throw new ApiError(402, 'A player on this court ran out of playing time')
  }
  throw new ApiError(500, error.message)
}

// Returns minutes when a started match is abandoned by staff.
export async function refundForMatch(
  admin: AdminClient,
  matchId: string,
  playerIds: string[],
  minutes: number
) {
  if (playerIds.length === 0) return

  const { error } = await admin.from('play_credit_ledger').insert(
    playerIds.map((playerId) => ({
      player_id: playerId,
      match_id: matchId,
      minutes_delta: minutes,
      reason: 'match_refund' as const,
    }))
  )
  if (error) throw new ApiError(500, error.message)
}
