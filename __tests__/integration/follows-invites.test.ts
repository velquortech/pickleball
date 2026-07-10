import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY

// The follow graph and invite table guards: no self-edges (P11) and no invite
// spam (L21).
const describeWithSupabase = url && secretKey ? describe : describe.skip

describeWithSupabase('follows and match invites', () => {
  const admin = createClient(url!, secretKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const stamp = Date.now()
  let players: string[] = []
  let courtId: string
  let matchId: string

  const expiresAt = () => new Date(Date.now() + 10 * 60_000).toISOString()

  beforeAll(async () => {
    const inserted = await admin
      .from('players')
      .insert([
        { display_name: `Friend A ${stamp}` },
        { display_name: `Friend B ${stamp}` },
        { display_name: `Friend C ${stamp}` },
      ])
      .select('id')
    players = inserted.data!.map((player) => player.id)

    const court = await admin
      .from('courts')
      .insert({ name: `Invite Court ${stamp}`, court_type: 'open_play', is_active: false })
      .select('id')
      .single()
    courtId = court.data!.id

    const match = await admin
      .from('matches')
      .insert({ court_id: courtId, status: 'forming', capacity: 4, ends_at: null })
      .select('id')
      .single()
    matchId = match.data!.id
  })

  afterAll(async () => {
    await admin.from('matches').delete().eq('court_id', courtId)
    await admin.from('players').delete().in('id', players)
    await admin.from('courts').delete().eq('id', courtId)
  })

  it('refuses a self-follow', async () => {
    const { error } = await admin
      .from('follows')
      .insert({ follower_id: players[0], followee_id: players[0] })

    expect(error?.code).toBe('23514')
    expect(error?.message).toMatch(/follows_no_self/)
  })

  it('records a follow and refuses a duplicate', async () => {
    const first = await admin
      .from('follows')
      .insert({ follower_id: players[0], followee_id: players[1] })
    expect(first.error).toBeNull()

    const duplicate = await admin
      .from('follows')
      .insert({ follower_id: players[0], followee_id: players[1] })
    expect(duplicate.error?.code).toBe('23505')
  })

  it('treats following as one-directional', async () => {
    const reverse = await admin
      .from('follows')
      .insert({ follower_id: players[1], followee_id: players[0] })
    expect(reverse.error).toBeNull()

    await admin
      .from('follows')
      .delete()
      .eq('follower_id', players[1])
      .eq('followee_id', players[0])
  })

  it('refuses a self-invite', async () => {
    const { error } = await admin.from('match_invites').insert({
      match_id: matchId,
      inviter_id: players[0],
      invitee_id: players[0],
      expires_at: expiresAt(),
    })

    expect(error?.code).toBe('23514')
    expect(error?.message).toMatch(/match_invites_no_self/)
  })

  // L21: one live invite per (match, invitee).
  it('refuses a second pending invite to the same player for the same court', async () => {
    const first = await admin.from('match_invites').insert({
      match_id: matchId,
      inviter_id: players[0],
      invitee_id: players[1],
      expires_at: expiresAt(),
    })
    expect(first.error).toBeNull()

    const duplicate = await admin.from('match_invites').insert({
      match_id: matchId,
      inviter_id: players[2],
      invitee_id: players[1],
      expires_at: expiresAt(),
    })
    expect(duplicate.error?.code).toBe('23505')
  })

  it('allows a fresh invite once the previous one is resolved', async () => {
    await admin
      .from('match_invites')
      .update({ status: 'declined', responded_at: new Date().toISOString() })
      .eq('match_id', matchId)
      .eq('invitee_id', players[1])
      .eq('status', 'pending')

    const reinvite = await admin.from('match_invites').insert({
      match_id: matchId,
      inviter_id: players[0],
      invitee_id: players[1],
      expires_at: expiresAt(),
    })
    expect(reinvite.error).toBeNull()
  })

  it('drops invites when their court roster is deleted (cascade)', async () => {
    await admin.from('matches').delete().eq('id', matchId)

    const { data } = await admin.from('match_invites').select('id').eq('match_id', matchId)
    expect(data).toEqual([])
  })
})
