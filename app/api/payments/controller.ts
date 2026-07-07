import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { createAdminClient } from '@/config/supabase/admin'
import { ApiError } from '@/app/api/_lib/http'

export const webhookPayloadSchema = z.object({
  referenceCode: z.string().min(1),
  providerRef: z.string().min(1),
  status: z.enum(['paid', 'failed']),
})

// L3/S6: bookings only become 'confirmed' through a signature-verified webhook
// (or the mock provider in local dev). Signature is HMAC-SHA256 of the raw body.
export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET
  if (!secret) throw new ApiError(500, 'PAYMENT_WEBHOOK_SECRET is not configured')
  if (!signature) throw new ApiError(401, 'Missing webhook signature')

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const expectedBuffer = Buffer.from(expected)
  const receivedBuffer = Buffer.from(signature)

  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    throw new ApiError(401, 'Invalid webhook signature')
  }
}

export async function settlePayment(input: z.infer<typeof webhookPayloadSchema>) {
  const admin = createAdminClient()

  const { data: booking } = await admin
    .from('bookings')
    .select('id, status, payments(id, status)')
    .eq('reference_code', input.referenceCode.trim().toUpperCase())
    .maybeSingle()

  if (!booking) throw new ApiError(404, 'Booking not found')
  if (booking.status !== 'pending_payment') {
    // Idempotent: repeated webhooks for a settled booking are acknowledged.
    return { referenceCode: input.referenceCode, status: booking.status, changed: false }
  }

  const payment = booking.payments?.[0]
  if (!payment) throw new ApiError(500, 'Booking has no payment record')

  if (input.status === 'paid') {
    const { error: paymentError } = await admin
      .from('payments')
      .update({
        status: 'paid',
        provider_ref: input.providerRef,
        paid_at: new Date().toISOString(),
      })
      .eq('id', payment.id)
      .eq('status', 'pending')
    if (paymentError) throw new ApiError(500, paymentError.message)

    const { error: bookingError } = await admin
      .from('bookings')
      .update({ status: 'confirmed', expires_at: null })
      .eq('id', booking.id)
      .eq('status', 'pending_payment')
    if (bookingError) throw new ApiError(500, bookingError.message)

    return { referenceCode: input.referenceCode, status: 'confirmed', changed: true }
  }

  const { error } = await admin
    .from('payments')
    .update({ status: 'failed', provider_ref: input.providerRef })
    .eq('id', payment.id)
    .eq('status', 'pending')
  if (error) throw new ApiError(500, error.message)

  return { referenceCode: input.referenceCode, status: 'pending_payment', changed: true }
}

// Mock checkout is ONLY available with the mock provider outside production (S6).
export function assertMockPaymentsEnabled() {
  const provider = process.env.PAYMENTS_PROVIDER ?? 'mock'
  if (provider !== 'mock' || process.env.NODE_ENV === 'production') {
    throw new ApiError(403, 'Mock payments are disabled')
  }
}
