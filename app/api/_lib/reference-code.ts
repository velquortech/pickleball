// Booking reference codes: crypto-random, unambiguous alphabet (no 0/O, 1/I/L),
// ~40 bits of entropy — not guessable or enumerable (L8).
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 8

export function generateReferenceCode(prefix = 'PB'): string {
  const bytes = new Uint8Array(CODE_LENGTH)
  crypto.getRandomValues(bytes)

  let code = ''
  for (const byte of bytes) {
    code += ALPHABET[byte % ALPHABET.length]
  }
  return `${prefix}-${code}`
}

export const REFERENCE_CODE_PATTERN = /^[A-Z]{2,4}-[A-HJ-NP-Z2-9]{8}$/
