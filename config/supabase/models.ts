// Friendly aliases over the generated Database types (config/supabase/types.ts).
// Import row/enum types from here — types.ts is overwritten by `make generate-types`.

import type { Database } from './types'

type Tables = Database['public']['Tables']
type Enums = Database['public']['Enums']

export type Profile = Tables['profiles']['Row']
export type Court = Tables['courts']['Row']
export type Player = Tables['players']['Row']
export type QueueEntry = Tables['queue_entries']['Row']
export type Match = Tables['matches']['Row']
export type MatchPlayer = Tables['match_players']['Row']
export type Booking = Tables['bookings']['Row']
export type Payment = Tables['payments']['Row']
export type Rate = Tables['rates']['Row']
export type FacilitySettings = Tables['facility_settings']['Row']

export type CourtType = Enums['court_type']
export type CourtStatus = Enums['court_status']
export type QueueStatus = Enums['queue_status']
export type MatchStatus = Enums['match_status']
export type BookingType = Enums['booking_type']
export type BookingStatus = Enums['booking_status']
export type PaymentStatus = Enums['payment_status']
export type RateType = Enums['rate_type']
