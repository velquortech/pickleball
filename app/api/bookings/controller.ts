import 'server-only'

import { z } from 'zod'
import { createClient } from '@/config/supabase/server'
import { createAdminClient } from '@/config/supabase/admin'
import { requireAdmin } from '@/app/api/_lib/auth'
import { ApiError } from '@/app/api/_lib/http'
import { buildDaySlots } from '@/app/api/_lib/booking-slots'
import {
  generateReferenceCode,
  REFERENCE_CODE_PATTERN,
} from '@/app/api/_lib/reference-code'
import { getFacilitySettings } from '@/app/api/_lib/settings'
import type { Booking } from '@/config/supabase/models'

export const createBookingSchema = z.object({
  bookingType: z.enum(['private_rental', 'coaching']),
  courtId: z.uuid(),
  customerName: z.string().trim().min(1).max(120),
  customerEmail: z.email(),
  customerPhone: z.string().trim().min(7).max(20),
  startsAt: z.iso.datetime({ offset: true }),
  hours: z.number().int().min(1).max(4),
  playersCount: z.number().int().min(1).max(4).default(4),
  notes: z.string().trim().max(500).optional(),
})

export const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
  courtId: z.uuid().optional(),
})

// The only booking fields safe to show to an anonymous caller (S8).
function sanitizeBooking(booking: Booking & { courts?: { name: string } | null }) {
  return {
    referenceCode: booking.reference_code,
    status: booking.status,
    bookingType: booking.booking_type,
    courtName: booking.courts?.name ?? null,
    customerName: booking.customer_name,
    startsAt: booking.starts_at,
    endsAt: booking.ends_at,
    playersCount: booking.players_count,
    amountCents: booking.amount_cents,
    currency: booking.currency,
    expiresAt: booking.expires_at,
  }
}

// L4: pending bookings only hold a slot until expires_at; flip stale ones
// lazily since there is no cron in local dev.
async function expireStaleBookings() {
  const admin = createAdminClient()
  await admin
    .from('bookings')
    .update({ status: 'expired' })
    .eq('status', 'pending_payment')
    .lt('expires_at', new Date().toISOString())
}

// Public: hourly availability for VIP courts on a given date (SSR-friendly,
// driven by URL params on /book).
export async function getAvailability(query: z.infer<typeof availabilityQuerySchema>) {
  await expireStaleBookings()

  const supabase = await createClient()
  const settings = await getFacilitySettings()

  let courtsQuery = supabase
    .from('courts')
    .select('id, name, court_type')
    .eq('is_active', true)
    .eq('court_type', 'vip') // L11: only VIP courts are bookable
    .neq('status', 'closed')
    .order('sort_order')

  if (query.courtId) courtsQuery = courtsQuery.eq('id', query.courtId)

  const { data: courts, error } = await courtsQuery
  if (error) throw new ApiError(500, error.message)

  const admin = createAdminClient()
  const dayStart = `${query.date}T00:00:00+08:00`
  const dayEnd = `${query.date}T23:59:59+08:00`

  const { data: busy, error: busyError } = await admin
    .from('bookings')
    .select('court_id, starts_at, ends_at')
    .in('status', ['pending_payment', 'confirmed'])
    .lt('starts_at', dayEnd)
    .gt('ends_at', dayStart)

  if (busyError) throw new ApiError(500, busyError.message)

  return courts.map((court) => ({
    ...court,
    slots: buildDaySlots(query.date, {
      openHour: settings.open_hour,
      closeHour: settings.close_hour,
      timezone: settings.timezone,
      busy: (busy ?? []).filter((b) => b.court_id === court.id),
    }),
  }))
}

