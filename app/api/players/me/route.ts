import { ok, fail, parseBody } from '@/app/api/_lib/http'
import { getMe, updateMe, updateMeSchema } from '../controller'

export async function GET() {
  try {
    return ok(await getMe())
  } catch (error) {
    return fail(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const input = await parseBody(request, updateMeSchema)
    return ok(await updateMe(input))
  } catch (error) {
    return fail(error)
  }
}
