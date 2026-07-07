import { todayISODate } from '@/helpers/format'
import type { BookingType } from '@/config/supabase/models'

export type BookSearchParams = {
  type: BookingType
  date: string
  courtId?: string
  startsAt?: string
}

// /book state lives in the URL (SSR-first): ?type=&date=&courtId=&startsAt=
export function parseBookSearchParams(params: {
  [key: string]: string | string[] | undefined
}): BookSearchParams {
  const type = params.type === 'coaching' ? 'coaching' : 'private_rental'

  const rawDate = typeof params.date === 'string' ? params.date : ''
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : todayISODate()

  return {
    type,
    date,
    courtId: typeof params.courtId === 'string' ? params.courtId : undefined,
    startsAt: typeof params.startsAt === 'string' ? params.startsAt : undefined,
  }
}

export function bookUrl(params: BookSearchParams): string {
  const search = new URLSearchParams({ type: params.type, date: params.date })
  if (params.courtId) search.set('courtId', params.courtId)
  if (params.startsAt) search.set('startsAt', params.startsAt)
  return `/book?${search}`
}
