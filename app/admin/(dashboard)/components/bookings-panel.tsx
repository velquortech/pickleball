'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cancelBookingByReference } from '@/services/bookings'
import { ServiceError } from '@/services/http'
import { formatCurrency, formatDate, formatTime } from '@/helpers/format'
import type { Booking } from '@/config/supabase/models'

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  confirmed: 'default',
  pending_payment: 'secondary',
  cancelled: 'outline',
  expired: 'outline',
  completed: 'outline',
}

type AdminBooking = Booking & { courts: { name: string } | null }

export function BookingsPanel({ bookings }: { bookings: AdminBooking[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)

  async function handleCancel(booking: AdminBooking) {
    setBusyId(booking.id)
    try {
      await cancelBookingByReference(booking.reference_code)
      toast.success(`Cancelled ${booking.reference_code}`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof ServiceError ? error.message : 'Could not cancel')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Card>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Court</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No bookings yet.
                </TableCell>
              </TableRow>
            )}
            {bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell className="font-mono">{booking.reference_code}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{booking.customer_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {booking.customer_phone}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{booking.courts?.name ?? '—'}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{formatDate(booking.starts_at)}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(booking.starts_at)} – {formatTime(booking.ends_at)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{formatCurrency(booking.amount_cents, booking.currency)}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANTS[booking.status] ?? 'outline'}>
                    {booking.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {['pending_payment', 'confirmed'].includes(booking.status) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busyId === booking.id}
                      onClick={() => handleCancel(booking)}
                    >
                      Cancel
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
