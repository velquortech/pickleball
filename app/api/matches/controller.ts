import 'server-only'

import { z } from 'zod'
import { createClient } from '@/config/supabase/server'
import { createAdminClient } from '@/config/supabase/admin'
import { requireAdmin, requirePlayer } from '@/app/api/_lib/auth'
import { ApiError } from '@/app/api/_lib/http'
import { planAllocations } from '@/app/api/_lib/matchmaking'
import { getFacilitySettings } from '@/app/api/_lib/settings'
import { getPlayerState } from '@/app/api/_lib/player-state'
import {
  assertCanAfford,
  debitForMatch,
  getMinutesRemainingFor,
  refundForMatch,
  sweepExpiredCredits,
} from '@/app/api/_lib/credits'
import {
  ROSTER_HOLD_MINUTES,
  STACK_REJECTION_COPY,
  canStack,
  openSlots,
  type RosterMatch,
} from '@/app/api/_lib/stacking'

type AdminClient = ReturnType<typeof createAdminClient>

// Custom SQLSTATEs raised by guard_match_player_insert().
const ROSTER_FULL = 'PB001'
const ALREADY_ON_COURT = 'PB002'
const ROSTER_CLOSED = 'PB003'

export const endMatchSchema = z.object({
  rejoinQueue: z.boolean().default(false),
  autoFill: z.boolean().default(true),
})

