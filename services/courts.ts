import { api, authApi } from './http'
import type { Court, CourtType, CourtStatus } from '@/config/supabase/models'

export function getCourts() {
  return api.get<Court[]>('/api/courts')
}

export function createCourt(input: {
  name: string
  courtType?: CourtType
  sortOrder?: number
}) {
  return authApi.post<Court>('/api/courts', input)
}

export function updateCourt(
  id: string,
  input: { name?: string; courtType?: CourtType; status?: CourtStatus; sortOrder?: number }
) {
  return authApi.patch<Court>(`/api/courts/${id}`, input)
}

export function deactivateCourt(id: string) {
  return authApi.delete<Court>(`/api/courts/${id}`)
}
