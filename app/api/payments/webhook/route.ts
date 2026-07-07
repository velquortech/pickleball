import { ok, fail, ApiError } from '@/app/api/_lib/http'
import {
  settlePayment,
  verifyWebhookSignature,
  webhookPayloadSchema,
} from '../controller'

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    verifyWebhookSignature(rawBody, request.headers.get('x-webhook-signature'))

    const result = webhookPayloadSchema.safeParse(JSON.parse(rawBody))
    if (!result.success) throw new ApiError(400, 'Invalid webhook payload')

    return ok(await settlePayment(result.data))
  } catch (error) {
    return fail(error)
  }
}
