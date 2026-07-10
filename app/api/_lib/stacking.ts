// "Stacking" — putting yourself onto a court that is short a player. Pure rules
// so they can be unit-tested and reused by both the API and the UI copy.
//
// Only a 'forming' roster has seats: a match flips to 'active' the instant it
// fills, and an active court is mid-game. Capacity is 2 (singles) or 4
// (doubles) — never 3 (L7).

// L18: how long a half-full roster may hold a court before it is released.
export const ROSTER_HOLD_MINUTES = 10

export type RosterMatch = {
  id: string
  status: 'forming' | 'active' | 'completed' | 'cancelled'
  capacity: number
  playerCount: number
  openToStacking: boolean
  formingExpiresAt: string | null
}

export type StackContext = {
  playerOnLiveCourt: boolean
  playerInQueue: boolean
  minutesRemaining: number
  matchDurationMinutes: number
}

export type StackRejection =
  | 'match_not_open'
  | 'match_full'
  | 'stacking_closed'
  | 'roster_expired'
  | 'already_on_court'
  | 'already_queued'
  | 'insufficient_credits'

export function openSlots(match: RosterMatch): number {
  if (match.status !== 'forming') return 0
  return Math.max(0, match.capacity - match.playerCount)
}

export function isFull(match: RosterMatch): boolean {
  return match.playerCount >= match.capacity
}

export function rosterKind(capacity: number): 'singles' | 'doubles' {
  return capacity === 2 ? 'singles' : 'doubles'
}

export function isRosterExpired(match: RosterMatch, now = new Date()): boolean {
  if (!match.formingExpiresAt) return false
  return new Date(match.formingExpiresAt).getTime() <= now.getTime()
}

// A court is "looking for members" when it is forming, unexpired, open, and
// short at least one player.
export function isStackable(match: RosterMatch, now = new Date()): boolean {
  return (
    match.status === 'forming' &&
    match.openToStacking &&
    !isRosterExpired(match, now) &&
    openSlots(match) > 0
  )
}

export function stackableMatches(matches: RosterMatch[], now = new Date()): RosterMatch[] {
  return matches.filter((match) => isStackable(match, now))
}

// The single authority on "can this player take that seat?". The API mirrors
// each rejection to an HTTP status; the DB re-checks the racy ones (L19/L20).
export function canStack(
  match: RosterMatch,
  context: StackContext,
  now = new Date()
): { allowed: boolean; reason: StackRejection | null } {
  const reject = (reason: StackRejection) => ({ allowed: false, reason })

  if (match.status !== 'forming') return reject('match_not_open')
  if (isRosterExpired(match, now)) return reject('roster_expired')
  if (!match.openToStacking) return reject('stacking_closed')
  if (isFull(match)) return reject('match_full')
  if (context.playerOnLiveCourt) return reject('already_on_court')
  if (context.playerInQueue) return reject('already_queued')

  // P8: pay first. The balance must cover a full match before a seat is held.
  if (context.minutesRemaining < context.matchDurationMinutes) {
    return reject('insufficient_credits')
  }

  return { allowed: true, reason: null }
}

export const STACK_REJECTION_COPY: Record<StackRejection, string> = {
  match_not_open: 'That court is no longer taking players',
  match_full: 'That court just filled up',
  stacking_closed: 'That group is not open to stacking',
  roster_expired: 'That group timed out and released the court',
  already_on_court: 'You are already on a live court',
  already_queued: 'Leave the queue before stacking onto a court',
  insufficient_credits: 'Buy playing time before joining a court',
}
