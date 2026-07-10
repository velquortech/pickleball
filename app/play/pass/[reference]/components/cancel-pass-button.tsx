'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { ServiceError } from '@/services/http'
import { cancelPendingSession } from '@/services/sessions'

export function CancelPassButton({ referenceCode }: { referenceCode: string }) {
  const router = useRouter()
  const [cancelling, setCancelling] = useState(false)

  async function handleCancel() {
    setCancelling(true)
    try {
      await cancelPendingSession(referenceCode)
      toast.success('Pass cancelled')
      router.push('/play/buy')
    } catch (error) {
      toast.error(error instanceof ServiceError ? error.message : 'Could not cancel')
      setCancelling(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" className="w-full" disabled={cancelling}>
            Cancel this pass
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this pass?</AlertDialogTitle>
          <AlertDialogDescription>
            No minutes have been credited yet, so nothing is lost. You can buy a
            different number of hours afterwards.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction onClick={handleCancel}>Cancel pass</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
