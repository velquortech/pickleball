import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY

// L5 (one active queue entry per player) and L6 (one active match per court).
const describeWithSupabase = url && secretKey ? describe : describe.skip

describeWithSupabase('queue and match uniqueness constraints', () => {
  const admin = createClient(url!, secretKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let playerId: string
  let courtId: string

  beforeAll(async () => {
    const player = await admin
      .from('players')
      .insert({ display_name: `Constraint Tester ${Date.now()}` })
      .select('id')
      .single()
    playerId = player.data!.id

    const court = await admin
      .from('courts')
      .insert({ name: `Test Court ${Date.now()}`, court_type: 'open_play', is_active: false })
      .select('id')
      .single()
    courtId = court.data!.id
  })

  afterAll(async () => {
    await admin.from('matches').delete().eq('court_id', courtId)
    await admin.from('queue_entries').delete().eq('player_id', playerId)
    await admin.from('players').delete().eq('id', playerId)
    await admin.from('courts').delete().eq('id', courtId)
  })

  it('blocks a player from holding two active queue spots', async () => {
    const first = await admin.from('queue_entries').insert({ player_id: playerId })
    expect(first.error).toBeNull()

    const second = await admin.from('queue_entries').insert({ player_id: playerId })
    expect(second.error?.code).toBe('23505')
  })

  it('lets the player re-queue after finishing', async () => {
    await admin
      .from('queue_entries')
      .update({ status: 'done' })
      .eq('player_id', playerId)
      .eq('status', 'waiting')

    const requeue = await admin.from('queue_entries').insert({ player_id: playerId })
    expect(requeue.error).toBeNull()
  })

  it('blocks two active matches on one court', async () => {
    const endsAt = new Date(Date.now() + 20 * 60_000).toISOString()

    const first = await admin.from('matches').insert({ court_id: courtId, ends_at: endsAt })
    expect(first.error).toBeNull()

    const second = await admin.from('matches').insert({ court_id: courtId, ends_at: endsAt })
    expect(second.error?.code).toBe('23505')
  })

  it('frees the court once the match completes', async () => {
    await admin
      .from('matches')
      .update({ status: 'completed', ended_at: new Date().toISOString() })
      .eq('court_id', courtId)
      .eq('status', 'active')

    const next = await admin.from('matches').insert({
      court_id: courtId,
      ends_at: new Date(Date.now() + 20 * 60_000).toISOString(),
    })
    expect(next.error).toBeNull()
  })
})
