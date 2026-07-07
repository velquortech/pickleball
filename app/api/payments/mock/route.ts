import { z } from 'zod'
import { ok, fail, parseBody } from '@/app/api/_lib/http'
import { assertMockPaymentsEnabled, settlePayment } from '../controller'

const mockPaySchema = z.object({
  referenceCode: z.string().min(1),
})

// Local-dev stand-in for a real payment provider checkout.
export async function POST(request: Request) {
  try {
    assertMockPaymentsEnabled()
    const { referenceCode } = await parseBody(request, mockPaySchema)

    return ok(
      await settlePayment({
        referenceCode,
        providerRef: `mock_${Date.now()}`,
        status: 'paid',
      })
    )
  } catch (error) {
    return fail(error)
  }
}
