'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ServiceError } from '@/services/http'
import { joinQueue, leaveQueue, type ProjectedEntry } from '@/services/queue'

type Props = {
  queueEntryId: string | null
  liveMatchId: string | null
  canAfford: boolean
  waitingCount: number
  myProjection: ProjectedEntry | null
}

// P7: join once and the system does the rest — you are auto-assigned to
// whichever court frees up first, which is exactly what `myProjection` shows.
export function QueueCard({
  queueEntryId,
  liveMatchId,
  canAfford,
  waitingCount,
  myProjection,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)

  function run(action: () => Promise<unknown>, success: string) {
    setBusy(true)
    action()
      .then(() => {
        toast.success(success)
        startTransition(() => router.refresh())
      })
      .catch((error) => {
        toast.error(error instanceof ServiceError ? error.message : 'Something went wrong')
      })
      .finally(() => setBusy(false))
  }

  const disabled = busy || pending

  return (
    <Card className="border-t-2 border-t-primary/60">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="font-heading text-base font-bold uppercase tracking-tight">
          The queue
        </CardTitle>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {waitingCount} waiting
        </span>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {liveMatchId ? (
          <p className="text-sm text-muted-foreground">
            You&apos;re on a court right now. Queue again after your match.
          </p>
        ) : queueEntryId && myProjection ? (
          <>
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-4xl font-bold tabular-nums text-primary">
                #{myProjection.position}
              </span>
              <div className="flex flex-col">
                {myProjection.courtName ? (
                  <>
                    <span className="text-sm font-medium">
                      Next up on {myProjection.courtName}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {myProjection.estimatedWaitMinutes === 0
                        ? 'Starting now'
                        : `about ${myProjection.estimatedWaitMinutes} min`}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Waiting for enough players to form a match
                  </span>
                )}
              </div>
            </div>
            <Button variant="outline" disabled={disabled} onClick={() => run(leaveQueue, 'You left the queue')}>
              Leave queue
            </Button>
          </>
        ) : queueEntryId ? (
          <>
            <p className="text-sm text-muted-foreground">You&apos;re in the queue.</p>
            <Button variant="outline" disabled={disabled} onClick={() => run(leaveQueue, 'You left the queue')}>
              Leave queue
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Take a spot and you&apos;ll be seated automatically on the next court
              that finishes.
            </p>
            <Button
              disabled={disabled || !canAfford}
              onClick={() => run(joinQueue, "You're in the queue — watch for your court")}
            >
              {canAfford ? 'Join the queue' : 'Buy playing time to queue'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
