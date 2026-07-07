import { ok, fail, parseBody } from '@/app/api/_lib/http'
import { endMatch, endMatchSchema } from '../../controller'

type Context = { params: Promise<{ id: string }> }

export async function POST(request: Request, ctx: Context) {
  try {
    const { id } = await ctx.params
    const input = await parseBody(request, endMatchSchema)
    return ok(await endMatch(id, input))
  } catch (error) {
    return fail(error)
  }
}
