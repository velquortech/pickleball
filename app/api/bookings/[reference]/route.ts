import { ok, fail } from '@/app/api/_lib/http'
import { getBookingByReference } from '../controller'

type Context = { params: Promise<{ reference: string }> }

export async function GET(_request: Request, ctx: Context) {
  try {
    const { reference } = await ctx.params
    return ok(await getBookingByReference(reference))
  } catch (error) {
    return fail(error)
  }
}
