import { ok, fail, parseBody } from '@/app/api/_lib/http'
import { createBooking, createBookingSchema, listBookings } from './controller'

export async function GET() {
  try {
    return ok(await listBookings())
  } catch (error) {
    return fail(error)
  }
}

export async function POST(request: Request) {
  try {
    const input = await parseBody(request, createBookingSchema)
    return ok(await createBooking(input), 201)
  } catch (error) {
    return fail(error)
  }
}
