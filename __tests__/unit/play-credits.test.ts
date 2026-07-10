import {
  canAfford,
  isPassExpired,
  matchesAffordable,
  minutesForHours,
  passValidUntil,
  priceForHours,
} from '@/app/api/_lib/play-credits'

describe('minutesForHours / priceForHours', () => {
  it('converts whole hours into spendable minutes', () => {
    expect(minutesForHours(1)).toBe(60)
    expect(minutesForHours(3)).toBe(180)
  })

  it('prices hours from the server-side hourly rate', () => {
    expect(priceForHours(20000, 1)).toBe(20000)
    expect(priceForHours(20000, 3)).toBe(60000)
  })
})

describe('canAfford', () => {
  it('needs a full match worth of minutes, not a partial one', () => {
    expect(canAfford(20, 20)).toBe(true)
    expect(canAfford(19, 20)).toBe(false)
    expect(canAfford(0, 20)).toBe(false)
  })

  it('refuses to divide by a zero-length match', () => {
    expect(canAfford(100, 0)).toBe(false)
  })
})

describe('matchesAffordable', () => {
  it('floors the balance into whole matches', () => {
    expect(matchesAffordable(60, 20)).toBe(3)
    expect(matchesAffordable(59, 20)).toBe(2)
    expect(matchesAffordable(0, 20)).toBe(0)
  })

  it('never reports negative matches from a corrupted balance', () => {
    expect(matchesAffordable(-40, 20)).toBe(0)
  })

  it('returns 0 rather than Infinity when the match duration is 0', () => {
    expect(matchesAffordable(60, 0)).toBe(0)
  })
})

describe('isPassExpired', () => {
  const now = new Date('2026-07-10T10:00:00+08:00')

  it('treats a pass with no expiry as live', () => {
    expect(isPassExpired(null, now)).toBe(false)
  })

  it('expires exactly at the boundary', () => {
    expect(isPassExpired('2026-07-10T10:00:00+08:00', now)).toBe(true)
    expect(isPassExpired('2026-07-10T10:00:01+08:00', now)).toBe(false)
  })
})

describe('passValidUntil', () => {
  const options = { closeHour: 22, timezone: 'Asia/Manila' }

  it('expires minutes at closing time on the day of purchase', () => {
    const bought = new Date('2026-07-10T09:30:00+08:00')
    expect(passValidUntil(bought, options)).toBe(
      new Date('2026-07-10T22:00:00+08:00').toISOString()
    )
  })

  it('rolls to the next close when bought after hours', () => {
    const bought = new Date('2026-07-10T23:30:00+08:00')
    expect(passValidUntil(bought, options)).toBe(
      new Date('2026-07-11T22:00:00+08:00').toISOString()
    )
  })

  it('rolls forward when bought exactly at closing time', () => {
    const bought = new Date('2026-07-10T22:00:00+08:00')
    expect(passValidUntil(bought, options)).toBe(
      new Date('2026-07-11T22:00:00+08:00').toISOString()
    )
  })

  it('handles a facility that closes at midnight', () => {
    const bought = new Date('2026-07-10T21:00:00+08:00')
    expect(passValidUntil(bought, { closeHour: 24, timezone: 'Asia/Manila' })).toBe(
      new Date('2026-07-11T00:00:00+08:00').toISOString()
    )
  })
})
