import { ok, fail } from '@/app/api/_lib/http'
import { getQueueProjection } from '../controller'

export async function GET() {
  try {
    return ok(await getQueueProjection())
  } catch (error) {
    return fail(error)
  }
}
