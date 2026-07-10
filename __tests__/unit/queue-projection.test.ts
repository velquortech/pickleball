import { nextCourtToFree, projectQueue } from '@/app/api/_lib/queue-projection'

const NOW = new Date('2026-07-10T10:00:00Z')
const OPTIONS = { matchDurationMinutes: 20, now: NOW }

const courts = [
  { id: 'court-1', name: 'Court 1' },
  { id: 'court-2', name: 'Court 2' },
]

const waiting = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: `entry-${index + 1}`,
    playerId: `player-${index + 1}`,
  }))

const minutesFromNow = (minutes: number) =>
  new Date(NOW.getTime() + minutes * 60_000).toISOString()

describe('nextCourtToFree', () => {
  it('picks the court whose match ends soonest', () => {
    const result = nextCourtToFree(
      courts,
      [
        { courtId: 'court-1', endsAt: minutesFromNow(12) },
        { courtId: 'court-2', endsAt: minutesFromNow(4) },
      ],
      OPTIONS
    )

    expect(result?.court.id).toBe('court-2')
    expect(result?.freeAt).toBe(minutesFromNow(4))
  })

  it('prefers a court that is already empty', () => {
    const result = nextCourtToFree(
      courts,
      [{ courtId: 'court-1', endsAt: minutesFromNow(12) }],
      OPTIONS
    )

    expect(result?.court.id).toBe('court-2')
    expect(result?.freeAt).toBe(NOW.toISOString())
  })

  it('assumes a forming roster will play a full match', () => {
    const result = nextCourtToFree(
      [courts[0]],
      [{ courtId: 'court-1', endsAt: null }],
      OPTIONS
    )

    expect(result?.freeAt).toBe(minutesFromNow(20))
  })

  it('returns null when the facility has no playable courts', () => {
    expect(nextCourtToFree([], [], OPTIONS)).toBeNull()
  })
})

describe('projectQueue', () => {
  it('seats the first four on a free court, starting immediately', () => {
    const projected = projectQueue(courts, [], waiting(4), OPTIONS)

    expect(projected).toHaveLength(4)
    for (const entry of projected) {
      expect(entry.courtId).toBe('court-1')
      expect(entry.estimatedStartAt).toBe(NOW.toISOString())
      expect(entry.estimatedWaitMinutes).toBe(0)
    }
    expect(projected.map((entry) => entry.position)).toEqual([1, 2, 3, 4])
  })

  // The headline behaviour: you queue once, and you are auto-assigned to
  // whichever court is about to end.
  it('routes the queue to the court that frees up first', () => {
    const projected = projectQueue(
      courts,
      [
        { courtId: 'court-1', endsAt: minutesFromNow(15) },
        { courtId: 'court-2', endsAt: minutesFromNow(5) },
      ],
      waiting(4),
      OPTIONS
    )

    expect(projected.every((entry) => entry.courtId === 'court-2')).toBe(true)
    expect(projected[0].estimatedStartAt).toBe(minutesFromNow(5))
    expect(projected[0].estimatedWaitMinutes).toBe(5)
  })

  it('spills the next group onto the court that frees up after that', () => {
    const projected = projectQueue(
      courts,
      [
        { courtId: 'court-1', endsAt: minutesFromNow(15) },
        { courtId: 'court-2', endsAt: minutesFromNow(5) },
      ],
      waiting(8),
      OPTIONS
    )

    expect(projected.slice(0, 4).every((entry) => entry.courtId === 'court-2')).toBe(true)
    expect(projected.slice(4).every((entry) => entry.courtId === 'court-1')).toBe(true)
    expect(projected[4].estimatedWaitMinutes).toBe(15)
  })

  it('replays the same court for a second round when it is the only one', () => {
    const projected = projectQueue([courts[0]], [], waiting(6), OPTIONS)

    expect(projected.slice(0, 4).every((entry) => entry.estimatedWaitMinutes === 0)).toBe(true)
    // The last two play singles after the first doubles match finishes.
    expect(projected[4].estimatedStartAt).toBe(minutesFromNow(20))
    expect(projected[5].estimatedWaitMinutes).toBe(20)
  })

  it('leaves a lone fifth player unprojected rather than forming a 3-player match', () => {
    const projected = projectQueue([courts[0]], [], waiting(5), OPTIONS)

    expect(projected.slice(0, 4).every((entry) => entry.courtId === 'court-1')).toBe(true)
    expect(projected[4]).toMatchObject({
      position: 5,
      courtId: null,
      courtName: null,
      estimatedStartAt: null,
      estimatedWaitMinutes: null,
    })
  })

  it('projects nobody when every court is busy and nobody is waiting', () => {
    expect(projectQueue(courts, [], [], OPTIONS)).toEqual([])
  })

  it('projects positions but no courts when the facility has none open', () => {
    const projected = projectQueue([], [], waiting(4), OPTIONS)

    expect(projected).toHaveLength(4)
    expect(projected.every((entry) => entry.courtId === null)).toBe(true)
  })

  it('never projects a start time in the past for an overrunning match', () => {
    const projected = projectQueue(
      [courts[0]],
      [{ courtId: 'court-1', endsAt: minutesFromNow(-9) }],
      waiting(4),
      OPTIONS
    )

    expect(projected[0].estimatedStartAt).toBe(NOW.toISOString())
    expect(projected[0].estimatedWaitMinutes).toBe(0)
  })

  it('honours a singles-only facility setting', () => {
    const projected = projectQueue([courts[0]], [], waiting(4), {
      ...OPTIONS,
      maxPlayersPerMatch: 2,
      minPlayersPerMatch: 2,
    })

    expect(projected[0].estimatedWaitMinutes).toBe(0)
    expect(projected[1].estimatedWaitMinutes).toBe(0)
    expect(projected[2].estimatedWaitMinutes).toBe(20)
    expect(projected[3].estimatedWaitMinutes).toBe(20)
  })
})
