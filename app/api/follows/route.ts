import { ok, fail, parseBody, ApiError } from '@/app/api/_lib/http'
import { followPlayer, followSchema, listFollows, listFollowsSchema } from './controller'

export async function GET(request: Request) {
  try {
    const type = new URL(request.url).searchParams.get('type') ?? 'following'
    const parsed = listFollowsSchema.safeParse({ type })
    if (!parsed.success) throw new ApiError(400, 'type must be "following" or "followers"')

    return ok(await listFollows(parsed.data))
  } catch (error) {
    return fail(error)
  }
}

export async function POST(request: Request) {
  try {
    const input = await parseBody(request, followSchema)
    return ok(await followPlayer(input), 201)
  } catch (error) {
    return fail(error)
  }
}
