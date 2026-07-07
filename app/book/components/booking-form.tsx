'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createBooking } from '@/services/bookings'
import { ServiceError } from '@/services/http'
import { formatDate, formatTime } from '@/helpers/format'
import type { BookSearchParams } from '../helpers/search-params'

export function BookingForm({ params }: { params: BookSearchParams }) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [hours, setHours] = useState('1')
  const [playersCount, setPlayersCount] = useState('4')

  const slotChosen = Boolean(params.courtId && params.startsAt)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!params.courtId || !params.startsAt) return

    const form = new FormData(event.currentTarget)
    setSubmitting(true)
    try {
      const booking = await createBooking({
        bookingType: params.type,
        courtId: params.courtId,
        startsAt: params.startsAt,
        hours: Number(hours),
        playersCount: Number(playersCount),
        customerName: String(form.get('customerName') ?? ''),
        customerEmail: String(form.get('customerEmail') ?? ''),
        customerPhone: String(form.get('customerPhone') ?? ''),
        notes: String(form.get('notes') ?? '') || undefined,
      })
      router.push(`/bookings/${booking.referenceCode}`)
    } catch (error) {
      toast.error(
        error instanceof ServiceError ? error.message : 'Could not create the booking'
      )
      if (error instanceof ServiceError && error.status === 409) {
        router.refresh() // slot taken — re-render availability
      }
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your details</CardTitle>
      </CardHeader>
      <CardContent>
        {slotChosen ? (
          <p className="mb-4 text-sm text-muted-foreground">
            Selected: <strong className="text-foreground">{formatDate(params.startsAt!)}</strong> at{' '}
            <strong className="text-foreground">{formatTime(params.startsAt!)}</strong>
          </p>
        ) : (
          <p className="mb-4 text-sm text-muted-foreground">
            Pick an available time slot to continue.
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="hours">Duration</Label>
              <Select value={hours} onValueChange={(value) => value && setHours(value)}>
                <SelectTrigger id="hours" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['1', '2', '3', '4'].map((value) => (
                    <SelectItem key={value} value={value}>
                      {value} hour{value === '1' ? '' : 's'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="playersCount">Players</Label>
              <Select
                value={playersCount}
                onValueChange={(value) => value && setPlayersCount(value)}
              >
                <SelectTrigger id="playersCount" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['1', '2', '3', '4'].map((value) => (
                    <SelectItem key={value} value={value}>
                      {value} player{value === '1' ? '' : 's'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="customerName">Full name</Label>
            <Input id="customerName" name="customerName" required maxLength={120} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="customerEmail">Email</Label>
              <Input id="customerEmail" name="customerEmail" type="email" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="customerPhone">Phone</Label>
              <Input id="customerPhone" name="customerPhone" type="tel" required minLength={7} maxLength={20} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" name="notes" maxLength={500} rows={3} />
          </div>

          <Button type="submit" disabled={!slotChosen || submitting} className="w-full">
            {submitting ? 'Reserving…' : 'Reserve & continue to payment'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
