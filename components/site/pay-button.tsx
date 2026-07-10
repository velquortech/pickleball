'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { payWithMockProvider } from '@/services/payments'
import { ServiceError } from '@/services/http'

// Sandbox payment — replaced by a real provider checkout in production. Settles
// either a court booking (PB-) or a playing-time pass (OP-); the API routes on
// the reference prefix.
export function PayButton({
  referenceCode,
  successMessage = 'Payment received — booking confirmed!',
}: {
  referenceCode: string
  successMessage?: string
}) {
  const router = useRouter()
  const [paying, setPaying] = useState(false)

  async function handlePay() {
    setPaying(true)
    try {
      await payWithMockProvider(referenceCode)
      toast.success(successMessage)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof ServiceError ? error.message : 'Payment failed')
      setPaying(false)
    }
  }

  return (
    <Button size="lg" className="w-full" onClick={handlePay} disabled={paying}>
      {paying ? 'Processing…' : 'Pay now (sandbox)'}
    </Button>
  )
}
