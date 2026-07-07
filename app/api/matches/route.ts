import { ok, fail } from '@/app/api/_lib/http'
import { listActiveMatches } from './controller'

export async function GET() {
  try {
    return ok(await listActiveMatches())
  } catch (error) {
    return fail(error)
  }
}
