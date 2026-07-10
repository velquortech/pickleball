import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY

// The roster guard (L19/L20) and the live-court index (L6) are the race-proof
// core of stacking: no 5th player, no 3-player match, no double-booked player.
const describeWithSupabase = url && secretKey ? describe : describe.skip

describeWithSupabase('roster stacking constraints', () => {
  const admin = createClient(url!, secretKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const stamp = Date.now()
  let players: string[] = []
  let courtA: string
  let courtB: string

  const createMatch = (courtId: string, capacity: 2 | 4, status: 'forming' | 'active' = 'forming') =>
    admin
      .from('matches')
      .insert({
        court_id: courtId,
        status,
        capacity,
        ends_at: status === 'active' ? new Date(Date.now() + 20 * 60_000).toISOString() : null,
      })
      .select('id')
      .single()

  beforeAll(async () => {
    const inserted = await admin
      .from('players')
      .insert(
        Array.from({ length: 5 }, (_, index) => ({
          display_name: `Stacker ${index + 1} ${stamp}`,
        }))
      )
      .select('id')
    players = inserted.data!.map((player) => player.id)

    const courts = await admin
      .from('courts')
      .insert([
        { name: `Stack Court A ${stamp}`, court_type: 'open_play', is_active: false },
        { name: `Stack Court B ${stamp}`, court_type: 'open_play', is_active: false },
      ])
      .select('id')
    courtA = courts.data![0].id
    courtB = courts.data![1].id
  })

  afterAll(async () => {
    await admin.from('matches').delete().in('court_id', [courtA, courtB])
    await admin.from('players').delete().in('id', players)
    await admin.from('courts').delete().in('id', [courtA, courtB])
  })

  afterEach(async () => {
    await admin.from('matches').delete().in('court_id', [courtA, courtB])
  })

  it('a forming roster holds the court against a second live match', async () => {
    const first = await createMatch(courtA, 4)
    expect(first.error).toBeNull()

    const second = await createMatch(courtA, 2)
    expect(second.error?.code).toBe('23505')
  })

  it('a forming roster blocks an active match on the same court', async () => {
    await createMatch(courtA, 4)
    const active = await createMatch(courtA, 4, 'active')
    expect(active.error?.code).toBe('23505')
  })

  it('releases the court once the roster is cancelled', async () => {
    const first = await createMatch(courtA, 4)
    await admin.from('matches').update({ status: 'cancelled' }).eq('id', first.data!.id)

    const second = await createMatch(courtA, 4)
    expect(second.error).toBeNull()
  })

  // L19: capacity is enforced by a row-locking trigger, not by a read-then-write.
  it('refuses a 5th player on a doubles roster', async () => {
    const match = await createMatch(courtA, 4)

    for (const playerId of players.slice(0, 4)) {
      const seat = await admin
        .from('match_players')
        .insert({ match_id: match.data!.id, player_id: playerId, source: 'stack' })
      expect(seat.error).toBeNull()
    }

    const overflow = await admin
      .from('match_players')
      .insert({ match_id: match.data!.id, player_id: players[4], source: 'stack' })

    expect(overflow.error?.code).toBe('PB001')
    expect(overflow.error?.message).toMatch(/is full/i)
  })

  it('refuses a 3rd player on a singles roster', async () => {
    const match = await createMatch(courtA, 2)

    await admin.from('match_players').insert({ match_id: match.data!.id, player_id: players[0] })
    await admin.from('match_players').insert({ match_id: match.data!.id, player_id: players[1] })

    const third = await admin
      .from('match_players')
      .insert({ match_id: match.data!.id, player_id: players[2] })

    expect(third.error?.code).toBe('PB001')
  })

  // L20: one live court per player, so their minutes can never be committed twice.
  it('refuses a player who is already on another live court', async () => {
    const first = await createMatch(courtA, 4)
    const second = await createMatch(courtB, 4)

    await admin.from('match_players').insert({ match_id: first.data!.id, player_id: players[0] })

    const doubleBooked = await admin
      .from('match_players')
      .insert({ match_id: second.data!.id, player_id: players[0] })

    expect(doubleBooked.error?.code).toBe('PB002')
    expect(doubleBooked.error?.message).toMatch(/already on a live court/i)
  })

  it('lets a player join a new court once the old match completes', async () => {
    const first = await createMatch(courtA, 2, 'active')
    await admin.from('match_players').insert({ match_id: first.data!.id, player_id: players[0] })
    await admin.from('matches').update({ status: 'completed' }).eq('id', first.data!.id)

    const second = await createMatch(courtB, 4)
    const rejoin = await admin
      .from('match_players')
      .insert({ match_id: second.data!.id, player_id: players[0] })

    expect(rejoin.error).toBeNull()
  })

  it('refuses to seat anyone on a roster that is no longer live', async () => {
    const match = await createMatch(courtA, 4)
    await admin.from('matches').update({ status: 'cancelled' }).eq('id', match.data!.id)

    const seat = await admin
      .from('match_players')
      .insert({ match_id: match.data!.id, player_id: players[0] })

    expect(seat.error?.code).toBe('PB003')
  })

  it('requires an end time before a match may go active', async () => {
    const match = await createMatch(courtA, 2)

    const started = await admin
      .from('matches')
      .update({ status: 'active' })
      .eq('id', match.data!.id)

    expect(started.error?.code).toBe('23514')
  })

  it('rejects a capacity that is neither singles nor doubles', async () => {
    const { error } = await admin
      .from('matches')
      .insert({ court_id: courtA, status: 'forming', capacity: 3, ends_at: null })

    expect(error?.code).toBe('23514')
  })
})