export const createRosterSchema = z.object({
  courtId: z.uuid(),
  capacity: z.union([z.literal(2), z.literal(4)]).default(4),
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

  // An 'active' match always has an end time (matches_active_has_end), but the
  // column is nullable for forming rosters — narrow it for callers.
  return data.filter(
    (match): match is typeof match & { ends_at: string } => match.ends_at !== null
  )
}

// Public: rosters still filling up. A forming roster holds its court, so the
// live board must show it as "filling" rather than free (it would send walk-ins
// to a court they cannot take).
export async function listFormingRosters() {
  const admin = createAdminClient()
  await expireFormingRosters(admin)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('matches')
    .select(
      'id, status, capacity, started_at, forming_expires_at, court:courts(id, name, court_type), match_players(player:players(id, display_name))'
    )
    .eq('status', 'forming')
    .order('created_at')

  if (error) throw new ApiError(500, error.message)
  return data
}

// L18: a forming roster that never filled releases its court, and the invites
// pointing at it die with it. Lazy, like expireStaleBookings().
export async function expireFormingRosters(admin: AdminClient) {
  const { data: expired, error } = await admin
    .from('matches')
    .update({ status: 'cancelled' })
    .eq('status', 'forming')
    .lt('forming_expires_at', new Date().toISOString())
    .select('id')

  if (error) throw new ApiError(500, error.message)
  if (!expired || expired.length === 0) return

  await admin
    .from('match_invites')
    .update({ status: 'expired' })
    .in(
      'match_id',
      expired.map((match) => match.id)
    )
    .eq('status', 'pending')
}

// Public: "which courts can I walk onto right now?" — every open-play court
// with its live roster, so the UI can offer Claim / Stack / Watch.
export async function listOpenCourts() {
  const admin = createAdminClient()
  await expireFormingRosters(admin)

  const supabase = await createClient()

  const [{ data: courts, error: courtsError }, { data: matches, error: matchesError }] =
    await Promise.all([
      supabase
        .from('courts')
        .select('id, name, sort_order, status')
        .eq('is_active', true)
        .eq('court_type', 'open_play') // L11: VIP courts are booked, not stacked
        .order('sort_order'),
      supabase
        .from('matches')
        .select(
          'id, status, capacity, open_to_stacking, forming_expires_at, ends_at, started_at, court_id, match_players(player:players(id, display_name))'
        )
        .in('status', ['forming', 'active']),
    ])

  if (courtsError) throw new ApiError(500, courtsError.message)
  if (matchesError) throw new ApiError(500, matchesError.message)

  const matchByCourt = new Map((matches ?? []).map((match) => [match.court_id, match]))

  return courts.map((court) => {
    const match = matchByCourt.get(court.id)

    const roster: RosterMatch | null = match
      ? {
          id: match.id,
          status: match.status as RosterMatch['status'],
          capacity: match.capacity,
          playerCount: match.match_players.length,
          openToStacking: match.open_to_stacking,
          formingExpiresAt: match.forming_expires_at,
        }
      : null

    return {
      id: court.id,
      name: court.name,
      sortOrder: court.sort_order,
      playable: court.status === 'open',
      courtStatus: court.status,
      match:
        match && roster
          ? {
              id: match.id,
              status: roster.status,
              capacity: match.capacity,
              playerCount: roster.playerCount,
              openSlots: openSlots(roster),
              endsAt: match.ends_at,
              startedAt: match.started_at,
              formingExpiresAt: match.forming_expires_at,
              players: match.match_players
                .map((mp) => mp.player)
                .filter(
                  (player): player is { id: string; display_name: string } => player !== null
                ),
            }
          : null,
    }
  })
}

export type OpenCourt = Awaited<ReturnType<typeof listOpenCourts>>[number]

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

// Translates the roster-guard SQLSTATEs into precise HTTP responses. The DB is
// the authority here — these are the races the pure `canStack` check cannot see.
function rejectRosterError(error: { code?: string; message: string }): never {
  if (error.code === ROSTER_FULL) throw new ApiError(409, STACK_REJECTION_COPY.match_full)
  if (error.code === ALREADY_ON_COURT) {
    throw new ApiError(409, STACK_REJECTION_COPY.already_on_court)
  }
  if (error.code === ROSTER_CLOSED) {
    throw new ApiError(409, STACK_REJECTION_COPY.match_not_open)
  }
  throw new ApiError(500, error.message)
}

// P6: claim a free open-play court and open a roster others can stack onto.
export async function createRoster(input: z.infer<typeof createRosterSchema>) {
  const { player } = await requirePlayer()
  const admin = createAdminClient()

  await sweepExpiredCredits(admin)
  await expireFormingRosters(admin)

  const settings = await getFacilitySettings()
  const state = await getPlayerState(admin, player.id)

  // P8: pay first.
  assertCanAfford(state.minutesRemaining, settings.match_duration_minutes)
  if (state.liveMatchId) throw new ApiError(409, STACK_REJECTION_COPY.already_on_court)
  if (state.queueEntryId) throw new ApiError(409, STACK_REJECTION_COPY.already_queued)

  const { data: court } = await admin
    .from('courts')
    .select('id, court_type, is_active, status')
    .eq('id', input.courtId)
    .maybeSingle()

  if (
    !court ||
    !court.is_active ||
    court.court_type !== 'open_play' ||
    court.status !== 'open'
  ) {
    throw new ApiError(400, 'That court is not open for play')
  }

  const { data: match, error } = await admin
    .from('matches')
    .insert({
      court_id: input.courtId,
      status: 'forming',
      capacity: input.capacity,
      ends_at: null,
      forming_expires_at: new Date(Date.now() + ROSTER_HOLD_MINUTES * 60_000).toISOString(),
    })
    .select()
    .single()

  // one_live_match_per_court — somebody claimed the court first.
  if (error?.code === '23505') throw new ApiError(409, 'That court was just taken')
  if (error) throw new ApiError(500, error.message)

  const { error: seatError } = await admin
    .from('match_players')
    .insert({ match_id: match.id, player_id: player.id, source: 'stack' })

  if (seatError) {
    // Never leave an empty roster squatting the court.
    await admin.from('matches').delete().eq('id', match.id)
    rejectRosterError(seatError)
  }

  return {
    matchId: match.id,
    courtId: match.court_id,
    capacity: match.capacity,
    started: false,
  }
}

// P6: stack yourself onto a court that is short a player.
export async function stackOntoRoster(matchId: string) {
  const { player } = await requirePlayer()
  const admin = createAdminClient()

  await sweepExpiredCredits(admin)
  await expireFormingRosters(admin)

  const settings = await getFacilitySettings()
  const [{ roster }, state] = await Promise.all([
    loadRoster(admin, matchId),
    getPlayerState(admin, player.id),
  ])

  const verdict = canStack(roster, {
    playerOnLiveCourt: state.liveMatchId !== null,
    playerInQueue: state.queueEntryId !== null,
    minutesRemaining: state.minutesRemaining,
    matchDurationMinutes: settings.match_duration_minutes,
  })

  if (!verdict.allowed) {
    const reason = verdict.reason!
    throw new ApiError(
      reason === 'insufficient_credits' ? 402 : 409,
      STACK_REJECTION_COPY[reason]
    )
  }

  const { error } = await admin
    .from('match_players')
    .insert({ match_id: matchId, player_id: player.id, source: 'stack' })

  if (error) rejectRosterError(error)

  const started = await startRosterIfFull(admin, matchId)
  return { matchId, started }
}

// Leave a roster that has not started. The last one out releases the court.
export async function leaveRoster(matchId: string) {
  const { player } = await requirePlayer()
  const admin = createAdminClient()

  const { roster } = await loadRoster(admin, matchId)
  if (roster.status !== 'forming') {
    throw new ApiError(409, 'You cannot leave a match that has already started')
  }

  const { data: removed, error } = await admin
    .from('match_players')
    .delete()
    .eq('match_id', matchId)
    .eq('player_id', player.id)
    .select('player_id')

  if (error) throw new ApiError(500, error.message)
  if (!removed || removed.length === 0) throw new ApiError(404, 'You are not on that court')

  // L23: you can only invite friends onto a court you are standing on, so the
  // invites this player sent to it leave with them.
  await admin
    .from('match_invites')
    .update({ status: 'expired' })
    .eq('match_id', matchId)
    .eq('inviter_id', player.id)
    .eq('status', 'pending')

  const { count } = await admin
    .from('match_players')
    .select('*', { count: 'exact', head: true })
    .eq('match_id', matchId)

  const rosterEmpty = (count ?? 0) === 0
  if (rosterEmpty) {
    await admin.from('matches').update({ status: 'cancelled' }).eq('id', matchId)
    await admin
      .from('match_invites')
      .update({ status: 'expired' })
      .eq('match_id', matchId)
      .eq('status', 'pending')
  }

  return { matchId, rosterEmpty }
}

// The moment a roster fills, the clock starts and everyone is charged. Players
// who ran out of playing time between joining and filling are dropped from the
// roster rather than played for free (L22).
export async function startRosterIfFull(
  admin: AdminClient,
  matchId: string
): Promise<boolean> {
  const settings = await getFacilitySettings()
  const { roster, playerIds } = await loadRoster(admin, matchId)

  if (roster.status !== 'forming' || roster.playerCount < roster.capacity) return false

  const credits = await getMinutesRemainingFor(admin, playerIds)
  const broke = playerIds.filter(
    (id) => (credits.get(id) ?? 0) < settings.match_duration_minutes
  )

  if (broke.length > 0) {
    await admin.from('match_players').delete().eq('match_id', matchId).in('player_id', broke)
    return false
  }

  return startRoster(admin, matchId, playerIds, settings.match_duration_minutes)
}

async function startRoster(
  admin: AdminClient,
  matchId: string,
  playerIds: string[],
  durationMinutes: number
): Promise<boolean> {
  const startedAt = new Date()
  const endsAt = new Date(startedAt.getTime() + durationMinutes * 60_000)

  // Atomic claim: only one caller flips forming → active.
  const { data: claimed, error } = await admin
    .from('matches')
    .update({
      status: 'active',
      started_at: startedAt.toISOString(),
      ends_at: endsAt.toISOString(),
    })
    .eq('id', matchId)
    .eq('status', 'forming')
    .select('id')
    .maybeSingle()

  if (error) throw new ApiError(500, error.message)
  if (!claimed) return false // someone else started it

  try {
    await debitForMatch(admin, matchId, playerIds, durationMinutes)
  } catch (debitError) {
    // Nobody plays unpaid: roll the court back rather than run a free match.
    await admin.from('matches').update({ status: 'cancelled' }).eq('id', matchId)
    throw debitError
  }

  await admin
    .from('match_invites')
    .update({ status: 'expired' })
    .eq('match_id', matchId)
    .eq('status', 'pending')

  return true
}

// Admin: start a half-full doubles roster as singles. The roster is resized to
// the players actually on court, so a match is never played 3-handed (L7).
export async function forceStartRoster(matchId: string) {
  await requireAdmin()
  const admin = createAdminClient()

  const settings = await getFacilitySettings()
  const { roster, playerIds } = await loadRoster(admin, matchId)

  if (roster.status !== 'forming') throw new ApiError(409, 'That roster is not forming')
  if (playerIds.length !== 2 && playerIds.length !== 4) {
    throw new ApiError(409, 'A match needs exactly 2 or 4 players')
  }

  const credits = await getMinutesRemainingFor(admin, playerIds)
  if (playerIds.some((id) => (credits.get(id) ?? 0) < settings.match_duration_minutes)) {
    throw new ApiError(402, 'A player on this court has no playing time left')
  }

  if (playerIds.length !== roster.capacity) {
    const { error } = await admin
      .from('matches')
      .update({ capacity: playerIds.length })
      .eq('id', matchId)
    if (error) throw new ApiError(500, error.message)
  }

  const started = await startRoster(admin, matchId, playerIds, settings.match_duration_minutes)
  return { matchId, started }
}

// ---------------------------------------------------------------------------
// Matchmaking (P3/P4)
// ---------------------------------------------------------------------------
// Fills every free open-play court from the FIFO queue: 4 players preferred,
// 2 as fallback, never 3.
//
// Allocation is a *system* operation — it charges other players' ledgers and
// claims their queue entries — so it always runs with the secret-key client.
// Authorization happens at the exported entry points, never in here.
async function runAllocation() {
  const admin = createAdminClient()

  await sweepExpiredCredits(admin)
  await expireFormingRosters(admin)

  const settings = await getFacilitySettings()

  const [{ data: courts }, { data: liveMatches }, { data: waiting }] = await Promise.all([
    admin
      .from('courts')
      .select('id')
      .eq('is_active', true)
      .eq('status', 'open')
      .eq('court_type', 'open_play') // L11: bookable VIP courts are never auto-allocated
      .order('sort_order'),
    // A forming roster holds its court just as firmly as an active match.
    admin.from('matches').select('court_id').in('status', ['forming', 'active']),
    admin
      .from('queue_entries')
      .select('id, player_id')
      .eq('status', 'waiting')
      .order('joined_at'),
  ])

  const busyCourtIds = new Set((liveMatches ?? []).map((match) => match.court_id))
  const freeCourts = (courts ?? []).filter((court) => !busyCourtIds.has(court.id))

  // L22: a paid queue is a paid queue. Anyone whose playing time ran out while
  // waiting is dropped rather than left blocking the head of the FIFO line.
  const allWaiting = waiting ?? []
  const credits = await getMinutesRemainingFor(
    admin,
    allWaiting.map((entry) => entry.player_id)
  )
  const affordable = allWaiting.filter(
    (entry) => (credits.get(entry.player_id) ?? 0) >= settings.match_duration_minutes
  )
  const broke = allWaiting.filter(
    (entry) => (credits.get(entry.player_id) ?? 0) < settings.match_duration_minutes
  )

  if (broke.length > 0) {
    await admin
      .from('queue_entries')
      .update({ status: 'cancelled', left_at: new Date().toISOString() })
      .in(
        'id',
        broke.map((entry) => entry.id)
      )
      .eq('status', 'waiting')
  }

  const plans = planAllocations(
    freeCourts,
    affordable,
    settings.max_players_per_match,
    settings.min_players_per_match
  )

  const created = []
  for (const plan of plans) {
    // Atomic claim: only entries still 'waiting' are taken.
    const { data: claimed, error: claimError } = await admin
      .from('queue_entries')
      .update({ status: 'playing', called_at: new Date().toISOString() })
      .in('id', plan.queueEntryIds)
      .eq('status', 'waiting')
      .select('id, player_id')

    if (claimError) throw new ApiError(500, claimError.message)
    if (!claimed || claimed.length !== plan.queueEntryIds.length) {
      // Another allocation raced us — release what we grabbed and stop.
      await releaseEntries(
        admin,
        (claimed ?? []).map((entry) => entry.id)
      )
      break
    }

    const startedAt = new Date()
    const endsAt = new Date(startedAt.getTime() + settings.match_duration_minutes * 60_000)

    const { data: match, error: matchError } = await admin
      .from('matches')
      .insert({
        court_id: plan.courtId,
        status: 'active',
        capacity: claimed.length,
        started_at: startedAt.toISOString(),
        ends_at: endsAt.toISOString(),
      })
      .select()
      .single()

    if (matchError) {
      // Court was claimed concurrently (one_live_match_per_court) — release players.
      await releaseEntries(
        admin,
        claimed.map((entry) => entry.id)
      )
      if (matchError.code === '23505') continue
      throw new ApiError(500, matchError.message)
    }

    const { error: playersError } = await admin.from('match_players').insert(
      claimed.map((entry) => ({
        match_id: match.id,
        player_id: entry.player_id,
        queue_entry_id: entry.id,
        source: 'queue' as const,
      }))
    )
    if (playersError) throw new ApiError(500, playersError.message)

    await debitForMatch(
      admin,
      match.id,
      claimed.map((entry) => entry.player_id),
      settings.match_duration_minutes
    )

    created.push({ ...match, playerCount: claimed.length })
  }

  return {
    created,
    waitingLeft: affordable.length - created.reduce((total, m) => total + m.playerCount, 0),
    dropped: broke.length,
  }
}

// Admin-triggered allocation (the dashboard button).
export async function allocateMatches() {
  await requireAdmin()
  return runAllocation()
}

// Triggered by the system right after a player joins the queue, so a player who
// arrives to a free court is seated immediately instead of waiting for staff to
// press a button (P7).
export async function systemAllocate() {
  return runAllocation()
}

async function releaseEntries(admin: AdminClient, ids: string[]) {
  if (ids.length === 0) return
  await admin
    .from('queue_entries')
    .update({ status: 'waiting', called_at: null })
    .in('id', ids)
}

// End a match (P4/P5): frees the court, marks players done, optionally
// re-queues them at the back and refills courts from the queue.
export async function endMatch(id: string, input: z.infer<typeof endMatchSchema>) {
  await requireAdmin()
  const admin = createAdminClient()

  const { data: match, error } = await admin
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
    .filter((value): value is string => value !== null)

  if (queueEntryIds.length > 0) {
    await admin
      .from('queue_entries')
      .update({ status: 'done', left_at: new Date().toISOString() })
      .in('id', queueEntryIds)
  }

  if (input.rejoinQueue) {
    const { error: rejoinError } = await admin
      .from('queue_entries')
      .insert(match.match_players.map((mp) => ({ player_id: mp.player_id })))

    if (rejoinError && rejoinError.code !== '23505') {
      throw new ApiError(500, rejoinError.message)
    }
  }

  const refill = input.autoFill ? await runAllocation() : null
  return { endedMatchId: match.id, refill }
}

// Admin: abandon a live match. An active match already charged its players, so
// their minutes come back; a forming roster never charged anyone.
export async function cancelMatch(id: string) {
  await requireAdmin()
  const admin = createAdminClient()

  const settings = await getFacilitySettings()

  const { data: existing, error: loadError } = await admin
    .from('matches')
    .select('id, status, match_players(player_id)')
    .eq('id', id)
    .maybeSingle()

  if (loadError) throw new ApiError(500, loadError.message)
  if (!existing || (existing.status !== 'forming' && existing.status !== 'active')) {
    throw new ApiError(404, 'Live match not found')
  }

  const { data: cancelled, error } = await admin
    .from('matches')
    .update({ status: 'cancelled', ended_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', existing.status) // lost the race if it moved on
    .select('id')
    .maybeSingle()

  if (error) throw new ApiError(500, error.message)
  if (!cancelled) throw new ApiError(409, 'That match changed state — try again')

  const playerIds = existing.match_players.map((mp) => mp.player_id)
  const wasCharged = existing.status === 'active'

  if (wasCharged) {
    await refundForMatch(admin, id, playerIds, settings.match_duration_minutes)
  }

  await admin
    .from('match_invites')
    .update({ status: 'expired' })
    .eq('match_id', id)
    .eq('status', 'pending')

  return { cancelledMatchId: id, refunded: wasCharged ? playerIds.length : 0 }
}
