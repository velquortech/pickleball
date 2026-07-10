import 'server-only'

import { z } from 'zod'
import { createClient } from '@/config/supabase/server'
import { createAdminClient } from '@/config/supabase/admin'
import { requirePlayer, requireAdmin } from '@/app/api/_lib/auth'
import { ApiError } from '@/app/api/_lib/http'
import { sweepExpiredCredits } from '@/app/api/_lib/credits'
import { getFacilitySettings } from '@/app/api/_lib/settings'
import {
  generateReferenceCode,
  REFERENCE_CODE_PATTERN,
} from '@/app/api/_lib/reference-code'
import {
  MAX_PURCHASE_HOURS,
  MIN_PURCHASE_HOURS,
  minutesForHours,
  passValidUntil,
  priceForHours,
} from '@/app/api/_lib/play-credits'
import type { PlaySession } from '@/config/supabase/models'

type AdminClient = ReturnType<typeof createAdminClient>

// Play-session references use their own prefix so the payment webhook can tell
// a pass (OP-) from a court booking (PB-) by reference alone.
export const PASS_REFERENCE_PREFIX = 'OP'

export const purchaseHoursSchema = z.object({
  hours: z.number().int().min(MIN_PURCHASE_HOURS).max(MAX_PURCHASE_HOURS),
})

function sanitizeSession(session: PlaySession) {
  return {
    referenceCode: session.reference_code,
    status: session.status,
    hoursPurchased: session.hours_purchased,
    minutesTotal: session.minutes_total,
    amountCents: session.amount_cents,
    currency: session.currency,
    expiresAt: session.expires_at,
    activatedAt: session.activated_at,
    validUntil: session.valid_until,
    createdAt: session.created_at,
  }
}

export type PublicPlaySession = ReturnType<typeof sanitizeSession>

// Every credit in the ledger MUST be backed by an active pass: expire_play_credits()
// writes off any balance that no unexpired active pass accounts for (L17). A
// counter sale is therefore a real pass, already paid, not a bare ledger entry.
export async function createCounterPass(
  admin: AdminClient,
  playerId: string,
  hours: number
) {
  const settings = await getFacilitySettings()
  const rate = await getOpenPlayHourlyRate()

  const now = new Date()
  const minutes = minutesForHours(hours)
  const amountCents = priceForHours(rate.price_cents, hours)
  const validUntil = passValidUntil(now, {
    closeHour: settings.close_hour,
    timezone: settings.timezone,
  })

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: session, error } = await admin
      .from('play_sessions')
      .insert({
        player_id: playerId,
        reference_code: generateReferenceCode(PASS_REFERENCE_PREFIX),
        status: 'active',
        hours_purchased: hours,
        minutes_total: minutes,
        amount_cents: amountCents,
        currency: rate.currency,
        activated_at: now.toISOString(),
        valid_until: validUntil,
      })
      .select()
      .single()

    if (error?.code === '23505') continue // reference collision → retry
    if (error) throw new ApiError(500, error.message)

    const { error: paymentError } = await admin.from('payments').insert({
      play_session_id: session.id,
      provider: 'counter',
      amount_cents: amountCents,
      currency: rate.currency,
      status: 'paid',
      paid_at: now.toISOString(),
    })
    if (paymentError) throw new ApiError(500, paymentError.message)

    const { error: ledgerError } = await admin.from('play_credit_ledger').insert({
      player_id: playerId,
      play_session_id: session.id,
      minutes_delta: minutes,
      reason: 'admin_adjustment',
    })
    if (ledgerError) throw new ApiError(500, ledgerError.message)

    return sanitizeSession(session)
  }

  throw new ApiError(500, 'Could not generate a pass reference — try again')
}

// Price is ALWAYS computed server-side from the rates table (L2) — the client
// only ever sends how many hours it wants.
async function getOpenPlayHourlyRate() {
  const supabase = await createClient()
  const { data: rate, error } = await supabase
    .from('rates')
    .select('price_cents, currency')
    .eq('rate_type', 'open_play')
    .eq('is_active', true)
    .order('sort_order')
    .limit(1)
    .maybeSingle()

  if (error) throw new ApiError(500, error.message)
  if (!rate) throw new ApiError(500, 'No active open-play rate configured')
  return rate
}

