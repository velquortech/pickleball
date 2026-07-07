import { ok, fail } from '@/app/api/_lib/http'
import { allocateMatches } from '../controller'

export async function POST() {
  try {
    return ok(await allocateMatches(), 201)
  } catch (error) {
    return fail(error)
  }
}
