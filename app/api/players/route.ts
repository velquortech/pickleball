import { ok, fail, ApiError } from '@/app/api/_lib/http'
import { searchPlayers, searchPlayersSchema } from './controller'

export async function GET(request: Request) {
  try {
    const search = new URL(request.url).searchParams.get('search') ?? ''
    const parsed = searchPlayersSchema.safeParse({ search })
    if (!parsed.success) throw new ApiError(400, 'Search for at least 2 characters')

    return ok(await searchPlayers(parsed.data))
  } catch (error) {
    return fail(error)
  }
}
