import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

// S11/S12/S13: a player's money and social graph are read-your-own. Anonymous
// callers see nothing, and one player can never read another's balance.
const describeWithSupabase =
  url && secretKey && publishableKey ? describe : describe.skip

describeWithSupabase('player data boundaries', () => {
  const admin = createClient(url!, secretKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const stamp = Date.now()
  const alice = { email: `alice-${stamp}@pickleball.local`, password: 'Test1234!' }
  const bob = { email: `bob-${stamp}@pickleball.local`, password: 'Test1234!' }

  let aliceUserId: string
  let bobUserId: string
  let alicePlayerId: string
  let bobPlayerId: string

  // A client authenticated as a real player, exactly like the browser has.
  async function signIn(credentials: { email: string; password: string }) {
    const client = createClient(url!, publishableKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { error } = await client.auth.signInWithPassword(credentials)
    expect(error).toBeNull()
    return client
  }

  const playerIdFor = async (userId: string) => {
    const { data } = await admin
      .from('players')
      .select('id')
      .eq('profile_id', userId)
      .single()
    return data!.id
  }

  beforeAll(async () => {
    const created = await Promise.all([
      admin.auth.admin.createUser({
        email: alice.email,
        password: alice.password,
        email_confirm: true,
        user_metadata: { full_name: 'Alice Ace' },
      }),
      admin.auth.admin.createUser({
        email: bob.email,
        password: bob.password,
        email_confirm: true,
        user_metadata: { full_name: 'Bob Backhand' },
      }),
    ])

    aliceUserId = created[0].data.user!.id
    bobUserId = created[1].data.user!.id

    alicePlayerId = await playerIdFor(aliceUserId)
    bobPlayerId = await playerIdFor(bobUserId)

    // Minutes must be backed by an active pass, or expire_play_credits() — which
    // is global and may run from another test file — will correctly write them off.
    const { data: pass } = await admin
      .from('play_sessions')
      .insert({
        player_id: alicePlayerId,
        reference_code: `OP-RLS${String(stamp).slice(-5)}`,
        status: 'active',
        hours_purchased: 1,
        minutes_total: 60,
        amount_cents: 20000,
        activated_at: new Date().toISOString(),
        valid_until: new Date(Date.now() + 6 * 60 * 60_000).toISOString(),
      })
      .select('id')
      .single()

    await admin.from('play_credit_ledger').insert({
      player_id: alicePlayerId,
      play_session_id: pass!.id,
      minutes_delta: 60,
      reason: 'purchase',
    })
  })

  afterAll(async () => {
    await admin.auth.admin.deleteUser(aliceUserId)
    await admin.auth.admin.deleteUser(bobUserId)
  })

  // The trigger chain auth.users → profiles → players → player_credits.
  it('provisions a player and a zeroed balance for every new account', async () => {
    const { data: credits } = await admin
      .from('player_credits')
      .select('minutes_remaining')
      .eq('player_id', bobPlayerId)
      .single()

    expect(credits!.minutes_remaining).toBe(0)

    const { data: player } = await admin
      .from('players')
      .select('display_name')
      .eq('id', bobPlayerId)
      .single()
    expect(player!.display_name).toBe('Bob Backhand')
  })

  it('gives each account exactly one player row', async () => {
    const { error } = await admin
      .from('players')
      .insert({ profile_id: aliceUserId, display_name: 'Alice Clone' })

    expect(error?.code).toBe('23505')
  })

  it('hides balances, ledgers, and passes from anonymous callers', async () => {
    const anon = createClient(url!, publishableKey!)

    const credits = await anon.from('player_credits').select('minutes_remaining')
    expect(credits.error).not.toBeNull()
    expect(credits.error!.message).toMatch(/permission denied/i)

    const ledger = await anon.from('play_credit_ledger').select('id')
    expect(ledger.error).not.toBeNull()

    const sessions = await anon.from('play_sessions').select('id')
    expect(sessions.error).not.toBeNull()

    const follows = await anon.from('follows').select('follower_id')
    expect(follows.error).not.toBeNull()

    const invites = await anon.from('match_invites').select('id')
    expect(invites.error).not.toBeNull()
  })

  it('lets a player read their own balance', async () => {
    const client = await signIn(alice)

    const { data, error } = await client
      .from('player_credits')
      .select('player_id, minutes_remaining')

    expect(error).toBeNull()
    expect(data).toEqual([{ player_id: alicePlayerId, minutes_remaining: 60 }])
  })

  // The important one: RLS filters, it does not error — so assert on the rows.
  it('never leaks another player’s balance', async () => {
    const client = await signIn(bob)

    const { data, error } = await client
      .from('player_credits')
      .select('player_id, minutes_remaining')
      .eq('player_id', alicePlayerId)

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('never leaks another player’s credit ledger', async () => {
    const client = await signIn(bob)

    const { data, error } = await client.from('play_credit_ledger').select('id, player_id')
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('forbids a player from crediting themselves', async () => {
    const client = await signIn(bob)

    const { error } = await client
      .from('play_credit_ledger')
      .insert({ player_id: bobPlayerId, minutes_delta: 600, reason: 'purchase' })

    expect(error).not.toBeNull()

    const { data: credits } = await admin
      .from('player_credits')
      .select('minutes_remaining')
      .eq('player_id', bobPlayerId)
      .single()
    expect(credits!.minutes_remaining).toBe(0)
  })

  it('forbids a player from topping up their own balance directly', async () => {
    const client = await signIn(bob)

    const { error } = await client
      .from('player_credits')
      .update({ minutes_remaining: 9999 })
      .eq('player_id', bobPlayerId)

    expect(error).not.toBeNull()
  })

  it('forbids a player from activating their own unpaid pass', async () => {
    const client = await signIn(bob)

    const { error } = await client.from('play_sessions').insert({
      player_id: bobPlayerId,
      reference_code: `OP-SELF${String(stamp).slice(-4)}`,
      status: 'active',
      hours_purchased: 8,
      minutes_total: 480,
      amount_cents: 0,
    })

    expect(error).not.toBeNull()
  })

  it('lets a player follow as themselves but not as somebody else', async () => {
    const client = await signIn(alice)

    const asSelf = await client
      .from('follows')
      .insert({ follower_id: alicePlayerId, followee_id: bobPlayerId })
    expect(asSelf.error).toBeNull()

    // S12: WITH CHECK pins follower_id to the caller's own player row.
    const impersonating = await client
      .from('follows')
      .insert({ follower_id: bobPlayerId, followee_id: alicePlayerId })
    expect(impersonating.error).not.toBeNull()
  })

  it('shows a follow edge to both endpoints and nobody else', async () => {
    const bobClient = await signIn(bob)
    const { data: bobSees } = await bobClient.from('follows').select('follower_id, followee_id')

    expect(bobSees).toEqual([{ follower_id: alicePlayerId, followee_id: bobPlayerId }])
  })

  it('forbids a player from deleting somebody else’s follow', async () => {
    const bobClient = await signIn(bob)

    const { data } = await bobClient
      .from('follows')
      .delete()
      .eq('follower_id', alicePlayerId)
      .eq('followee_id', bobPlayerId)
      .select('follower_id')

    // The DELETE policy is scoped to follower_id = me, so it matches no rows.
    expect(data).toEqual([])
  })

  it('lets a player rename themselves but not reassign their account', async () => {
    const client = await signIn(alice)

    const rename = await client
      .from('players')
      .update({ display_name: 'Alice Renamed' })
      .eq('id', alicePlayerId)
      .select('display_name')
    expect(rename.error).toBeNull()
    expect(rename.data).toEqual([{ display_name: 'Alice Renamed' }])

    // profile_id has no column-level UPDATE grant.
    const hijack = await client
      .from('players')
      .update({ profile_id: bobUserId })
      .eq('id', alicePlayerId)
    expect(hijack.error).not.toBeNull()
  })

  it('forbids a player from renaming another player', async () => {
    const client = await signIn(bob)

    const { data } = await client
      .from('players')
      .update({ display_name: 'Hacked' })
      .eq('id', alicePlayerId)
      .select('display_name')

    expect(data).toEqual([])
  })
})
