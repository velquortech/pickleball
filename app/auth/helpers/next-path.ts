// Where to send a player after they sign in. The value arrives from a URL
// search param, so it must never be able to bounce them off-site (S15) — only
// same-origin absolute paths are honoured.

export const DEFAULT_NEXT_PATH = '/play'

export function safeNextPath(
  value: string | string[] | undefined,
  fallback = DEFAULT_NEXT_PATH
): string {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return fallback

  // Must be a rooted path. `//evil.com` and `/\evil.com` are protocol-relative
  // URLs that browsers happily follow off-origin.
  if (!raw.startsWith('/')) return fallback
  if (raw.startsWith('//') || raw.startsWith('/\\')) return fallback

  return raw
}
