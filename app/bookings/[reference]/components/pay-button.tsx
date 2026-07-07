'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { payWithMockProvider } from '@/services/payments'
import { ServiceError } from '@/services/http'

// Sandbox payment — replaced by a real provider checkout in production.
export function PayButton({ referenceCode }: { referenceCode: string }) {
  const router = useRouter()
  const [paying, setPaying] = useState(false)

  async function handlePay() {
    setPaying(true)
    try {
      await payWithMockProvider(referenceCode)
      toast.success('Payment received — booking confirmed!')
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
