import { ok, fail } from '@/app/api/_lib/http'
import { cancelMatch } from '../../controller'

type Context = { params: Promise<{ id: string }> }

export async function POST(_request: Request, ctx: Context) {
  try {
    const { id } = await ctx.params
    return ok(await cancelMatch(id))
  } catch (error) {
    return fail(error)
  }
}
