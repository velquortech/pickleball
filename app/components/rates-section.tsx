import Link from 'next/link'
import { Clock, MapPin } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/helpers/format'
import type { getRates } from '@/app/helpers/get-rates'

const RATE_BADGES: Record<string, string> = {
  open_play: 'Most popular',
  private_rental: 'Up to 4 players',
  coaching: 'All levels',
}

export function RatesSection({ rates }: { rates: Awaited<ReturnType<typeof getRates>> }) {
  return (
    <section id="rates" className="scroll-mt-20 border-y border-border bg-muted/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6">
        <div className="mb-12 grid items-end gap-8 lg:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-3">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-primary">
              Rates
            </p>
            <h2 className="font-heading max-w-xl text-balance text-4xl font-black tracking-tight sm:text-5xl">
              Simple, honest pricing.
            </h2>
          </div>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Open daily · 8:00 AM – 10:00 PM
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Mandurriao, Iloilo City
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {rates.map((rate) => {
            const featured = rate.rate_type === 'open_play'
            return (
              <Card
                key={rate.id}
                className={cn(
                  'relative flex flex-col overflow-hidden transition-shadow hover:shadow-xl',
                  featured &&
                    'border border-primary/50 shadow-[0_0_50px_-16px] shadow-primary/40 ring-primary/40'
                )}
              >
                <CardContent className="flex flex-1 flex-col gap-5 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading text-xl font-bold">{rate.name}</h3>
                    <Badge
                      className={cn(
                        'font-mono text-[10px] font-bold uppercase tracking-[0.08em]',
                        featured && 'bg-primary text-primary-foreground hover:bg-primary'
                      )}
                      variant={featured ? undefined : 'secondary'}
                    >
                      {RATE_BADGES[rate.rate_type] ?? ''}
                    </Badge>
                  </div>

                  <p className="text-sm leading-6 text-muted-foreground">{rate.description}</p>

                  <p
                    className={cn(
                      'font-heading mt-auto text-5xl font-black tracking-tight',
                      featured && 'text-primary'
                    )}
                  >
                    {formatCurrency(rate.price_cents, rate.currency)}
                    <span className="ml-2 font-sans text-sm font-normal normal-case text-muted-foreground">
                      {rate.unit}
                    </span>
                  </p>

                  <Button
                    className="w-full"
                    variant={featured ? 'default' : 'outline'}
                    render={
                      <Link href={featured ? '/live' : '/book'}>
                        {featured ? 'Check the queue' : 'Book now'}
                      </Link>
                    }
                  />
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
