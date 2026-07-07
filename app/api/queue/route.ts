import { ok, fail, parseBody } from '@/app/api/_lib/http'
import { listQueue, addWalkIn, addWalkInSchema } from './controller'

export async function GET() {
  try {
    return ok(await listQueue())
  } catch (error) {
    return fail(error)
  }
}

export async function POST(request: Request) {
  try {
    const input = await parseBody(request, addWalkInSchema)
    return ok(await addWalkIn(input), 201)
  } catch (error) {
    return fail(error)
  }
}
