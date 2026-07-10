import 'server-only'

import { z } from 'zod'
import { createClient } from '@/config/supabase/server'
import { createAdminClient } from '@/config/supabase/admin'
import { requirePlayer } from '@/app/api/_lib/auth'
import { ApiError } from '@/app/api/_lib/http'
import { getFacilitySettings } from '@/app/api/_lib/settings'
import { getPlayerState } from '@/app/api/_lib/player-state'
import { sweepExpiredCredits } from '@/app/api/_lib/credits'
import { matchesAffordable } from '@/app/api/_lib/play-credits'

export const updateMeSchema = z.object({
  displayName: z.string().trim().min(1).max(60).optional(),
  skillLevel: z.string().trim().max(40).nullable().optional(),
})

export const searchPlayersSchema = z.object({
  search: z.string().trim().min(2).max(60),
})

// Everything the player hub renders above the fold: who I am, what I can
// afford, and whether I am already committed somewhere.
export async function getMe() {
  const { player } = await requirePlayer()
  const admin = createAdminClient()

  await sweepExpiredCredits(admin)

  const settings = await getFacilitySettings()
  const state = await getPlayerState(admin, player.id)

  const [activePass, pendingPass, pendingInvites] = await Promise.all([
    admin
      .from('play_sessions')
      .select('reference_code, valid_until, minutes_total')
      .eq('player_id', player.id)
      .eq('status', 'active')
      .order('valid_until', { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from('play_sessions')
      .select('reference_code, amount_cents, currency, hours_purchased, expires_at')
      .eq('player_id', player.id)
      .eq('status', 'pending_payment')
      .maybeSingle(),
    admin
      .from('match_invites')
      .select('id', { count: 'exact', head: true })
      .eq('invitee_id', player.id)
      .eq('status', 'pending'),
  ])

  return {
    player: {
      id: player.id,
      displayName: player.display_name,
      skillLevel: player.skill_level,
    },
    credits: {
      minutesRemaining: state.minutesRemaining,
      matchesRemaining: matchesAffordable(
        state.minutesRemaining,
        settings.match_duration_minutes
      ),
      matchDurationMinutes: settings.match_duration_minutes,
      validUntil: activePass.data?.valid_until ?? null,
    },
    pendingPass: pendingPass.data
      ? {
          referenceCode: pendingPass.data.reference_code,
          amountCents: pendingPass.data.amount_cents,
          currency: pendingPass.data.currency,
          hoursPurchased: pendingPass.data.hours_purchased,
          expiresAt: pendingPass.data.expires_at,
        }
      : null,
    liveMatchId: state.liveMatchId,
    queueEntryId: state.queueEntryId,
    pendingInviteCount: pendingInvites.count ?? 0,
  }
}

export type PlayerMe = Awaited<ReturnType<typeof getMe>>

export async function updateMe(input: z.infer<typeof updateMeSchema>) {
  const { player, supabase } = await requirePlayer()

  // Column-level grants let an authenticated user touch only display_name and
  // skill_level on their own row (RLS "players update own row").
  const { data, error } = await supabase
    .from('players')
    .update({
      ...(input.displayName !== undefined ? { display_name: input.displayName } : {}),
      ...(input.skillLevel !== undefined ? { skill_level: input.skillLevel } : {}),
    })
    .eq('id', player.id)
    .select('id, display_name, skill_level')
    .maybeSingle()

  if (error) throw new ApiError(500, error.message)
  if (!data) throw new ApiError(404, 'Player not found')
  return data
}

// Find friends to follow. Players are publicly readable, so this exposes only
// what the live board already does: a display name and a skill level.
export async function searchPlayers(input: z.infer<typeof searchPlayersSchema>) {
  const { player } = await requirePlayer()
  const supabase = await createClient()

  // Neutralize LIKE wildcards so a search for "%" cannot enumerate the roster.
  const term = input.search.replace(/[\\%_]/g, (char) => `\\${char}`)

  const { data, error } = await supabase
    .from('players')
    .select('id, display_name, skill_level')
    .ilike('display_name', `%${term}%`)
    .neq('id', player.id)
    .not('profile_id', 'is', null) // only registered accounts can be followed
    .order('display_name')
    .limit(10)

  if (error) throw new ApiError(500, error.message)
  return data
}
