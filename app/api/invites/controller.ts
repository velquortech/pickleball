import 'server-only'

import { z } from 'zod'
import { createAdminClient } from '@/config/supabase/admin'
import { requirePlayer } from '@/app/api/_lib/auth'
import { ApiError } from '@/app/api/_lib/http'
import { getFacilitySettings } from '@/app/api/_lib/settings'
import { getPlayerState } from '@/app/api/_lib/player-state'
import { sweepExpiredCredits } from '@/app/api/_lib/credits'
import { expireFormingRosters, startRosterIfFull } from '@/app/api/matches/controller'
import { openSlots, type RosterMatch } from '@/app/api/_lib/stacking'
import {
  ACCEPT_REJECTION_COPY,
  INVITE_REJECTION_COPY,
  canAcceptInvite,
  canInvite,
  inviteExpiry,
} from '@/app/api/_lib/invites'

type AdminClient = ReturnType<typeof createAdminClient>

export const createInviteSchema = z.object({
  matchId: z.uuid(),
  inviteeId: z.uuid(),
})

export const respondToInviteSchema = z.object({
  action: z.enum(['accept', 'decline']),
})

// Invites that need money to accept get a 402; everything else is a conflict.
const PAYMENT_REASONS = new Set(['invitee_has_no_credits'])

async function loadRoster(admin: AdminClient, matchId: string) {
  const { data, error } = await admin
    .from('matches')
    .select('id, status, capacity, open_to_stacking, forming_expires_at, match_players(player_id)')
    .eq('id', matchId)
    .maybeSingle()

  if (error) throw new ApiError(500, error.message)
  if (!data) throw new ApiError(404, 'Court roster not found')

  const roster: RosterMatch = {
    id: data.id,
    status: data.status as RosterMatch['status'],
    capacity: data.capacity,
    playerCount: data.match_players.length,
    openToStacking: data.open_to_stacking,
    formingExpiresAt: data.forming_expires_at,
  }

  return { roster, playerIds: data.match_players.map((mp) => mp.player_id) }
}