// Buy playing time. Creates a pending pass plus its payment row; minutes are
// only credited when the payment webhook settles it (L3/P8).
export async function purchaseHours(input: z.infer<typeof purchaseHoursSchema>) {
  const { player } = await requirePlayer()
  const admin = createAdminClient()

  await sweepExpiredCredits(admin)

  const settings = await getFacilitySettings()
  const rate = await getOpenPlayHourlyRate()

  const expiresAt = new Date(Date.now() + settings.booking_hold_minutes * 60 * 1000)

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: session, error } = await admin
      .from('play_sessions')
      .insert({
        player_id: player.id,
        reference_code: generateReferenceCode(PASS_REFERENCE_PREFIX),
        hours_purchased: input.hours,
        minutes_total: minutesForHours(input.hours),
        amount_cents: priceForHours(rate.price_cents, input.hours),
        currency: rate.currency,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (error?.code === '23505') {
      // Either the reference collided (retry) or L14 fired: one pending pass.
      if (error.message.includes('one_pending_play_session_per_player')) {
        throw new ApiError(409, 'You already have a pass waiting to be paid')
      }
      continue
    }
    if (error) throw new ApiError(500, error.message)

    const { error: paymentError } = await admin.from('payments').insert({
      play_session_id: session.id,
      provider: process.env.PAYMENTS_PROVIDER ?? 'mock',
      amount_cents: session.amount_cents,
      currency: session.currency,
    })
    if (paymentError) throw new ApiError(500, paymentError.message)

    return sanitizeSession(session)
  }

  throw new ApiError(500, 'Could not generate a pass reference — try again')
}

// The caller's own passes, newest first.
export async function listMySessions() {
  const { player } = await requirePlayer()
  const admin = createAdminClient()

  await sweepExpiredCredits(admin)

  const { data, error } = await admin
    .from('play_sessions')
    .select('*')
    .eq('player_id', player.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw new ApiError(500, error.message)
  return data.map(sanitizeSession)
}

// One pass by reference. Ownership is enforced here (S14): a valid reference
// belonging to someone else is a 404, not a peek at their spending.
export async function getMySessionByReference(referenceCode: string) {
  const normalized = referenceCode.trim().toUpperCase()
  if (!REFERENCE_CODE_PATTERN.test(normalized)) {
    throw new ApiError(400, 'Invalid pass reference format')
  }

  const { player } = await requirePlayer()
  const admin = createAdminClient()

  await sweepExpiredCredits(admin)

  const { data: session, error } = await admin
    .from('play_sessions')
    .select('*, payments(status, paid_at)')
    .eq('reference_code', normalized)
    .eq('player_id', player.id)
    .maybeSingle()

  if (error) throw new ApiError(500, error.message)
  if (!session) throw new ApiError(404, 'Pass not found')

  return {
    ...sanitizeSession(session),
    payment: session.payments?.[0]
      ? { status: session.payments[0].status, paidAt: session.payments[0].paid_at }
      : null,
  }
}

export async function cancelMyPendingSession(referenceCode: string) {
  const normalized = referenceCode.trim().toUpperCase()
  const { player } = await requirePlayer()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('play_sessions')
    .update({ status: 'cancelled' })
    .eq('reference_code', normalized)
    .eq('player_id', player.id)
    .eq('status', 'pending_payment')
    .select()
    .maybeSingle()

  if (error) throw new ApiError(500, error.message)
  if (!data) throw new ApiError(404, 'No pending pass with that reference')
  return sanitizeSession(data)
}

// Admin: every pass, for the staff revenue view.
export async function listAllSessions() {
  const { supabase } = await requireAdmin()

  const { data, error } = await supabase
    .from('play_sessions')
    .select('*, players(display_name), payments(status, paid_at)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw new ApiError(500, error.message)
  return data
}
