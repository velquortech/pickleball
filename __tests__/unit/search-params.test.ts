import { bookUrl, parseBookSearchParams } from '@/app/book/helpers/search-params'

describe('parseBookSearchParams', () => {
  it('defaults to private rental on today', () => {
    const params = parseBookSearchParams({})

    expect(params.type).toBe('private_rental')
    expect(params.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(params.courtId).toBeUndefined()
    expect(params.startsAt).toBeUndefined()
  })

  it('accepts coaching but falls back on unknown types', () => {
    expect(parseBookSearchParams({ type: 'coaching' }).type).toBe('coaching')
    expect(parseBookSearchParams({ type: 'free_lunch' }).type).toBe('private_rental')
  })

  it('rejects malformed dates', () => {
    expect(parseBookSearchParams({ date: 'not-a-date' }).date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(parseBookSearchParams({ date: '2026-08-01' }).date).toBe('2026-08-01')
  })

  it('ignores array-valued params', () => {
    const params = parseBookSearchParams({ courtId: ['a', 'b'], startsAt: ['x'] })

    expect(params.courtId).toBeUndefined()
    expect(params.startsAt).toBeUndefined()
  })
})

describe('bookUrl', () => {
  it('round-trips through the parser', () => {
    const url = bookUrl({
      type: 'coaching',
      date: '2026-08-01',
      courtId: 'court-1',
      startsAt: '2026-08-01T02:00:00.000Z',
    })

    const search = Object.fromEntries(new URL(url, 'http://x').searchParams)
    const parsed = parseBookSearchParams(search)

    expect(url.startsWith('/book?')).toBe(true)
    expect(parsed).toEqual({
      type: 'coaching',
      date: '2026-08-01',
      courtId: 'court-1',
      startsAt: '2026-08-01T02:00:00.000Z',
    })
  })

  it('omits empty optional params', () => {
    const url = bookUrl({ type: 'private_rental', date: '2026-08-01' })

    expect(url).not.toContain('courtId')
    expect(url).not.toContain('startsAt')
  })
})
