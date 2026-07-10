import { api, authApi, playerApi } from './http'
import type { QueueStatus } from '@/config/supabase/models'

export type QueueItem = {
  id: string
  status: QueueStatus
  joined_at: string
  called_at: string | null
  position: number | null
  player: { id: string; display_name: string; skill_level: string | null }
}

export type ProjectedEntry = {
  queueEntryId: string
  playerId: string
  position: number
  courtId: string | null
  courtName: string | null
  estimatedStartAt: string | null
  estimatedWaitMinutes: number | null
}

export function getQueue() {
  return api.get<QueueItem[]>('/api/queue')
}

// Which court each waiting player will land on, and roughly when.
export function getQueueProjection() {
  return api.get<ProjectedEntry[]>('/api/queue/projection')
}

// A registered player takes their own spot. Requires playing time (402 if not).
export function joinQueue() {
  return playerApi.post<{
    queueEntryId: string
    joinedAt: string
    seatedImmediately: boolean
    courtsFilled: number
  }>('/api/queue/me')
}

export function leaveQueue() {
  return playerApi.delete<{ queueEntryId: string }>('/api/queue/me')
}

// Staff: add a walk-in who paid at the counter. `hours` becomes playing time on
// the same ledger the online passes use.
export function addWalkIn(input: {
  displayName?: string
  playerId?: string
  skillLevel?: string
  hours?: number
}) {
  return authApi.post<QueueItem & { minutesRemaining: number }>('/api/queue', input)
}

export function cancelQueueEntry(id: string) {
  return authApi.patch(`/api/queue/${id}`, { status: 'cancelled' })
}
