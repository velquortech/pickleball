import { ok, fail, parseBody } from '@/app/api/_lib/http'
import { listMySessions, purchaseHours, purchaseHoursSchema } from './controller'

export async function GET() {
  try {
    return ok(await listMySessions())
  } catch (error) {
    return fail(error)
  }
}

export async function POST(request: Request) {
  try {
    const input = await parseBody(request, purchaseHoursSchema)
    return ok(await purchaseHours(input), 201)
  } catch (error) {
    return fail(error)
  }
}
