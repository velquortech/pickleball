import { playersToAllocate, planAllocations } from '@/app/api/_lib/matchmaking'

describe('playersToAllocate', () => {
  it('prefers doubles when 4+ players are waiting', () => {
    expect(playersToAllocate(4)).toBe(4)
    expect(playersToAllocate(9)).toBe(4)
  })

  it('falls back to singles with 2 or 3 waiting — never allocates 3', () => {
    expect(playersToAllocate(3)).toBe(2)
    expect(playersToAllocate(2)).toBe(2)
  })

  it('allocates nobody when fewer than 2 are waiting', () => {
    expect(playersToAllocate(1)).toBe(0)
    expect(playersToAllocate(0)).toBe(0)
  })
})

describe('planAllocations', () => {
  const courts = [{ id: 'court-1' }, { id: 'court-2' }, { id: 'court-3' }]
  const queue = (count: number) =>
    Array.from({ length: count }, (_, index) => ({ id: `entry-${index + 1}` }))

  it('fills courts FIFO, 4 players at a time', () => {
    const plans = planAllocations(courts, queue(10))

    expect(plans).toHaveLength(3)
    expect(plans[0]).toEqual({
      courtId: 'court-1',
      queueEntryIds: ['entry-1', 'entry-2', 'entry-3', 'entry-4'],
    })
    expect(plans[1].queueEntryIds).toEqual(['entry-5', 'entry-6', 'entry-7', 'entry-8'])
    // 2 players left → singles on the third court
    expect(plans[2].queueEntryIds).toEqual(['entry-9', 'entry-10'])
  })

  it('leaves a lone player waiting instead of forming an invalid match', () => {
    const plans = planAllocations(courts, queue(5))

    expect(plans).toHaveLength(1)
    expect(plans[0].queueEntryIds).toHaveLength(4)
  })

  it('stops when there are no free courts', () => {
    expect(planAllocations([], queue(8))).toHaveLength(0)
  })

  it('respects a singles-only facility setting (max 2 per match)', () => {
    const plans = planAllocations(courts, queue(5), 2, 2)

    expect(plans).toHaveLength(2)
    expect(plans.every((plan) => plan.queueEntryIds.length === 2)).toBe(true)
  })
})
