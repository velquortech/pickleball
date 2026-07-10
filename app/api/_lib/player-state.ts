import 'server-only'

import { createAdminClient } from '@/config/supabase/admin'
import { ApiError } from './http'
import { getMinutesRemaining } from './credits'

type AdminClient = ReturnType<typeof createAdminClient>

export type PlayerState = {
  minutesRemaining: number
  liveMatchId: string | null
  queueEntryId: string | null
}

// The three facts every gate needs: can they pay, are they already on a court,
// are they already waiting. Read once, pass down — the DB re-checks the racy
// parts (L19/L20) so a stale read here can never corrupt state.
export async function getPlayerState(
  admin: AdminClient,
  playerId: string
): Promise<PlayerState> {
  const [minutesRemaining, liveMatch, queueEntry] = await Promise.all([
    getMinutesRemaining(admin, playerId),
    admin
      .from('match_players')
      .select('match_id, matches!inner(status)')
      .eq('player_id', playerId)
      .in('matches.status', ['forming', 'active'])
      .maybeSingle(),
    admin
      .from('queue_entries')
      .select('id')
      .eq('player_id', playerId)
      .in('status', ['waiting', 'called'])
      .maybeSingle(),
  ])

  if (liveMatch.error) throw new ApiError(500, liveMatch.error.message)
  if (queueEntry.error) throw new ApiError(500, queueEntry.error.message)

  return {
    minutesRemaining,
    liveMatchId: liveMatch.data?.match_id ?? null,
    queueEntryId: queueEntry.data?.id ?? null,
  }
}
