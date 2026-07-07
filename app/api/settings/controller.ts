import 'server-only'

import { z } from 'zod'
import { requireAdmin } from '@/app/api/_lib/auth'
import { ApiError } from '@/app/api/_lib/http'
import { getFacilitySettings } from '@/app/api/_lib/settings'

export { getFacilitySettings }

export const updateSettingsSchema = z
  .object({
    matchDurationMinutes: z.number().int().min(5).max(120).optional(),
    maxPlayersPerMatch: z.union([z.literal(2), z.literal(4)]).optional(),
    openHour: z.number().int().min(0).max(23).optional(),
    closeHour: z.number().int().min(1).max(24).optional(),
    bookingHoldMinutes: z.number().int().min(5).max(120).optional(),
  })
  .refine(
    (value) =>
      value.openHour === undefined ||
      value.closeHour === undefined ||
      value.closeHour > value.openHour,
    { message: 'Closing hour must be after opening hour' }
  )

export async function updateSettings(input: z.infer<typeof updateSettingsSchema>) {
  const { supabase } = await requireAdmin()

  // Cross-check against current values when only one side of the range changes.
  const current = await getFacilitySettings()
  const openHour = input.openHour ?? current.open_hour
  const closeHour = input.closeHour ?? current.close_hour
  if (closeHour <= openHour) {
    throw new ApiError(400, 'Closing hour must be after opening hour')
  }

  const { data, error } = await supabase
    .from('facility_settings')
    .update({
      ...(input.matchDurationMinutes !== undefined && {
        match_duration_minutes: input.matchDurationMinutes,
      }),
      ...(input.maxPlayersPerMatch !== undefined && {
        max_players_per_match: input.maxPlayersPerMatch,
      }),
      ...(input.openHour !== undefined && { open_hour: input.openHour }),
      ...(input.closeHour !== undefined && { close_hour: input.closeHour }),
      ...(input.bookingHoldMinutes !== undefined && {
        booking_hold_minutes: input.bookingHoldMinutes,
      }),
    })
    .eq('id', true)
    .select()
    .maybeSingle()

  if (error) throw new ApiError(500, error.message)
  if (!data) throw new ApiError(404, 'Facility settings row is missing — run the seeders')
  return data
}
