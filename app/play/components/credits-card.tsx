import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatTime } from '@/helpers/format'
import type { PlayerMe } from '@/services/players'

// The paywall, stated plainly: minutes left, how many matches that buys, and
// when the minutes die. Everything else on this page depends on it.
export function CreditsCard({ credits }: { credits: PlayerMe['credits'] }) {
  const broke = credits.matchesRemaining === 0

  return (
    <Card className={broke ? 'border-t-2 border-t-status-occupied' : 'border-t-2 border-t-primary glow-primary'}>
      <CardContent className="flex flex-col gap-5 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Playing time
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-4xl font-bold tabular-nums">
              {credits.minutesRemaining}
            </span>
            <span className="text-sm text-muted-foreground">minutes left</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {broke ? (
              'Buy hours to queue, stack onto a court, or invite friends.'
            ) : (
              <>
                Good for{' '}
                <strong className="text-foreground">
                  {credits.matchesRemaining} more {credits.matchesRemaining === 1 ? 'match' : 'matches'}
                </strong>{' '}
                at {credits.matchDurationMinutes} min each
                {credits.validUntil && <> · expires {formatTime(credits.validUntil)}</>}
              </>
            )}
          </p>
        </div>

        <Button
          size="lg"
          variant={broke ? 'default' : 'outline'}
          className="w-full sm:w-auto"
          render={<Link href="/play/buy">{broke ? 'Buy playing time' : 'Top up'}</Link>}
        />
      </CardContent>
    </Card>
  )
}
