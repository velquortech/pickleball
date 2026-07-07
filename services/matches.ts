import { api, authApi } from './http'
import type { MatchStatus, CourtType } from '@/config/supabase/models'

export type ActiveMatch = {
  id: string
  status: MatchStatus
  started_at: string
  ends_at: string
  court: { id: string; name: string; court_type: CourtType }
  match_players: { player: { id: string; display_name: string } }[]
}

export type AllocationResult = {
  created: { id: string; court_id: string; playerCount: number }[]
  waitingLeft: number
}

export function getActiveMatches() {
  return api.get<ActiveMatch[]>('/api/matches')
}

export function allocateMatches() {
  return authApi.post<AllocationResult>('/api/matches/allocate')
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
