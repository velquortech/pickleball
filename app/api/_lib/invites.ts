// Invite rules. Pure — the API maps each rejection to an HTTP status and the UI
// maps it to copy, so the rule itself lives in exactly one place.
//
// Two hard product rules (P11, P8):
//   1. You can only invite someone you already follow.
//   2. Everyone pays for themselves — an invite is worthless to a friend who
//      has not bought playing time, so we refuse to send it rather than let it
//      fail on accept.

export const INVITE_TTL_MINUTES = 10

export type InviteRejection =
  | 'not_following'
  | 'self_invite'
  | 'match_not_open'
  | 'match_full'
  | 'inviter_not_on_match'
  | 'already_invited'
  | 'invitee_on_live_court'
  | 'invitee_in_queue'
  | 'invitee_has_no_credits'

export type AcceptRejection =
  | 'invite_not_pending'
  | 'invite_expired'
  | 'match_not_open'
  | 'match_full'
  | 'invitee_on_live_court'
  | 'invitee_has_no_credits'

export type InviteContext = {
  inviterId: string
  inviteeId: string
  inviterFollowsInvitee: boolean
  inviterOnMatch: boolean
  matchIsForming: boolean
  openSlots: number
  alreadyInvited: boolean
  inviteeOnLiveCourt: boolean
  inviteeInQueue: boolean
  inviteeMinutesRemaining: number
  matchDurationMinutes: number
}

export function canInvite(context: InviteContext): {
  allowed: boolean
  reason: InviteRejection | null
} {
  const reject = (reason: InviteRejection) => ({ allowed: false, reason })

  if (context.inviterId === context.inviteeId) return reject('self_invite')
  if (!context.inviterFollowsInvitee) return reject('not_following')
  if (!context.matchIsForming) return reject('match_not_open')
  if (!context.inviterOnMatch) return reject('inviter_not_on_match')
  if (context.openSlots <= 0) return reject('match_full')
  if (context.alreadyInvited) return reject('already_invited')
  if (context.inviteeOnLiveCourt) return reject('invitee_on_live_court')
  if (context.inviteeInQueue) return reject('invitee_in_queue')
  if (context.inviteeMinutesRemaining < context.matchDurationMinutes) {
    return reject('invitee_has_no_credits')
  }

  return { allowed: true, reason: null }
}

export type AcceptContext = {
  status: string
  expiresAt: string
  matchIsForming: boolean
  openSlots: number
  inviteeOnLiveCourt: boolean
  inviteeMinutesRemaining: number
  matchDurationMinutes: number
  now?: Date
}

export function canAcceptInvite(context: AcceptContext): {
  allowed: boolean
  reason: AcceptRejection | null
} {
  const reject = (reason: AcceptRejection) => ({ allowed: false, reason })
  const now = context.now ?? new Date()

  if (context.status !== 'pending') return reject('invite_not_pending')
  if (new Date(context.expiresAt).getTime() <= now.getTime()) return reject('invite_expired')
  if (!context.matchIsForming) return reject('match_not_open')
  if (context.openSlots <= 0) return reject('match_full')
  if (context.inviteeOnLiveCourt) return reject('invitee_on_live_court')
  if (context.inviteeMinutesRemaining < context.matchDurationMinutes) {
    return reject('invitee_has_no_credits')
  }

  return { allowed: true, reason: null }
}

// An invite never outlives the roster it points at.
export function inviteExpiry(
  now: Date,
  rosterExpiresAt: string | null,
  ttlMinutes = INVITE_TTL_MINUTES
): string {
  const ttl = now.getTime() + ttlMinutes * 60_000
  if (!rosterExpiresAt) return new Date(ttl).toISOString()

  const roster = new Date(rosterExpiresAt).getTime()
  return new Date(Math.min(ttl, roster)).toISOString()
}

export const INVITE_REJECTION_COPY: Record<InviteRejection, string> = {
  not_following: 'Follow this player before inviting them',
  self_invite: 'You cannot invite yourself',
  match_not_open: 'That court is no longer taking players',
  match_full: 'That court is already full',
  inviter_not_on_match: 'Join the court before inviting friends to it',
  already_invited: 'That player already has a pending invite to this court',
  invitee_on_live_court: 'That player is already on a live court',
  invitee_in_queue: 'That player is waiting in the queue',
  invitee_has_no_credits: 'That player has no playing time left to join',
}

export const ACCEPT_REJECTION_COPY: Record<AcceptRejection, string> = {
  invite_not_pending: 'That invite is no longer open',
  invite_expired: 'That invite expired',
  match_not_open: 'That court is no longer taking players',
  match_full: 'That court just filled up',
  invitee_on_live_court: 'You are already on a live court',
  invitee_has_no_credits: 'Buy playing time before accepting',
}
