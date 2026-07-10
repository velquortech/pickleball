import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SiteHeader } from '@/components/site/header'
import { SiteFooter } from '@/components/site/footer'
import { PayButton } from '@/components/site/pay-button'
import { ApiError } from '@/app/api/_lib/http'
import { getMySessionByReference } from '@/app/api/sessions/controller'
import { formatCurrency, formatTime } from '@/helpers/format'
import { CancelPassButton } from './components/cancel-pass-button'

export const dynamic = 'force-dynamic'

const STATUS_COPY = {
  pending_payment: { label: 'Awaiting payment', className: 'bg-status-occupied/15 text-status-occupied' },
  active: { label: 'Paid', className: 'bg-status-available/15 text-status-available' },
  consumed: { label: 'Used up', className: 'bg-muted text-muted-foreground' },
  expired: { label: 'Expired', className: 'bg-muted text-muted-foreground' },
  cancelled: { label: 'Cancelled', className: 'bg-destructive/15 text-destructive' },
} as const

export default async function PassPage({
  params,
}: {
  params: Promise<{ reference: string }>
}) {
  const { reference } = await params

  // Ownership is enforced in the controller: someone else's reference is a 404.
  const pass = await getMySessionByReference(reference).catch((error) => {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
      notFound()
    }
    throw error
  })

  const badge = STATUS_COPY[pass.status]

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10 sm:px-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="font-heading text-lg font-bold uppercase tracking-tight">
              Playing time pass
            </CardTitle>
            <Badge className={`font-mono text-[10px] uppercase ${badge.className}`}>
              {badge.label}
            </Badge>
          </CardHeader>

          <CardContent className="flex flex-col gap-6">
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Reference</dt>
                <dd className="font-mono font-bold">{pass.referenceCode}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Hours</dt>
                <dd className="font-mono font-bold tabular-nums">{pass.hoursPurchased}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Playing time</dt>
                <dd className="font-mono font-bold tabular-nums">{pass.minutesTotal} min</dd>
              </div>
              {pass.validUntil && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Minutes expire</dt>
                  <dd className="font-mono font-bold">{formatTime(pass.validUntil)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2">
                <dt className="font-medium">Total</dt>
                <dd className="font-mono text-lg font-bold tabular-nums text-primary">
                  {formatCurrency(pass.amountCents, pass.currency)}
                </dd>
              </div>
            </dl>

            {pass.status === 'pending_payment' && (
              <div className="flex flex-col gap-3">
                <PayButton
                  referenceCode={pass.referenceCode}
                  successMessage="Payment received — your minutes are ready!"
                />
                <CancelPassButton referenceCode={pass.referenceCode} />
              </div>
            )}

            {pass.status === 'active' && (
              <>
                <Alert>
                  <AlertTitle>You&apos;re paid up</AlertTitle>
                  <AlertDescription>
                    Your minutes are live. Queue up, stack onto a court, or invite
                    the friends you follow.
                  </AlertDescription>
                </Alert>
                <Button size="lg" render={<Link href="/play">Go to the courts</Link>} />
              </>
            )}

            {(pass.status === 'expired' ||
              pass.status === 'consumed' ||
              pass.status === 'cancelled') && (
              <Button size="lg" variant="outline" render={<Link href="/play/buy">Buy more time</Link>} />
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm">
          <Link href="/play" className="underline underline-offset-4 hover:text-primary">
            Back to the courts
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  )
}
