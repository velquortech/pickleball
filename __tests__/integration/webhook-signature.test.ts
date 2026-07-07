import { createHmac } from 'node:crypto'
import { verifyWebhookSignature } from '@/app/api/payments/controller'
import { ApiError } from '@/app/api/_lib/http'

// S6/L3: bookings only confirm through a signature-verified webhook.
const describeWithSecret = process.env.PAYMENT_WEBHOOK_SECRET ? describe : describe.skip

describeWithSecret('payment webhook signature verification', () => {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET!
  const body = JSON.stringify({
    referenceCode: 'PB-TESTTEST',
    providerRef: 'prov_123',
    status: 'paid',
  })

  const sign = (payload: string, key: string) =>
    createHmac('sha256', key).update(payload).digest('hex')

  it('accepts a correctly signed payload', () => {
    expect(() => verifyWebhookSignature(body, sign(body, secret))).not.toThrow()
  })

  it('rejects a missing signature with 401', () => {
    try {
      verifyWebhookSignature(body, null)
      throw new Error('should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      expect((error as ApiError).status).toBe(401)
    }
  })

  it('rejects a signature made with the wrong secret', () => {
    expect(() => verifyWebhookSignature(body, sign(body, 'wrong-secret'))).toThrow(
      /invalid webhook signature/i
    )
  })

  it('rejects a signature for a tampered body', () => {
    const tampered = body.replace('paid', 'faid')
    expect(() => verifyWebhookSignature(tampered, sign(body, secret))).toThrow(
      /invalid webhook signature/i
    )
  })

  it('rejects malformed signatures without crashing (timing-safe length check)', () => {
    expect(() => verifyWebhookSignature(body, 'short')).toThrow(/invalid webhook signature/i)
  })
})
