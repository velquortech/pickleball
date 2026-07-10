'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ServiceError } from '@/services/http'
import { purchaseHours } from '@/services/sessions'

// Creates the pending pass, then hands off to its payment page. Minutes are
// only credited once payment settles — this button buys nothing on its own.
export function BuyButton({ hours }: { hours: number }) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  async function handleBuy() {
    setSubmitting(true)
    try {
      const pass = await purchaseHours(hours)
      router.push(`/play/pass/${pass.referenceCode}`)
    } catch (error) {
      toast.error(error instanceof ServiceError ? error.message : 'Could not start checkout')
      setSubmitting(false)
    }
  }

  return (
    <Button size="lg" className="w-full" onClick={handleBuy} disabled={submitting}>
      {submitting ? 'Starting checkout…' : `Buy ${hours} ${hours === 1 ? 'hour' : 'hours'}`}
    </Button>
  )
}
