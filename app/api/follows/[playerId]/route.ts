import { ok, fail } from '@/app/api/_lib/http'
import { unfollowPlayer } from '../controller'

type Context = { params: Promise<{ playerId: string }> }

export async function DELETE(_request: Request, ctx: Context) {
  try {
    const { playerId } = await ctx.params
    return ok(await unfollowPlayer(playerId))
  } catch (error) {
    return fail(error)
  }
}
