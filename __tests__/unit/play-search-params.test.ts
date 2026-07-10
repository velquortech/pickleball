import { DEFAULT_NEXT_PATH, safeNextPath } from '@/app/auth/helpers/next-path'
import { DEFAULT_HOURS, buyUrl, parseHours } from '@/app/play/buy/helpers/hours'

describe('safeNextPath', () => {
  it('keeps a same-origin path', () => {
    expect(safeNextPath('/play/buy?hours=2')).toBe('/play/buy?hours=2')
  })

  it('falls back when the param is missing', () => {
    expect(safeNextPath(undefined)).toBe(DEFAULT_NEXT_PATH)
    expect(safeNextPath('')).toBe(DEFAULT_NEXT_PATH)
  })

  it('takes the first value of a repeated param', () => {
    expect(safeNextPath(['/play', '/admin'])).toBe('/play')
  })

  // S15: an open redirect would let a phishing link bounce a signed-in player
  // off-site with their session intact.
  it('rejects absolute URLs', () => {
    expect(safeNextPath('https://evil.example/steal')).toBe(DEFAULT_NEXT_PATH)
  })

  it('rejects protocol-relative URLs', () => {
    expect(safeNextPath('//evil.example/steal')).toBe(DEFAULT_NEXT_PATH)
    expect(safeNextPath('/\\evil.example')).toBe(DEFAULT_NEXT_PATH)
  })

  it('rejects a bare path with no leading slash', () => {
    expect(safeNextPath('play')).toBe(DEFAULT_NEXT_PATH)
  })
})

describe('parseHours', () => {
  it('accepts hours within the purchasable range', () => {
    expect(parseHours('1')).toBe(1)
    expect(parseHours('8')).toBe(8)
  })

  it('falls back for out-of-range, fractional, or junk values', () => {
    expect(parseHours('0')).toBe(DEFAULT_HOURS)
    expect(parseHours('9')).toBe(DEFAULT_HOURS)
    expect(parseHours('1.5')).toBe(DEFAULT_HOURS)
    expect(parseHours('-2')).toBe(DEFAULT_HOURS)
    expect(parseHours('two')).toBe(DEFAULT_HOURS)
    expect(parseHours(undefined)).toBe(DEFAULT_HOURS)
  })

  it('round-trips through the URL builder', () => {
    const url = new URL(buyUrl(3), 'http://localhost')
    expect(parseHours(url.searchParams.get('hours') ?? undefined)).toBe(3)
  })
})
