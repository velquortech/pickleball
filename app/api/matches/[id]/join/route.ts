import { ok, fail } from '@/app/api/_lib/http'
import { leaveRoster, stackOntoRoster } from '../../controller'

type Context = { params: Promise<{ id: string }> }

export async function POST(_request: Request, ctx: Context) {
  try {
    const { id } = await ctx.params
    return ok(await stackOntoRoster(id))
  } catch (error) {
    return fail(error)
  }
}

export async function DELETE(_request: Request, ctx: Context) {
  try {
    const { id } = await ctx.params
    return ok(await leaveRoster(id))
  } catch (error) {
    return fail(error)
  }
}
