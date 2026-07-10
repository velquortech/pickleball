import { ok, fail, parseBody } from '@/app/api/_lib/http'
import { createRoster, createRosterSchema, listOpenCourts } from '../controller'

export async function GET() {
  try {
    return ok(await listOpenCourts())
  } catch (error) {
    return fail(error)
  }
}

export async function POST(request: Request) {
  try {
    const input = await parseBody(request, createRosterSchema)
    return ok(await createRoster(input), 201)
  } catch (error) {
    return fail(error)
  }
}
