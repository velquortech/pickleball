'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ServiceError } from '@/services/http'
import { createRoster, leaveRoster, stackOntoRoster, type OpenCourt } from '@/services/matches'
import { MatchCountdown } from '@/components/site/match-countdown'

type Props = {
  courts: OpenCourt[]
  playerId: string
  liveMatchId: string | null
  queueEntryId: string | null
  canAfford: boolean
}

function SeatDots({ taken, capacity }: { taken: number; capacity: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`${taken} of ${capacity} players`}>
      {Array.from({ length: capacity }, (_, index) => (
        <span
          key={index}
          className={cn(
            'h-2.5 w-2.5 rounded-full',
            index < taken ? 'bg-primary' : 'border border-dashed border-muted-foreground/50'
          )}
        />
      ))}
    </div>
  )
}

// The "check available courts and stack yourself" board. Every action is
// optimistic-free: we call the API, then re-run the server render, so what you
// see is always what the database agreed to.
export function OpenCourtsBoard({
  courts,
  playerId,
  liveMatchId,
  queueEntryId,
  canAfford,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busyCourt, setBusyCourt] = useState<string | null>(null)

  function run(courtKey: string, action: () => Promise<unknown>, success: string) {
    setBusyCourt(courtKey)
    action()
      .then(() => {
        toast.success(success)
        startTransition(() => router.refresh())
      })
      .catch((error) => {
        toast.error(error instanceof ServiceError ? error.message : 'Something went wrong')
      })
      .finally(() => setBusyCourt(null))
  }

  const blocked = Boolean(liveMatchId) || Boolean(queueEntryId)

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-xl font-black uppercase tracking-tight">Open courts</h2>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Claim a court or stack onto one that&apos;s short
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {courts.map((court) => {
          const match = court.match
          const onThisCourt = match?.players.some((player) => player.id === playerId) ?? false
          const busy = busyCourt === court.id || pending

          if (!court.playable) {
            return (
              <Card key={court.id} className="border-t-2 border-t-status-cleaning stripes-cleaning">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="font-heading text-base font-bold">{court.name}</CardTitle>
                  <Badge variant="outline" className="font-mono text-[10px] uppercase">
                    {court.courtStatus}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="py-3 text-center text-sm text-muted-foreground">
                    Temporarily unavailable
                  </p>
                </CardContent>
              </Card>
            )
          }

          return (
            <Card
              key={court.id}
              className={cn(
                'border-t-2',
                !match && 'border-t-status-available',
                match?.status === 'forming' && 'border-t-primary',
                match?.status === 'active' && 'border-t-status-occupied'
              )}
            >
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="font-heading text-base font-bold">{court.name}</CardTitle>
                {match ? (
                  <SeatDots taken={match.playerCount} capacity={match.capacity} />
                ) : (
                  <Badge className="bg-status-available/15 font-mono text-[10px] uppercase text-status-available">
                    Free
                  </Badge>
                )}
              </CardHeader>

              <CardContent className="flex flex-col gap-3">
                {match ? (
                  <>
                    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-foreground/85">
                      {match.players.map((player) => (
                        <li key={player.id} className="truncate">
                          {player.display_name}
                          {player.id === playerId && (
                            <span className="ml-1 font-mono text-[10px] uppercase text-primary">
                              you
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>

                    {match.status === 'active' && match.endsAt ? (
                      <div className="flex flex-col items-center gap-1 py-1">
                        <MatchCountdown endsAt={match.endsAt} className="text-2xl" />
                        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                          In play
                        </span>
                      </div>
                    ) : (
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                        Waiting for {match.openSlots} more{' '}
                        {match.openSlots === 1 ? 'player' : 'players'}
                      </p>
                    )}

                    {match.status === 'forming' &&
                      (onThisCourt ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() =>
                            run(court.id, () => leaveRoster(match.id), 'You left the court')
                          }
                        >
                          Leave court
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={busy || blocked || !canAfford || match.openSlots === 0}
                          onClick={() =>
                            run(court.id, () => stackOntoRoster(match.id), 'You stacked in!')
                          }
                        >
                          {canAfford ? 'Stack in' : 'Buy time to stack'}
                        </Button>
                      ))}
                  </>
                ) : (
                  <>
                    <p className="py-1 text-center font-heading text-lg font-bold uppercase tracking-tight text-status-available">
                      Ready for play
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={busy || blocked || !canAfford}
                        onClick={() =>
                          run(court.id, () => createRoster(court.id, 4), 'Court claimed — invite your friends')
                        }
                      >
                        Claim · doubles
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        disabled={busy || blocked || !canAfford}
                        onClick={() =>
                          run(court.id, () => createRoster(court.id, 2), 'Court claimed — invite a friend')
                        }
                      >
                        Singles
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {blocked && (
        <p className="text-xs text-muted-foreground">
          {liveMatchId
            ? 'You are already on a court. Leave it before joining another.'
            : 'You are waiting in the queue. Leave the queue to pick a court yourself.'}
        </p>
      )}
    </section>
  )
}
