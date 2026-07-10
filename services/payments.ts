import { api } from './http'
import type { BookingStatus, PlaySessionStatus } from '@/config/supabase/models'

export type MockPaymentResult = {
  referenceCode: string
  // `PB-` references settle a court booking, `OP-` references a playing-time pass.
  status: BookingStatus | PlaySessionStatus
  changed: boolean
  minutesCredited?: number
}

// Local-dev sandbox payment (mock provider only — disabled in production).
// Settles either a court booking or an open-play pass, keyed off the reference.
export function payWithMockProvider(referenceCode: string) {
  return api.post<MockPaymentResult>('/api/payments/mock', { referenceCode })
}
