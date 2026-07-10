import { ok, fail } from '@/app/api/_lib/http'
import { getMySessionByReference } from '../controller'

type Context = { params: Promise<{ reference: string }> }

export async function GET(_request: Request, ctx: Context) {
  try {
    const { reference } = await ctx.params
    return ok(await getMySessionByReference(reference))
  } catch (error) {
    return fail(error)
  }
}
