import { api, authApi } from './http'
import type { FacilitySettings } from '@/config/supabase/models'

export function getSettings() {
  return api.get<FacilitySettings>('/api/settings')
}

export function updateSettings(input: {
  matchDurationMinutes?: number
  maxPlayersPerMatch?: 2 | 4
  openHour?: number
  closeHour?: number
  bookingHoldMinutes?: number
}) {
  return authApi.patch<FacilitySettings>('/api/settings', input)
}
