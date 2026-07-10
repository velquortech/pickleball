// Prepaid playing-time rules. Pure — no I/O, no clock of its own.
//
// A player buys whole hours; each hour is 60 spendable minutes. A match costs
// `match_duration_minutes` from the balance. Minutes die when the facility
// closes, so a pass bought at 21:00 does not silently carry into next week.

export const MINUTES_PER_HOUR = 60
export const MIN_PURCHASE_HOURS = 1
export const MAX_PURCHASE_HOURS = 8

export function minutesForHours(hours: number): number {
  return hours * MINUTES_PER_HOUR
}

// Price is always derived here from the server-side rate (L2) — the client
// never sends an amount.
export function priceForHours(hourlyRateCents: number, hours: number): number {
  return hourlyRateCents * hours
}

export function canAfford(minutesRemaining: number, matchDurationMinutes: number): boolean {
  return matchDurationMinutes > 0 && minutesRemaining >= matchDurationMinutes
}

// How many more matches this balance buys — drives the "3 matches left" chip.
export function matchesAffordable(
  minutesRemaining: number,
  matchDurationMinutes: number
): number {
  if (matchDurationMinutes <= 0) return 0
  return Math.floor(Math.max(0, minutesRemaining) / matchDurationMinutes)
}

export function isPassExpired(validUntil: string | null, now = new Date()): boolean {
  if (!validUntil) return false
  return new Date(validUntil).getTime() <= now.getTime()
}

// Minutes expire at the facility's closing time. If a pass is bought after
// close (or exactly at it), it is valid until the next day's close.
export function passValidUntil(
  now: Date,
  options: { closeHour: number; timezone: string }
): string {
  const { closeHour, timezone } = options

  const dayISO = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(now)
  const offset = tzOffset(timezone, now)
  const close = new Date(`${dayISO}T${String(closeHour % 24).padStart(2, '0')}:00:00${offset}`)

  // closeHour of 24 means midnight at the end of the day.
  if (closeHour >= 24) close.setTime(close.getTime() + 24 * 60 * 60 * 1000)

  if (close.getTime() <= now.getTime()) {
    close.setTime(close.getTime() + 24 * 60 * 60 * 1000)
  }
  return close.toISOString()
}

function tzOffset(timezone: string, date: Date): string {
  const name = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'longOffset',
  })
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')?.value

  return name?.match(/GMT([+-]\d{2}:\d{2})/)?.[1] ?? '+00:00'
}
