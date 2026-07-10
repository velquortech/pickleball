// Where will the queue land, and when? Pure — this is what powers "you're up
// next on Court 3, about 14 minutes".
//
// The facility never assigns a player to a specific court up front. Instead the
// queue drains into whichever court frees up first, so the projection replays
// the matchmaker forward in time: take the court that becomes free soonest,
// seat the next FIFO group on it, then push that court's next free time out by
// one match. Repeat until nobody left can form a legal group (4 or 2, never 3).

import { playersToAllocate } from './matchmaking'

export type ProjectionCourt = { id: string; name: string }

export type LiveMatch = {
  courtId: string
  // null for a roster that is still forming — it has not started its clock yet.
  endsAt: string | null
}

export type WaitingEntry = { id: string; playerId: string }

export type ProjectedEntry = {
  queueEntryId: string
  playerId: string
  position: number
  courtId: string | null
  courtName: string | null
  estimatedStartAt: string | null
  estimatedWaitMinutes: number | null
}

export type ProjectionOptions = {
  matchDurationMinutes: number
  maxPlayersPerMatch?: number
  minPlayersPerMatch?: number
  now?: Date
}

// When does each court next become free? A forming roster has no clock yet, so
// assume it fills and plays a full match starting now — the conservative guess.
function courtFreeAt(
  court: ProjectionCourt,
  liveMatches: LiveMatch[],
  now: Date,
  matchDurationMinutes: number
): number {
  const match = liveMatches.find((m) => m.courtId === court.id)
  if (!match) return now.getTime()
  if (!match.endsAt) return now.getTime() + matchDurationMinutes * 60_000
  return Math.max(now.getTime(), new Date(match.endsAt).getTime())
}

export function nextCourtToFree(
  courts: ProjectionCourt[],
  liveMatches: LiveMatch[],
  options: ProjectionOptions
): { court: ProjectionCourt; freeAt: string } | null {
  const now = options.now ?? new Date()
  if (courts.length === 0) return null

  const ranked = courts
    .map((court, index) => ({
      court,
      index,
      freeAt: courtFreeAt(court, liveMatches, now, options.matchDurationMinutes),
    }))
    .sort((a, b) => a.freeAt - b.freeAt || a.index - b.index)

  const winner = ranked[0]
  return { court: winner.court, freeAt: new Date(winner.freeAt).toISOString() }
}

export function projectQueue(
  courts: ProjectionCourt[],
  liveMatches: LiveMatch[],
  waiting: WaitingEntry[],
  options: ProjectionOptions
): ProjectedEntry[] {
  const now = options.now ?? new Date()
  const durationMs = options.matchDurationMinutes * 60_000
  const maxPerMatch = options.maxPlayersPerMatch ?? 4
  const minPerMatch = options.minPlayersPerMatch ?? 2

  const projected: ProjectedEntry[] = waiting.map((entry, index) => ({
    queueEntryId: entry.id,
    playerId: entry.playerId,
    position: index + 1,
    courtId: null,
    courtName: null,
    estimatedStartAt: null,
    estimatedWaitMinutes: null,
  }))

  // Min-heap-ish: small N (a facility has a handful of courts), so re-sorting
  // each round is cheaper and clearer than a real heap.
  const slots = courts.map((court, index) => ({
    court,
    index,
    freeAt: courtFreeAt(court, liveMatches, now, options.matchDurationMinutes),
  }))

  let cursor = 0
  while (cursor < projected.length && slots.length > 0) {
    const groupSize = playersToAllocate(projected.length - cursor, maxPerMatch, minPerMatch)
    if (groupSize === 0) break

    slots.sort((a, b) => a.freeAt - b.freeAt || a.index - b.index)
    const slot = slots[0]

    const startAt = Math.max(slot.freeAt, now.getTime())
    for (let seat = 0; seat < groupSize; seat++) {
      const entry = projected[cursor + seat]
      entry.courtId = slot.court.id
      entry.courtName = slot.court.name
      entry.estimatedStartAt = new Date(startAt).toISOString()
      entry.estimatedWaitMinutes = Math.max(
        0,
        Math.round((startAt - now.getTime()) / 60_000)
      )
    }

    cursor += groupSize
    slot.freeAt = startAt + durationMs
  }

  return projected
}
