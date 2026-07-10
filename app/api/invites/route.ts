import { ok, fail, parseBody } from '@/app/api/_lib/http'
import { createInvite, createInviteSchema, listInvites } from './controller'

export async function GET() {
  try {
    return ok(await listInvites())
  } catch (error) {
    return fail(error)
  }
}

export async function POST(request: Request) {
  try {
    const input = await parseBody(request, createInviteSchema)
    return ok(await createInvite(input), 201)
  } catch (error) {
    return fail(error)
  }
}
