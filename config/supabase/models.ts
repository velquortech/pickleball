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
export type PlaySession = Tables['play_sessions']['Row']
export type PlayerCredits = Tables['player_credits']['Row']
export type PlayCreditLedger = Tables['play_credit_ledger']['Row']
export type Follow = Tables['follows']['Row']
export type MatchInvite = Tables['match_invites']['Row']

export type CourtType = Enums['court_type']
export type CourtStatus = Enums['court_status']
export type QueueStatus = Enums['queue_status']
export type MatchStatus = Enums['match_status']
export type BookingType = Enums['booking_type']
export type BookingStatus = Enums['booking_status']
export type PaymentStatus = Enums['payment_status']
export type RateType = Enums['rate_type']
export type PlaySessionStatus = Enums['play_session_status']
export type InviteStatus = Enums['invite_status']
export type MatchPlayerSource = Enums['match_player_source']
export type CreditReason = Enums['credit_reason']
