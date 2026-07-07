// Pure matchmaking rules — kept side-effect free so they are unit-testable.
// Pickleball is played as singles (2) or doubles (4): the allocator only ever
// returns 4, 2, or 0 players (L7 — never 3).

export type AllocationSize = 0 | 2 | 4

export function playersToAllocate(
  waitingCount: number,
  maxPerMatch = 4,
  minPerMatch = 2
): AllocationSize {
  if (waitingCount >= maxPerMatch) return maxPerMatch as AllocationSize
  if (waitingCount >= minPerMatch) return minPerMatch as AllocationSize
  return 0
}

// Given free courts and the waiting queue (FIFO), plan which players go to
// which court. Fills courts one at a time; earliest-queued players first.
export function planAllocations<C extends { id: string }, Q extends { id: string }>(
  freeCourts: C[],
  waitingQueue: Q[],
  maxPerMatch = 4,
  minPerMatch = 2
): { courtId: string; queueEntryIds: string[] }[] {
  const plans: { courtId: string; queueEntryIds: string[] }[] = []
  let cursor = 0

  for (const court of freeCourts) {
    const remaining = waitingQueue.length - cursor
    const size = playersToAllocate(remaining, maxPerMatch, minPerMatch)
    if (size === 0) break

    plans.push({
      courtId: court.id,
      queueEntryIds: waitingQueue.slice(cursor, cursor + size).map((q) => q.id),
    })
    cursor += size
  }

  return plans
}
