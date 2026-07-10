import {
  MAX_PURCHASE_HOURS,
  MIN_PURCHASE_HOURS,
} from '@/app/api/_lib/play-credits'

export const HOUR_CHOICES = [1, 2, 3, 4] as const
export const DEFAULT_HOURS = 1

// /play/buy?hours=2 — URL state so a refresh or a shared link keeps the choice.
export function parseHours(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return DEFAULT_HOURS

  const parsed = Number(raw)
  if (!Number.isInteger(parsed)) return DEFAULT_HOURS
  if (parsed < MIN_PURCHASE_HOURS || parsed > MAX_PURCHASE_HOURS) return DEFAULT_HOURS

  return parsed
}

export function buyUrl(hours: number): string {
  return `/play/buy?hours=${hours}`
}
