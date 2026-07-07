import { ok, fail, ApiError } from '@/app/api/_lib/http'
import { createAdminClient } from '@/config/supabase/admin'
import { requireAdmin } from '@/app/api/_lib/auth'
import { cancelBooking } from '../../controller'

type Context = { params: Promise<{ reference: string }> }

// Admin: cancel by reference code.
export async function POST(_request: Request, ctx: Context) {
  try {
    await requireAdmin()
    const { reference } = await ctx.params

    const admin = createAdminClient()
    const { data: booking } = await admin
      .from('bookings')
      .select('id')
      .eq('reference_code', reference.trim().toUpperCase())
      .maybeSingle()

    if (!booking) throw new ApiError(404, 'Booking not found')
    return ok(await cancelBooking(booking.id))
  } catch (error) {
    return fail(error)
  }
}
