import 'server-only'

import { createClient } from '@/config/supabase/server'
import type { FacilitySettings } from '@/config/supabase/models'

export const DEFAULT_SETTINGS: FacilitySettings = {
  id: true,
  match_duration_minutes: 20,
  max_players_per_match: 4,
  min_players_per_match: 2,
  open_hour: 8,
  close_hour: 22,
  timezone: 'Asia/Manila',
  booking_hold_minutes: 15,
  updated_at: new Date(0).toISOString(),
}

export async function getFacilitySettings(): Promise<FacilitySettings> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('facility_settings')
    .select('*')
    .maybeSingle()

  return data ?? DEFAULT_SETTINGS
}
