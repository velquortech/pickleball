import { playerApi } from './http'
import type { PlayerMe } from '@/app/api/players/controller'

export type { PlayerMe }

export type PlayerSummary = {
  id: string
  display_name: string
  skill_level: string | null
}

export function getMe() {
  return playerApi.get<PlayerMe>('/api/players/me')
}

export function updateMe(input: { displayName?: string; skillLevel?: string | null }) {
  return playerApi.patch<PlayerSummary>('/api/players/me', input)
}

export function searchPlayers(search: string) {
  return playerApi.get<PlayerSummary[]>(
    `/api/players?search=${encodeURIComponent(search)}`
  )
}
