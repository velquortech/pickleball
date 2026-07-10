import Link from 'next/link'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SiteHeader } from '@/components/site/header'
import { SiteFooter } from '@/components/site/footer'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/helpers/format'
import { getRates } from '@/app/helpers/get-rates'
import { getMe } from '@/app/api/players/controller'
import { minutesForHours, priceForHours } from '@/app/api/_lib/play-credits'
import { BuyButton } from './components/buy-button'
import { HOUR_CHOICES, buyUrl, parseHours } from './helpers/hours'

export const dynamic = 'force-dynamic'

export default async function BuyPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const hours = parseHours((await searchParams).hours)

  const [me, rates] = await Promise.all([getMe(), getRates()])
  const openPlay = rates.find((rate) => rate.rate_type === 'open_play')

  // Price is authoritative on the server; this is only the preview of it.
  const hourlyCents = openPlay?.price_cents ?? 0
  const currency = openPlay?.currency ?? 'PHP'
  const totalCents = priceForHours(hourlyCents, hours)
  const minutes = minutesForHours(hours)
  const matches = Math.floor(minutes / me.credits.matchDurationMinutes)

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-black uppercase tracking-tight sm:text-4xl">
            Buy playing time
          </h1>
          <p className="text-muted-foreground">
            Pay for the hours you want, then queue, stack onto a court, and invite
            your friends. Minutes are spent one match at a time.
          </p>
        </div>

        {me.pendingPass ? (
          <Alert className="mb-6">
            <AlertTitle>You already have a pass waiting to be paid</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-3">
              <span>
                Finish or cancel your {me.pendingPass.hoursPurchased}-hour pass
                (<span className="font-mono">{me.pendingPass.referenceCode}</span>) before
                buying another.
              </span>
              <Button
                size="sm"
                render={<Link href={`/play/pass/${me.pendingPass.referenceCode}`}>Go to payment</Link>}
              />
            </AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg font-bold uppercase tracking-tight">
              How many hours?
            </CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col gap-6">
            <div className="grid grid-cols-4 gap-2">
              {HOUR_CHOICES.map((choice) => (
                <Link
                  key={choice}
                  href={buyUrl(choice)}
                  replace
                  scroll={false}
                  aria-current={choice === hours ? 'true' : undefined}
                  className={cn(
                    'flex flex-col items-center gap-0.5 rounded-lg border-2 px-2 py-3 transition-colors',
                    choice === hours
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                  )}
                >
                  <span className="font-mono text-2xl font-bold tabular-nums">{choice}</span>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.08em]">
                    {choice === 1 ? 'hour' : 'hours'}
                  </span>
                </Link>
              ))}
            </div>

            <dl className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Playing time</dt>
                <dd className="font-mono font-bold tabular-nums">{minutes} min</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  Matches at {me.credits.matchDurationMinutes} min each
                </dt>
                <dd className="font-mono font-bold tabular-nums">{matches}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <dt className="font-medium">Total</dt>
                <dd className="font-mono text-lg font-bold tabular-nums text-primary">
                  {formatCurrency(totalCents, currency)}
                </dd>
              </div>
            </dl>

            {me.pendingPass ? (
              <Button size="lg" className="w-full" disabled>
                Finish your pending pass first
              </Button>
            ) : (
              <BuyButton hours={hours} />
            )}

            <p className="text-center text-xs text-muted-foreground">
              Minutes expire when the facility closes for the day.
            </p>
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
