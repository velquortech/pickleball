import { playerApi } from './http'
import type { PaymentStatus } from '@/config/supabase/models'
import type { PublicPlaySession } from '@/app/api/sessions/controller'

export type { PublicPlaySession }

export type PlaySessionDetail = PublicPlaySession & {
  payment: { status: PaymentStatus; paidAt: string | null } | null
}

// Buy playing time. The server prices it from the rates table — we only say how
// many hours we want.
export function purchaseHours(hours: number) {
  return playerApi.post<PublicPlaySession>('/api/sessions', { hours })
}

export function getMySessions() {
  return playerApi.get<PublicPlaySession[]>('/api/sessions')
}

export function getMySessionByReference(referenceCode: string) {
  return playerApi.get<PlaySessionDetail>(
    `/api/sessions/${encodeURIComponent(referenceCode)}`
  )
}

export function cancelPendingSession(referenceCode: string) {
  return playerApi.post<PublicPlaySession>(
    `/api/sessions/${encodeURIComponent(referenceCode)}/cancel`
  )
}
