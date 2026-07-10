import { ok, fail } from '@/app/api/_lib/http'
import { cancelMyPendingSession } from '../../controller'

type Context = { params: Promise<{ reference: string }> }

export async function POST(_request: Request, ctx: Context) {
  try {
    const { reference } = await ctx.params
    return ok(await cancelMyPendingSession(reference))
  } catch (error) {
    return fail(error)
  }
}