// Public: create a booking. Price is ALWAYS computed server-side from the
// rates table (L2); the client never sends an amount.
export async function createBooking(input: z.infer<typeof createBookingSchema>) {
  await expireStaleBookings()

  const supabase = await createClient()
  const settings = await getFacilitySettings()
  const admin = createAdminClient()

  const startsAt = new Date(input.startsAt)
  const endsAt = new Date(startsAt.getTime() + input.hours * 60 * 60 * 1000)

  if (startsAt <= new Date()) {
    throw new ApiError(400, 'Booking must start in the future')
  }

  // L9: enforce open hours in the facility timezone.
  const hourInTz = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: settings.timezone,
      hour: 'numeric',
      hour12: false,
    }).format(startsAt)
  )
  if (
    hourInTz < settings.open_hour ||
    hourInTz + input.hours > settings.close_hour
  ) {
    throw new ApiError(
      400,
      `Bookings run between ${settings.open_hour}:00 and ${settings.close_hour}:00`
    )
  }

  // L11: private rentals/coaching only on active VIP courts.
  const { data: court } = await supabase
    .from('courts')
    .select('id, court_type, is_active, status')
    .eq('id', input.courtId)
    .maybeSingle()

  if (!court || !court.is_active || court.court_type !== 'vip' || court.status === 'closed') {
    throw new ApiError(400, 'That court is not available for booking')
  }

  const { data: rate } = await supabase
    .from('rates')
    .select('price_cents, currency')
    .eq('rate_type', input.bookingType)
    .eq('is_active', true)
    .order('sort_order')
    .limit(1)
    .maybeSingle()

  if (!rate) throw new ApiError(500, 'No active rate configured for this booking type')

  const expiresAt = new Date(
    Date.now() + settings.booking_hold_minutes * 60 * 1000
  )

  // Retry on the (astronomically unlikely) reference-code collision.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: booking, error } = await admin
      .from('bookings')
      .insert({
        reference_code: generateReferenceCode(),
        booking_type: input.bookingType,
        court_id: input.courtId,
        customer_name: input.customerName,
        customer_email: input.customerEmail,
        customer_phone: input.customerPhone,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        players_count: input.playersCount,
        amount_cents: rate.price_cents * input.hours,
        currency: rate.currency,
        expires_at: expiresAt.toISOString(),
        notes: input.notes ?? null,
      })
      .select('*, courts(name)')
      .single()

    if (error?.code === '23P01') {
      // L1: exclusion constraint — slot already held.
      throw new ApiError(409, 'That time slot was just taken — pick another one')
    }
    if (error?.code === '23505') continue // reference code collision → retry
    if (error) throw new ApiError(500, error.message)

    const { error: paymentError } = await admin.from('payments').insert({
      booking_id: booking.id,
      provider: process.env.PAYMENTS_PROVIDER ?? 'mock',
      amount_cents: booking.amount_cents,
      currency: booking.currency,
    })
    if (paymentError) throw new ApiError(500, paymentError.message)

    return sanitizeBooking(booking)
  }

  throw new ApiError(500, 'Could not generate a booking reference — try again')
}

// Public: look up one booking by exact reference code (no listing for anon, L8).
export async function getBookingByReference(referenceCode: string) {
  const normalized = referenceCode.trim().toUpperCase()
  if (!REFERENCE_CODE_PATTERN.test(normalized)) {
    throw new ApiError(400, 'Invalid reference code format')
  }

  await expireStaleBookings()

  const admin = createAdminClient()
  const { data: booking, error } = await admin
    .from('bookings')
    .select('*, courts(name), payments(status, paid_at)')
    .eq('reference_code', normalized)
    .maybeSingle()

  if (error) throw new ApiError(500, error.message)
  if (!booking) throw new ApiError(404, 'Booking not found')

  return {
    ...sanitizeBooking(booking),
    payment: booking.payments?.[0]
      ? { status: booking.payments[0].status, paidAt: booking.payments[0].paid_at }
      : null,
  }
}

// Admin: full booking list.
export async function listBookings() {
  const { supabase } = await requireAdmin()

  const { data, error } = await supabase
    .from('bookings')
    .select('*, courts(name), payments(status, paid_at)')
    .order('starts_at', { ascending: false })
    .limit(100)

  if (error) throw new ApiError(500, error.message)
  return data
}

// Admin: cancel a pending/confirmed booking (frees the slot).
export async function cancelBooking(id: string) {
  const { supabase } = await requireAdmin()

  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .in('status', ['pending_payment', 'confirmed'])
    .select()
    .maybeSingle()

  if (error) throw new ApiError(500, error.message)
  if (!data) throw new ApiError(404, 'Booking not found or not cancellable')
  return data
}