// The caller's invite inbox and outbox. RLS would allow reading these directly,
// but the joins (court name, roster size) are easier to shape server-side.
export async function listInvites() {
  const { player } = await requirePlayer()
  const admin = createAdminClient()

  await expireFormingRosters(admin)
  await expireExpiredInvites(admin)

  const select =
    'id, status, expires_at, created_at, match:matches(id, capacity, status, court:courts(id, name)), inviter:players!match_invites_inviter_id_fkey(id, display_name), invitee:players!match_invites_invitee_id_fkey(id, display_name)'

  const [received, sent] = await Promise.all([
    admin
      .from('match_invites')
      .select(select)
      .eq('invitee_id', player.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    admin
      .from('match_invites')
      .select(select)
      .eq('inviter_id', player.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (received.error) throw new ApiError(500, received.error.message)
  if (sent.error) throw new ApiError(500, sent.error.message)

  return { received: received.data, sent: sent.data }
}

// L21 companion: a pending invite past its expiry is dead, whether or not the
// roster it points at is.
async function expireExpiredInvites(admin: AdminClient) {
  const { error } = await admin
    .from('match_invites')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString())

  if (error) throw new ApiError(500, error.message)
}

// P9/P11: invite a friend you follow onto a court you are already on. They pay
// for themselves, so we refuse to send an invite they could not accept.
export async function createInvite(input: z.infer<typeof createInviteSchema>) {
  const { player } = await requirePlayer()
  const admin = createAdminClient()

  await sweepExpiredCredits(admin)
  await expireFormingRosters(admin)
  await expireExpiredInvites(admin)

  const settings = await getFacilitySettings()
  const { roster, playerIds } = await loadRoster(admin, input.matchId)

  const [follow, inviteeState, existingInvite] = await Promise.all([
    admin
      .from('follows')
      .select('follower_id')
      .eq('follower_id', player.id)
      .eq('followee_id', input.inviteeId)
      .maybeSingle(),
    getPlayerState(admin, input.inviteeId),
    admin
      .from('match_invites')
      .select('id')
      .eq('match_id', input.matchId)
      .eq('invitee_id', input.inviteeId)
      .eq('status', 'pending')
      .maybeSingle(),
  ])

  const verdict = canInvite({
    inviterId: player.id,
    inviteeId: input.inviteeId,
    inviterFollowsInvitee: follow.data !== null,
    inviterOnMatch: playerIds.includes(player.id),
    matchIsForming: roster.status === 'forming',
    openSlots: openSlots(roster),
    alreadyInvited: existingInvite.data !== null,
    inviteeOnLiveCourt: inviteeState.liveMatchId !== null,
    inviteeInQueue: inviteeState.queueEntryId !== null,
    inviteeMinutesRemaining: inviteeState.minutesRemaining,
    matchDurationMinutes: settings.match_duration_minutes,
  })

  if (!verdict.allowed) {
    const reason = verdict.reason!
    throw new ApiError(
      PAYMENT_REASONS.has(reason) ? 402 : 409,
      INVITE_REJECTION_COPY[reason]
    )
  }

  const { data, error } = await admin
    .from('match_invites')
    .insert({
      match_id: input.matchId,
      inviter_id: player.id,
      invitee_id: input.inviteeId,
      expires_at: inviteExpiry(new Date(), roster.formingExpiresAt),
    })
    .select('id, expires_at')
    .single()

  // L21: partial unique index — one pending invite per (match, invitee).
  if (error?.code === '23505') {
    throw new ApiError(409, INVITE_REJECTION_COPY.already_invited)
  }
  if (error) throw new ApiError(500, error.message)

  return { inviteId: data.id, expiresAt: data.expires_at }
}

// Accepting takes the seat immediately, which may fill the roster and start the
// match (charging everyone). Declining just closes the invite.
export async function respondToInvite(
  inviteId: string,
  input: z.infer<typeof respondToInviteSchema>
) {
  const { player } = await requirePlayer()
  const admin = createAdminClient()

  await sweepExpiredCredits(admin)
  await expireFormingRosters(admin)

  const { data: invite, error } = await admin
    .from('match_invites')
    .select('id, match_id, status, expires_at, invitee_id')
    .eq('id', inviteId)
    .eq('invitee_id', player.id) // S14: only the invitee may answer
    .maybeSingle()

  if (error) throw new ApiError(500, error.message)
  if (!invite) throw new ApiError(404, 'Invite not found')

  if (input.action === 'decline') {
    const { data: declined } = await admin
      .from('match_invites')
      .update({ status: 'declined', responded_at: new Date().toISOString() })
      .eq('id', inviteId)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle()

    if (!declined) throw new ApiError(409, ACCEPT_REJECTION_COPY.invite_not_pending)
    return { inviteId, status: 'declined' as const, started: false }
  }

  const settings = await getFacilitySettings()
  const [{ roster }, state] = await Promise.all([
    loadRoster(admin, invite.match_id),
    getPlayerState(admin, player.id),
  ])

  const verdict = canAcceptInvite({
    status: invite.status,
    expiresAt: invite.expires_at,
    matchIsForming: roster.status === 'forming',
    openSlots: openSlots(roster),
    inviteeOnLiveCourt: state.liveMatchId !== null,
    inviteeMinutesRemaining: state.minutesRemaining,
    matchDurationMinutes: settings.match_duration_minutes,
  })

  if (!verdict.allowed) {
    const reason = verdict.reason!
    throw new ApiError(
      reason === 'invitee_has_no_credits' ? 402 : 409,
      ACCEPT_REJECTION_COPY[reason]
    )
  }

  // Claim the invite before taking the seat, so a double-click cannot seat the
  // same player twice (the roster guard would reject the second insert anyway).
  const { data: claimed } = await admin
    .from('match_invites')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', inviteId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (!claimed) throw new ApiError(409, ACCEPT_REJECTION_COPY.invite_not_pending)

  const { error: seatError } = await admin
    .from('match_players')
    .insert({ match_id: invite.match_id, player_id: player.id, source: 'invite' })

  if (seatError) {
    // Put the invite back so the friend can retry against a different court.
    await admin.from('match_invites').update({ status: 'pending', responded_at: null }).eq('id', inviteId)
    if (seatError.code === 'PB001') throw new ApiError(409, ACCEPT_REJECTION_COPY.match_full)
    if (seatError.code === 'PB002') {
      throw new ApiError(409, ACCEPT_REJECTION_COPY.invitee_on_live_court)
    }
    if (seatError.code === 'PB003') throw new ApiError(409, ACCEPT_REJECTION_COPY.match_not_open)
    throw new ApiError(500, seatError.message)
  }

  const started = await startRosterIfFull(admin, invite.match_id)
  return { inviteId, status: 'accepted' as const, started, matchId: invite.match_id }
}

export async function cancelInvite(inviteId: string) {
  const { player } = await requirePlayer()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('match_invites')
    .update({ status: 'cancelled', responded_at: new Date().toISOString() })
    .eq('id', inviteId)
    .eq('inviter_id', player.id) // S14: only the sender may withdraw it
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (error) throw new ApiError(500, error.message)
  if (!data) throw new ApiError(404, 'No pending invite to cancel')
  return { inviteId, status: 'cancelled' as const }
}
