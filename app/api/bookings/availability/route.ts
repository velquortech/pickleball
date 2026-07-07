import { ok, fail, ApiError } from '@/app/api/_lib/http'
import { getAvailability, availabilityQuerySchema } from '../controller'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const result = availabilityQuerySchema.safeParse({
      date: searchParams.get('date') ?? '',
      courtId: searchParams.get('courtId') ?? undefined,
    })
    if (!result.success) {
      throw new ApiError(400, result.error.issues[0].message)
    }
    return ok(await getAvailability(result.data))
  } catch (error) {
    return fail(error)
  }
}
