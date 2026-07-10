import { ok, fail } from '@/app/api/_lib/http'
import { joinQueue, leaveQueue } from '../controller'

// The caller's own queue spot — identified by their session, never by a
// client-supplied player id (S13).
export async function POST() {
  try {
    return ok(await joinQueue(), 201)
  } catch (error) {
    return fail(error)
  }
}

export async function DELETE() {
  try {
    return ok(await leaveQueue())
  } catch (error) {
    return fail(error)
  }
}
