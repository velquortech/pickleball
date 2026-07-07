import {
  generateReferenceCode,
  REFERENCE_CODE_PATTERN,
} from '@/app/api/_lib/reference-code'

describe('generateReferenceCode', () => {
  it('produces codes matching the public lookup pattern', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateReferenceCode()).toMatch(REFERENCE_CODE_PATTERN)
    }
  })

  it('never contains ambiguous characters (0, O, 1, I, L)', () => {
    for (let i = 0; i < 50; i++) {
      const [, code] = generateReferenceCode().split('-')
      expect(code).not.toMatch(/[0O1IL]/)
    }
  })

  it('generates unique codes', () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateReferenceCode()))
    expect(codes.size).toBe(200)
  })
})
