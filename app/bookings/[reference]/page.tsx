import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { SiteHeader } from '@/components/site/header'
import { SiteFooter } from '@/components/site/footer'
import { getBookingByReference } from '@/app/api/bookings/controller'
import { formatCurrency, formatDate, formatTime } from '@/helpers/format'
import { PayButton } from '@/components/site/pay-button'

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, { label: string; className?: string }> = {
  pending_payment: { label: 'Awaiting payment' },
  confirmed: {
    label: 'Confirmed',
    className: 'bg-status-available/15 text-status-available hover:bg-status-available/15',
  },
  cancelled: { label: 'Cancelled' },
  completed: { label: 'Completed' },
  expired: { label: 'Expired' },
}

export default async function BookingReferencePage({
  params,
}: {
  params: Promise<{ reference: string }>
}) {
  const { reference } = await params

  const booking = await getBookingByReference(decodeURIComponent(reference)).catch(
    () => null
  )
  if (!booking) notFound()

  const status = STATUS_LABELS[booking.status] ?? { label: booking.status }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-12 sm:px-6">
        <Card>
          <CardHeader className="items-center text-center">
            <Badge className={status.className} variant={status.className ? undefined : 'secondary'}>
              {status.label}
            </Badge>
            <CardTitle className="mt-3 text-lg font-normal text-muted-foreground">
              Booking reference
            </CardTitle>
            <p className="font-mono text-3xl font-bold tracking-widest text-primary">
              {booking.referenceCode}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Separator />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Booked by</dt>
              <dd className="text-right font-medium">{booking.customerName}</dd>
              <dt className="text-muted-foreground">Type</dt>
              <dd className="text-right font-medium">
                {booking.bookingType === 'coaching' ? 'Coaching session' : 'Private court'}
              </dd>
              <dt className="text-muted-foreground">Court</dt>
              <dd className="text-right font-medium">{booking.courtName ?? '—'}</dd>
              <dt className="text-muted-foreground">Date</dt>
              <dd className="text-right font-medium">{formatDate(booking.startsAt)}</dd>
              <dt className="text-muted-foreground">Time</dt>
              <dd className="text-right font-medium">
                {formatTime(booking.startsAt)} – {formatTime(booking.endsAt)}
              </dd>
              <dt className="text-muted-foreground">Players</dt>
              <dd className="text-right font-medium">{booking.playersCount}</dd>
              <dt className="text-muted-foreground">Total</dt>
              <dd className="text-right text-base font-semibold">
                {formatCurrency(booking.amountCents, booking.currency)}
              </dd>
            </dl>
            <Separator />

            {booking.status === 'pending_payment' && (
              <div className="flex flex-col gap-3">
                {booking.expiresAt && (
                  <p className="text-center text-sm text-muted-foreground">
                    Complete payment before {formatTime(booking.expiresAt)} to keep this
                    slot.
                  </p>
                )}
                <PayButton referenceCode={booking.referenceCode} />
              </div>
            )}

            {booking.status === 'confirmed' && (
              <p className="text-center text-sm text-muted-foreground">
                You&apos;re all set! Show this reference code at the front desk.
              </p>
            )}

            {(booking.status === 'expired' || booking.status === 'cancelled') && (
              <p className="text-center text-sm text-muted-foreground">
                This booking is no longer active — you can book a new slot anytime.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </>
  )
}
