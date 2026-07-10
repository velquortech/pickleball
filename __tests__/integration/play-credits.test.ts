import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY

// The credit ledger is the paywall (L15/L16/L17): balances can never go
// negative, a match charges once, and unbacked minutes are swept away.
const describeWithSupabase = url && secretKey ? describe : describe.skip

describeWithSupabase('play credits ledger', () => {
  const admin = createClient(url!, secretKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const stamp = Date.now()
  let playerId: string
  let courtId: string

  const balance = async () => {
    const { data } = await admin
      .from('player_credits')
      .select('minutes_remaining')
      .eq('player_id', playerId)
      .single()
    return data!.minutes_remaining
  }

  beforeAll(async () => {
    const player = await admin
      .from('players')
      .insert({ display_name: `Credit Tester ${stamp}` })
      .select('id')
      .single()
    playerId = player.data!.id

    const court = await admin
      .from('courts')
      .insert({ name: `Credit Court ${stamp}`, court_type: 'open_play', is_active: false })
      .select('id')
      .single()
    courtId = court.data!.id
  })

  afterAll(async () => {
    await admin.from('matches').delete().eq('court_id', courtId)
    await admin.from('play_sessions').delete().eq('player_id', playerId)
    await admin.from('players').delete().eq('id', playerId)
    await admin.from('courts').delete().eq('id', courtId)
  })

  it('opens a zeroed balance the moment a player exists', async () => {
    expect(await balance()).toBe(0)
  })

  it('refuses a debit that would overdraw the balance', async () => {
    const { error } = await admin
      .from('play_credit_ledger')
      .insert({ player_id: playerId, minutes_delta: -20, reason: 'match_debit' })

    expect(error?.code).toBe('23514')
    expect(await balance()).toBe(0)
  })

  it('credits a purchase and spends it down to exactly zero', async () => {
    const credit = await admin
      .from('play_credit_ledger')
      .insert({ player_id: playerId, minutes_delta: 60, reason: 'purchase' })
    expect(credit.error).toBeNull()
    expect(await balance()).toBe(60)

    const debit = await admin
      .from('play_credit_ledger')
      .insert({ player_id: playerId, minutes_delta: -60, reason: 'admin_adjustment' })
    expect(debit.error).toBeNull()
    expect(await balance()).toBe(0)
  })

  it('charges a player only once per match, however many times a start is retried', async () => {
    await admin
      .from('play_credit_ledger')
      .insert({ player_id: playerId, minutes_delta: 60, reason: 'purchase' })

    const match = await admin
      .from('matches')
      .insert({
        court_id: courtId,
        status: 'active',
        capacity: 2,
        ends_at: new Date(Date.now() + 20 * 60_000).toISOString(),
      })
      .select('id')
      .single()

    const first = await admin.from('play_credit_ledger').insert({
      player_id: playerId,
      match_id: match.data!.id,
      minutes_delta: -20,
      reason: 'match_debit',
    })
    expect(first.error).toBeNull()
    expect(await balance()).toBe(40)

    // L16: one_debit_per_player_per_match makes the start idempotent.
    const second = await admin.from('play_credit_ledger').insert({
      player_id: playerId,
      match_id: match.data!.id,
      minutes_delta: -20,
      reason: 'match_debit',
    })
    expect(second.error?.code).toBe('23505')
    expect(await balance()).toBe(40)

    await admin.from('matches').delete().eq('id', match.data!.id)
  })

  it('allows only one pending pass per player (L14)', async () => {
    const first = await admin.from('play_sessions').insert({
      player_id: playerId,
      reference_code: `OP-PEND${stamp}`.slice(0, 11),
      hours_purchased: 1,
      minutes_total: 60,
      amount_cents: 20000,
      expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
    })
    expect(first.error).toBeNull()

    const second = await admin.from('play_sessions').insert({
      player_id: playerId,
      reference_code: `OP-DUPE${stamp}`.slice(0, 11),
      hours_purchased: 2,
      minutes_total: 120,
      amount_cents: 40000,
    })
    expect(second.error?.code).toBe('23505')

    await admin.from('play_sessions').delete().eq('player_id', playerId)
  })

  it('sweeps unbacked minutes away when no active pass survives (L17)', async () => {
    // Balance carried over from the debit test.
    expect(await balance()).toBeGreaterThan(0)

    const { error } = await admin.rpc('expire_play_credits')
    expect(error).toBeNull()

    expect(await balance()).toBe(0)

    const { data: writeOff } = await admin
      .from('play_credit_ledger')
      .select('minutes_delta, reason')
      .eq('player_id', playerId)
      .eq('reason', 'expiry_writeoff')
      .maybeSingle()

    expect(writeOff!.minutes_delta).toBe(-40)
  })

  // Regression: a counter sale used to credit the ledger with no backing pass,
  // so the very next sweep wiped the walk-in's minutes and L22 then dropped them
  // from the queue. Every credit must be backed by an active pass.
  it('does not sweep away minutes credited by a counter sale', async () => {
    const walkIn = await admin
      .from('players')
      .insert({ display_name: `Walk-in ${stamp}` })
      .select('id')
      .single()
    const walkInId = walkIn.data!.id

    await admin.from('play_sessions').insert({
      player_id: walkInId,
      reference_code: `OP-CTR${String(stamp).slice(-5)}`,
      status: 'active',
      hours_purchased: 1,
      minutes_total: 60,
      amount_cents: 20000,
      activated_at: new Date().toISOString(),
      valid_until: new Date(Date.now() + 6 * 60 * 60_000).toISOString(),
    })
    const { data: pass } = await admin
      .from('play_sessions')
      .select('id')
      .eq('player_id', walkInId)
      .single()

    await admin.from('play_credit_ledger').insert({
      player_id: walkInId,
      play_session_id: pass!.id,
      minutes_delta: 60,
      reason: 'admin_adjustment',
    })

    await admin.rpc('expire_play_credits')

    const { data: credits } = await admin
      .from('player_credits')
      .select('minutes_remaining')
      .eq('player_id', walkInId)
      .single()
    expect(credits!.minutes_remaining).toBe(60)

    await admin.from('play_sessions').delete().eq('player_id', walkInId)
    await admin.from('players').delete().eq('id', walkInId)
  })

  it('keeps minutes alive while an unexpired active pass backs them', async () => {
    await admin.from('play_sessions').insert({
      player_id: playerId,
      reference_code: `OP-LIVE${stamp}`.slice(0, 11),
      status: 'active',
      hours_purchased: 1,
      minutes_total: 60,
      amount_cents: 20000,
      activated_at: new Date().toISOString(),
      valid_until: new Date(Date.now() + 6 * 60 * 60_000).toISOString(),
    })
    await admin
      .from('play_credit_ledger')
      .insert({ player_id: playerId, minutes_delta: 60, reason: 'purchase' })

    await admin.rpc('expire_play_credits')
    expect(await balance()).toBe(60)
  })
})

describeWithSupabase('settle_play_session', () => {
  const admin = createClient(url!, secretKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const stamp = Date.now()
  const reference = `OP-STL${String(stamp).slice(-5)}`
  let playerId: string

  beforeAll(async () => {
    const player = await admin
      .from('players')
      .insert({ display_name: `Settle Tester ${stamp}` })
      .select('id')
      .single()
    playerId = player.data!.id

    const session = await admin
      .from('play_sessions')
      .insert({
        player_id: playerId,
        reference_code: reference,
        hours_purchased: 2,
        minutes_total: 120,
        amount_cents: 40000,
        expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
      })
      .select('id')
      .single()

    await admin.from('payments').insert({
      play_session_id: session.data!.id,
      provider: 'mock',
      amount_cents: 40000,
    })
  })

  afterAll(async () => {
    await admin.from('play_sessions').delete().eq('player_id', playerId)
    await admin.from('players').delete().eq('id', playerId)
  })

  // L3: money only moves through the settle path, and only once.
  it('credits the minutes, activates the pass, and marks the payment paid', async () => {
    const validUntil = new Date(Date.now() + 8 * 60 * 60_000).toISOString()
    const { data, error } = await admin
      .rpc('settle_play_session', {
        p_reference: reference,
        p_provider_ref: 'mock_settle_1',
        p_valid_until: validUntil,
      })
      .single()

    expect(error).toBeNull()
    expect(data).toMatchObject({ status: 'active', minutes_credited: 120, changed: true })

    const { data: credits } = await admin
      .from('player_credits')
      .select('minutes_remaining')
      .eq('player_id', playerId)
      .single()
    expect(credits!.minutes_remaining).toBe(120)

    const { data: payment } = await admin
      .from('payments')
      .select('status, provider_ref')
      .eq('provider_ref', 'mock_settle_1')
      .maybeSingle()
    expect(payment!.status).toBe('paid')
  })

  it('is idempotent — a replayed webhook does not credit twice', async () => {
    const { data, error } = await admin
      .rpc('settle_play_session', {
        p_reference: reference,
        p_provider_ref: 'mock_settle_2',
        p_valid_until: new Date(Date.now() + 8 * 60 * 60_000).toISOString(),
      })
      .single()

    expect(error).toBeNull()
    expect(data).toMatchObject({ status: 'active', changed: false })

    const { data: credits } = await admin
      .from('player_credits')
      .select('minutes_remaining')
      .eq('player_id', playerId)
      .single()
    expect(credits!.minutes_remaining).toBe(120)
  })

  it('rejects an unknown reference', async () => {
    const { error } = await admin.rpc('settle_play_session', {
      p_reference: 'OP-NOPE9999',
      p_provider_ref: 'mock_settle_3',
      p_valid_until: new Date().toISOString(),
    })

    expect(error).not.toBeNull()
  })
})
