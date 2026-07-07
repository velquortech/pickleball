import { api } from './http'
import type { BookingStatus } from '@/config/supabase/models'

// Local-dev sandbox payment (mock provider only — disabled in production).
export function payWithMockProvider(referenceCode: string) {
  return api.post<{ referenceCode: string; status: BookingStatus; changed: boolean }>(
    '/api/payments/mock',
    { referenceCode }
  )
}
