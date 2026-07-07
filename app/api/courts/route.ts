import { ok, fail, parseBody } from '@/app/api/_lib/http'
import { listCourts, createCourt, createCourtSchema } from './controller'

export async function GET() {
  try {
    return ok(await listCourts())
  } catch (error) {
    return fail(error)
  }
}

export async function POST(request: Request) {
  try {
    const input = await parseBody(request, createCourtSchema)
    return ok(await createCourt(input), 201)
  } catch (error) {
    return fail(error)
  }
}
