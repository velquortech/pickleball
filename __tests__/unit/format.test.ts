import {
  formatCurrency,
  formatDate,
  formatTime,
  minutesLeft,
  todayISODate,
} from '@/helpers/format'

describe('formatCurrency', () => {
  it('formats centavos as whole pesos', () => {
    expect(formatCurrency(20000)).toBe('₱200')
    expect(formatCurrency(120000)).toBe('₱1,200')
  })

  it('respects an explicit currency', () => {
    expect(formatCurrency(5000, 'USD')).toContain('50')
  })
})

describe('formatTime / formatDate (Asia/Manila default)', () => {
  // 2026-07-08T00:00:00Z == 8:00 AM July 8 in Manila
  const iso = '2026-07-08T00:00:00.000Z'

  it('renders the Manila wall-clock time', () => {
    expect(formatTime(iso)).toMatch(/8:00\sAM/)
  })

  it('renders the Manila calendar date', () => {
    const formatted = formatDate(iso)
    expect(formatted).toContain('Jul')
    expect(formatted).toContain('8')
    expect(formatted).toContain('2026')
  })
})

describe('todayISODate', () => {
  it('returns YYYY-MM-DD regardless of host timezone', () => {
    expect(todayISODate()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('minutesLeft', () => {
  const now = new Date('2026-07-08T00:00:00Z')

  it('rounds up partial minutes', () => {
    expect(minutesLeft('2026-07-08T00:19:30Z', now)).toBe(20)
  })

  it('is negative once the deadline passed', () => {
    expect(minutesLeft('2026-07-07T23:58:00Z', now)).toBeLessThan(0)
  })
})
