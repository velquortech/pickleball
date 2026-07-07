import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY

// L1: the DB exclusion constraint is the race-proof double-booking guard.
const describeWithSupabase = url && secretKey ? describe : describe.skip

describeWithSupabase('booking overlap constraint', () => {
  const admin = createClient(url!, secretKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const createdIds: string[] = []
  let courtId: string

  // A far-future window keeps this test clear of real dev data.
  const base = Date.parse('2031-01-15T02:00:00Z')
  const hours = (n: number) => new Date(base + n * 3_600_000).toISOString()

  function bookingRow(startHour: number, endHour: number, ref: string) {
    return {
      reference_code: ref,
      booking_type: 'private_rental' as const,
      court_id: courtId,
      customer_name: 'Constraint Test',
      customer_email: 'constraint@test.local',
      customer_phone: '09170000000',
      starts_at: hours(startHour),
      ends_at: hours(endHour),
      players_count: 4,
      amount_cents: 60000,
    }
  }

  beforeAll(async () => {
    const { data } = await admin
      .from('courts')
      .select('id')
      .eq('court_type', 'vip')
      .limit(1)
      .single()
    courtId = data!.id
  })

  afterAll(async () => {
    if (createdIds.length > 0) {
      await admin.from('bookings').delete().in('id', createdIds)
    }
  })

  it('rejects an overlapping booking with 23P01', async () => {
    const first = await admin
      .from('bookings')
      .insert(bookingRow(0, 2, 'ZT-TESTAAAA'))
      .select('id')
      .single()
    expect(first.error).toBeNull()
    createdIds.push(first.data!.id)

    // Overlaps hour 1–2 of the first booking.
    const second = await admin.from('bookings').insert(bookingRow(1, 3, 'ZT-TESTBBBB'))
    expect(second.error?.code).toBe('23P01')
  })

  it('allows back-to-back bookings that share only a boundary', async () => {
    const adjacent = await admin
      .from('bookings')
      .insert(bookingRow(2, 3, 'ZT-TESTCCCC'))
      .select('id')
      .single()

    expect(adjacent.error).toBeNull()
    createdIds.push(adjacent.data!.id)
  })

  it('frees the slot once a booking is cancelled', async () => {
    await admin.from('bookings').update({ status: 'cancelled' }).eq('id', createdIds[0])

    const retry = await admin
      .from('bookings')
      .insert(bookingRow(0, 1, 'ZT-TESTDDDD'))
      .select('id')
      .single()

    expect(retry.error).toBeNull()
    createdIds.push(retry.data!.id)
  })
})
