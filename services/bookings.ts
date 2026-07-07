import { api, authApi } from './http'
import type { Booking, BookingStatus, BookingType, PaymentStatus } from '@/config/supabase/models'

export type PublicBooking = {
  referenceCode: string
  status: BookingStatus
  bookingType: BookingType
  courtName: string | null
  customerName: string
  startsAt: string
  endsAt: string
  playersCount: number
  amountCents: number
  currency: string
  expiresAt: string | null
  payment?: { status: PaymentStatus; paidAt: string | null } | null
}

export type CourtAvailability = {
  id: string
  name: string
  slots: { startsAt: string; endsAt: string; hour: number; available: boolean }[]
}

export function getAvailability(date: string, courtId?: string) {
  const params = new URLSearchParams({ date })
  if (courtId) params.set('courtId', courtId)
  return api.get<CourtAvailability[]>(`/api/bookings/availability?${params}`)
}

export function createBooking(input: {
  bookingType: BookingType
  courtId: string
  customerName: string
  customerEmail: string
  customerPhone: string
  startsAt: string
  hours: number
  playersCount: number
  notes?: string
}) {
  return api.post<PublicBooking>('/api/bookings', input)
}

export function getBookingByReference(referenceCode: string) {
  return api.get<PublicBooking>(`/api/bookings/${encodeURIComponent(referenceCode)}`)
}

export function getBookings() {
  return authApi.get<(Booking & { courts: { name: string } | null })[]>('/api/bookings')
}

export function cancelBookingByReference(referenceCode: string) {
  return authApi.post<Booking>(`/api/bookings/${encodeURIComponent(referenceCode)}/cancel`)
}
