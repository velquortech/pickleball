import { occupancyLevel } from '@/app/live/helpers/occupancy'

describe('occupancyLevel', () => {
  it('is quiet with empty courts', () => {
    expect(occupancyLevel(0, 6, 0)).toBe('quiet')
  })

  it('is steady at half utilization', () => {
    expect(occupancyLevel(3, 6, 0)).toBe('steady')
  })

  it('is busy when all courts are full or a real queue forms', () => {
    expect(occupancyLevel(6, 6, 0)).toBe('busy')
    expect(occupancyLevel(2, 6, 5)).toBe('busy')
  })

  it('is packed when courts are full and the queue is long', () => {
    expect(occupancyLevel(6, 6, 8)).toBe('packed')
  })

  it('handles zero courts without dividing by zero', () => {
    expect(occupancyLevel(0, 0, 10)).toBe('quiet')
  })
})
