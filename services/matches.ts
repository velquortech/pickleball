import { api, authApi, playerApi } from './http'
import type { MatchStatus, CourtType, CourtStatus } from '@/config/supabase/models'

export type ActiveMatch = {
  id: string
  status: MatchStatus
  started_at: string
  ends_at: string
  court: { id: string; name: string; court_type: CourtType }
  match_players: { player: { id: string; display_name: string } }[]
}

export type OpenCourt = {
  id: string
  name: string
  sortOrder: number
  playable: boolean
  courtStatus: CourtStatus
  match: {
    id: string
    status: 'forming' | 'active' | 'completed' | 'cancelled'
    capacity: number
    playerCount: number
    openSlots: number
    endsAt: string | null
    startedAt: string
    formingExpiresAt: string | null
    players: { id: string; display_name: string }[]
  } | null
}

export type AllocationResult = {
  created: { id: string; court_id: string; playerCount: number }[]
  waitingLeft: number
  dropped: number
}

export function getActiveMatches() {
  return api.get<ActiveMatch[]>('/api/matches')
}

// Every open-play court with its live roster — the "stack onto a court" board.
export function getOpenCourts() {
  return api.get<OpenCourt[]>('/api/matches/open')
}

// Claim a free court and open a roster friends can stack onto.
export function createRoster(courtId: string, capacity: 2 | 4 = 4) {
  return playerApi.post<{
    matchId: string
    courtId: string
    capacity: number
    started: boolean
  }>('/api/matches/open', { courtId, capacity })
}

// Take an open seat on a court that is short a player.
export function stackOntoRoster(matchId: string) {
  return playerApi.post<{ matchId: string; started: boolean }>(
    `/api/matches/${matchId}/join`
  )
}

export function leaveRoster(matchId: string) {
  return playerApi.delete<{ matchId: string; rosterEmpty: boolean }>(
    `/api/matches/${matchId}/join`
  )
}

export function allocateMatches() {
  return authApi.post<AllocationResult>('/api/matches/allocate')
}

// Staff: start a half-full roster as singles.
export function forceStartRoster(matchId: string) {
  return authApi.post<{ matchId: string; started: boolean }>(`/api/matches/${matchId}/start`)
}

// Staff: abandon a live match and refund the players it charged.
export function cancelMatch(matchId: string) {
  return authApi.post<{ cancelledMatchId: string; refunded: number }>(
    `/api/matches/${matchId}/cancel`
  )
}

export function endMatch(
  id: string,
  input: { rejoinQueue?: boolean; autoFill?: boolean } = {}
) {
  return authApi.post<{ endedMatchId: string; refill: AllocationResult | null }>(
    `/api/matches/${id}/end`,
    { rejoinQueue: false, autoFill: true, ...input }
  )
}
