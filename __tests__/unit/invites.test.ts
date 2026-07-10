import {
  INVITE_TTL_MINUTES,
  canAcceptInvite,
  canInvite,
  inviteExpiry,
  type AcceptContext,
  type InviteContext,
} from '@/app/api/_lib/invites'

const NOW = new Date('2026-07-10T10:00:00Z')

function inviteContext(overrides: Partial<InviteContext> = {}): InviteContext {
  return {
    inviterId: 'player-a',
    inviteeId: 'player-b',
    inviterFollowsInvitee: true,
    inviterOnMatch: true,
    matchIsForming: true,
    openSlots: 2,
    alreadyInvited: false,
    inviteeOnLiveCourt: false,
    inviteeInQueue: false,
    inviteeMinutesRemaining: 60,
    matchDurationMinutes: 20,
    ...overrides,
  }
}

function acceptContext(overrides: Partial<AcceptContext> = {}): AcceptContext {
  return {
    status: 'pending',
    expiresAt: '2026-07-10T10:05:00Z',
    matchIsForming: true,
    openSlots: 1,
    inviteeOnLiveCourt: false,
    inviteeMinutesRemaining: 60,
    matchDurationMinutes: 20,
    now: NOW,
    ...overrides,
  }
}

describe('canInvite', () => {
  it('allows inviting a followed friend onto your forming court', () => {
    expect(canInvite(inviteContext())).toEqual({ allowed: true, reason: null })
  })

  it('refuses to invite someone you do not follow', () => {
    expect(canInvite(inviteContext({ inviterFollowsInvitee: false })).reason).toBe(
      'not_following'
    )
  })

  it('refuses to invite yourself', () => {
    expect(canInvite(inviteContext({ inviteeId: 'player-a' })).reason).toBe('self_invite')
  })

  it('refuses when you are not standing on the court', () => {
    expect(canInvite(inviteContext({ inviterOnMatch: false })).reason).toBe(
      'inviter_not_on_match'
    )
  })

  it('refuses when the court already started', () => {
    expect(canInvite(inviteContext({ matchIsForming: false })).reason).toBe('match_not_open')
  })

  it('refuses when there is no seat left', () => {
    expect(canInvite(inviteContext({ openSlots: 0 })).reason).toBe('match_full')
  })

  it('refuses a duplicate pending invite', () => {
    expect(canInvite(inviteContext({ alreadyInvited: true })).reason).toBe('already_invited')
  })

  it('refuses when the friend is committed elsewhere', () => {
    expect(canInvite(inviteContext({ inviteeOnLiveCourt: true })).reason).toBe(
      'invitee_on_live_court'
    )
    expect(canInvite(inviteContext({ inviteeInQueue: true })).reason).toBe('invitee_in_queue')
  })

  // Each player pays for themselves: an invite a friend cannot afford is never
  // sent, rather than failing at accept time.
  it('refuses when the friend has no playing time', () => {
    expect(canInvite(inviteContext({ inviteeMinutesRemaining: 19 })).reason).toBe(
      'invitee_has_no_credits'
    )
    expect(canInvite(inviteContext({ inviteeMinutesRemaining: 20 })).allowed).toBe(true)
  })
})

describe('canAcceptInvite', () => {
  it('allows a paid invitee to take the seat', () => {
    expect(canAcceptInvite(acceptContext())).toEqual({ allowed: true, reason: null })
  })

  it('refuses an invite that is no longer pending', () => {
    expect(canAcceptInvite(acceptContext({ status: 'declined' })).reason).toBe(
      'invite_not_pending'
    )
  })

  it('refuses an expired invite, boundary inclusive', () => {
    expect(canAcceptInvite(acceptContext({ expiresAt: '2026-07-10T10:00:00Z' })).reason).toBe(
      'invite_expired'
    )
    expect(canAcceptInvite(acceptContext({ expiresAt: '2026-07-10T10:00:01Z' })).allowed).toBe(
      true
    )
  })

  it('refuses when the court filled up or started while the invite sat', () => {
    expect(canAcceptInvite(acceptContext({ openSlots: 0 })).reason).toBe('match_full')
    expect(canAcceptInvite(acceptContext({ matchIsForming: false })).reason).toBe(
      'match_not_open'
    )
  })

  it('refuses when the invitee spent their minutes elsewhere', () => {
    expect(canAcceptInvite(acceptContext({ inviteeMinutesRemaining: 0 })).reason).toBe(
      'invitee_has_no_credits'
    )
  })

  it('refuses when the invitee is already on a live court', () => {
    expect(canAcceptInvite(acceptContext({ inviteeOnLiveCourt: true })).reason).toBe(
      'invitee_on_live_court'
    )
  })
})

describe('inviteExpiry', () => {
  it('defaults to the invite TTL', () => {
    expect(inviteExpiry(NOW, null)).toBe(
      new Date(NOW.getTime() + INVITE_TTL_MINUTES * 60_000).toISOString()
    )
  })

  // An invite must never outlive the roster it points at.
  it('never outlives the roster hold', () => {
    const rosterExpiry = '2026-07-10T10:03:00Z'
    expect(inviteExpiry(NOW, rosterExpiry)).toBe(new Date(rosterExpiry).toISOString())
  })

  it('uses the TTL when the roster outlives it', () => {
    expect(inviteExpiry(NOW, '2026-07-10T11:00:00Z')).toBe(
      new Date(NOW.getTime() + INVITE_TTL_MINUTES * 60_000).toISOString()
    )
  })
})
