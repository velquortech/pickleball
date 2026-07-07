import { api, authApi } from './http'
import type { QueueStatus } from '@/config/supabase/models'

export type QueueItem = {
  id: string
  status: QueueStatus
  joined_at: string
  called_at: string | null
  position: number | null
  player: { id: string; display_name: string; skill_level: string | null }
}

export function getQueue() {
  return api.get<QueueItem[]>('/api/queue')
}

export function addWalkIn(input: {
  displayName?: string
  playerId?: string
  skillLevel?: string
}) {
  return authApi.post<QueueItem>('/api/queue', input)
}

export function cancelQueueEntry(id: string) {
  return authApi.patch(`/api/queue/${id}`, { status: 'cancelled' })
}
