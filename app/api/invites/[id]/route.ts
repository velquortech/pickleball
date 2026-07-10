import { ok, fail, parseBody } from '@/app/api/_lib/http'
import { cancelInvite, respondToInvite, respondToInviteSchema } from '../controller'

type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, ctx: Context) {
  try {
    const { id } = await ctx.params
    const input = await parseBody(request, respondToInviteSchema)
    return ok(await respondToInvite(id, input))
  } catch (error) {
    return fail(error)
  }
}

export async function DELETE(_request: Request, ctx: Context) {
  try {
    const { id } = await ctx.params
    return ok(await cancelInvite(id))
  } catch (error) {
    return fail(error)
  }
}
