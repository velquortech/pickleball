import { ok, fail, parseBody } from '@/app/api/_lib/http'
import { updateCourt, deactivateCourt, updateCourtSchema } from '../controller'

type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, ctx: Context) {
  try {
    const { id } = await ctx.params
    const input = await parseBody(request, updateCourtSchema)
    return ok(await updateCourt(id, input))
  } catch (error) {
    return fail(error)
  }
}

export async function DELETE(_request: Request, ctx: Context) {
  try {
    const { id } = await ctx.params
    return ok(await deactivateCourt(id))
  } catch (error) {
    return fail(error)
  }
}
