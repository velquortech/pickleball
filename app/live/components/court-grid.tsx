import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MatchCountdown } from './match-countdown'
import type { LiveData } from '@/helpers/live-data'

type CourtState = 'available' | 'occupied' | 'cleaning'

// Status Ring (design spec): pulsing lime = available, solid orange = occupied,
// striped blue = maintenance/cleaning.
function StatusRing({ state }: { state: CourtState }) {
  if (state === 'available') {
    return (
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-available opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-status-available" />
      </span>
    )
  }
  if (state === 'occupied') {
    return <span className="inline-flex h-2.5 w-2.5 rounded-full bg-status-occupied" />
  }
  return <span className="inline-flex h-2.5 w-2.5 rounded-full bg-status-cleaning" />
}

const STATE_BADGE: Record<CourtState, { label: string; className: string }> = {
  available: { label: 'Available', className: 'bg-status-available/15 text-status-available' },
  occupied: { label: 'Occupied', className: 'bg-status-occupied/15 text-status-occupied' },
  cleaning: { label: 'Maint', className: 'bg-status-cleaning/15 text-status-cleaning' },
}

export function CourtGrid({ courts, matches }: Pick<LiveData, 'courts' | 'matches'>) {
  const matchByCourt = new Map(matches.map((match) => [match.court.id, match]))

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courts.map((court, index) => {
        const match = matchByCourt.get(court.id)
        const underMaintenance = court.status !== 'open'
        const state: CourtState = underMaintenance
          ? 'cleaning'
          : match
            ? 'occupied'
            : 'available'
        const badge = STATE_BADGE[state]

        return (
          <Card
            key={court.id}
            className={cn(
              'relative border-t-2',
              state === 'available' && 'border-t-status-available glow-status-available',
              state === 'occupied' && 'border-t-status-occupied',
              state === 'cleaning' && 'border-t-status-cleaning stripes-cleaning'
            )}
          >
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2.5">
                <StatusRing state={state} />
                <CardTitle className="font-heading text-base font-bold">{court.name}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em]',
                    badge.className
                  )}
                >
                  {badge.label}
                </span>
                <span className="font-mono text-xs font-bold text-muted-foreground/70">
                  {String(court.sort_order || index + 1).padStart(2, '0')}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {match ? (
                <div className="flex flex-col items-center gap-3 py-2">
                  <MatchCountdown endsAt={match.ends_at} className="text-4xl" />
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Remaining · {match.match_players.length === 2 ? 'Singles' : 'Doubles'}
                  </p>
                  <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-sm text-foreground/85">
                    {match.match_players.map(({ player }) => (
                      <li key={player.id} className="truncate">
                        {player.display_name}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : underMaintenance ? (
                <div className="flex flex-col items-center gap-2 py-4">
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-status-cleaning">
                    {court.status === 'maintenance' ? 'Sweeping surface' : 'Closed'}
                  </p>
                  <p className="text-sm text-muted-foreground">Temporarily unavailable</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-3">
                  {court.court_type === 'vip' ? (
                    <Button size="sm" render={<Link href="/book">Book now</Link>} />
                  ) : (
                    <p className="font-heading text-lg font-bold uppercase tracking-tight text-status-available">
                      Ready for play
                    </p>
                  )}
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    {court.court_type === 'vip' ? 'VIP · private rental' : 'Next group from the queue'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
