import { ok, fail, parseBody } from '@/app/api/_lib/http'
import { cancelQueueEntry, updateQueueEntrySchema } from '../controller'

type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, ctx: Context) {
  try {
    const { id } = await ctx.params
    await parseBody(request, updateQueueEntrySchema)
    return ok(await cancelQueueEntry(id))
  } catch (error) {
    return fail(error)
  }
}
