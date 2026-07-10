import {
  canStack,
  isFull,
  isRosterExpired,
  isStackable,
  openSlots,
  rosterKind,
  stackableMatches,
  type RosterMatch,
  type StackContext,
} from '@/app/api/_lib/stacking'

const NOW = new Date('2026-07-10T10:00:00Z')

function roster(overrides: Partial<RosterMatch> = {}): RosterMatch {
  return {
    id: 'match-1',
    status: 'forming',
    capacity: 4,
    playerCount: 3,
    openToStacking: true,
    formingExpiresAt: '2026-07-10T10:05:00Z',
    ...overrides,
  }
}

function context(overrides: Partial<StackContext> = {}): StackContext {
  return {
    playerOnLiveCourt: false,
    playerInQueue: false,
    minutesRemaining: 60,
    matchDurationMinutes: 20,
    ...overrides,
  }
}

describe('openSlots', () => {
  it('counts the empty seats on a forming roster', () => {
    expect(openSlots(roster({ playerCount: 1 }))).toBe(3)
    expect(openSlots(roster({ playerCount: 4 }))).toBe(0)
  })

  it('reports no seats on a court that is already playing', () => {
    expect(openSlots(roster({ status: 'active', playerCount: 2, capacity: 4 }))).toBe(0)
  })

  it('never reports negative seats if a roster is somehow over capacity', () => {
    expect(openSlots(roster({ playerCount: 6 }))).toBe(0)
  })
})

describe('isFull / rosterKind', () => {
  it('is full at capacity', () => {
    expect(isFull(roster({ playerCount: 4, capacity: 4 }))).toBe(true)
    expect(isFull(roster({ playerCount: 2, capacity: 4 }))).toBe(false)
    expect(isFull(roster({ playerCount: 2, capacity: 2 }))).toBe(true)
  })

  it('names the format from the capacity — never 3', () => {
    expect(rosterKind(2)).toBe('singles')
    expect(rosterKind(4)).toBe('doubles')
  })
})

describe('isRosterExpired / isStackable', () => {
  it('expires a roster that outlived its hold', () => {
    expect(isRosterExpired(roster({ formingExpiresAt: '2026-07-10T09:59:00Z' }), NOW)).toBe(true)
    expect(isRosterExpired(roster({ formingExpiresAt: '2026-07-10T10:00:00Z' }), NOW)).toBe(true)
    expect(isRosterExpired(roster({ formingExpiresAt: null }), NOW)).toBe(false)
  })

  it('only offers seats on unexpired, open, forming rosters', () => {
    expect(isStackable(roster(), NOW)).toBe(true)
    expect(isStackable(roster({ status: 'active' }), NOW)).toBe(false)
    expect(isStackable(roster({ openToStacking: false }), NOW)).toBe(false)
    expect(isStackable(roster({ playerCount: 4 }), NOW)).toBe(false)
    expect(isStackable(roster({ formingExpiresAt: '2026-07-10T09:00:00Z' }), NOW)).toBe(false)
  })

  it('filters a board down to the courts looking for members', () => {
    const board = [
      roster({ id: 'a' }),
      roster({ id: 'b', status: 'active' }),
      roster({ id: 'c', playerCount: 4 }),
      roster({ id: 'd', playerCount: 1 }),
    ]
    expect(stackableMatches(board, NOW).map((match) => match.id)).toEqual(['a', 'd'])
  })
})

describe('canStack', () => {
  it('lets a paid, uncommitted player take an open seat', () => {
    expect(canStack(roster(), context(), NOW)).toEqual({ allowed: true, reason: null })
  })

  it('refuses a player with less than one match of playing time (pay first)', () => {
    expect(canStack(roster(), context({ minutesRemaining: 19 }), NOW)).toEqual({
      allowed: false,
      reason: 'insufficient_credits',
    })
  })

  it('accepts a player with exactly one match of playing time', () => {
    expect(canStack(roster(), context({ minutesRemaining: 20 }), NOW).allowed).toBe(true)
  })

  it('refuses a player already on a live court', () => {
    expect(canStack(roster(), context({ playerOnLiveCourt: true }), NOW).reason).toBe(
      'already_on_court'
    )
  })

  it('refuses a player already waiting in the queue', () => {
    expect(canStack(roster(), context({ playerInQueue: true }), NOW).reason).toBe(
      'already_queued'
    )
  })

  it('refuses a full court', () => {
    expect(canStack(roster({ playerCount: 4 }), context(), NOW).reason).toBe('match_full')
  })

  it('refuses a court that already started', () => {
    expect(canStack(roster({ status: 'active' }), context(), NOW).reason).toBe('match_not_open')
  })

  it('refuses an expired roster before it looks at anything else', () => {
    const expired = roster({ formingExpiresAt: '2026-07-10T09:00:00Z', playerCount: 4 })
    expect(canStack(expired, context(), NOW).reason).toBe('roster_expired')
  })

  it('refuses a roster closed to stacking', () => {
    expect(canStack(roster({ openToStacking: false }), context(), NOW).reason).toBe(
      'stacking_closed'
    )
  })
})
