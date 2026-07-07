import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

// Verifies the RLS/grant boundaries (S1/S8/L13) with a plain anonymous client.
const describeWithSupabase = url && publishableKey ? describe : describe.skip

describeWithSupabase('anonymous access boundaries', () => {
  const anon = () => createClient(url!, publishableKey!)

  it('can read the dashboard-safe tables', async () => {
    const supabase = anon()

    const courts = await supabase.from('courts').select('id, name')
    expect(courts.error).toBeNull()
    expect(courts.data!.length).toBeGreaterThan(0)

    const rates = await supabase.from('rates').select('id')
    expect(rates.error).toBeNull()
    expect(rates.data!.length).toBeGreaterThan(0)
  })

  it('cannot read bookings or payments (no grants for anon)', async () => {
    const supabase = anon()

    const bookings = await supabase.from('bookings').select('id')
    expect(bookings.error).not.toBeNull()
    expect(bookings.error!.message).toMatch(/permission denied/i)

    const payments = await supabase.from('payments').select('id')
    expect(payments.error).not.toBeNull()
  })

  it('cannot write to the queue or courts', async () => {
    const supabase = anon()

    const insertQueue = await supabase
      .from('queue_entries')
      .insert({ player_id: '00000000-0000-4000-8000-000000000000' })
    expect(insertQueue.error).not.toBeNull()

    const insertCourt = await supabase.from('courts').insert({ name: 'Rogue Court' })
    expect(insertCourt.error).not.toBeNull()
  })

  it('cannot modify facility settings', async () => {
    const supabase = anon()

    const { error } = await supabase
      .from('facility_settings')
      .update({ match_duration_minutes: 5 })
      .eq('id', true)
    expect(error).not.toBeNull()
  })
})
