'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ServiceError } from '@/services/http'
import { cancelInvite, respondToInvite, type Invite } from '@/services/invites'

type Props = {
  received: Invite[]
  sent: Invite[]
  canAfford: boolean
}

// Accepting takes the open seat immediately, and if that fills the court the
// match starts and everyone is charged — so the button is disabled without
// playing time (each player pays for themselves).
export function InvitesInbox({ received, sent, canAfford }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)

  function run(id: string, action: () => Promise<unknown>, success: string) {
    setBusyId(id)
    action()
      .then(() => {
        toast.success(success)
        startTransition(() => router.refresh())
      })
      .catch((error) => {
        toast.error(error instanceof ServiceError ? error.message : 'Something went wrong')
      })
      .finally(() => setBusyId(null))
  }

  const pendingSent = sent.filter((invite) => invite.status === 'pending')

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="font-heading text-base font-bold uppercase tracking-tight">
          Invites
        </CardTitle>
        {received.length > 0 && (
          <Badge className="font-mono text-[10px]">{received.length} new</Badge>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {received.length === 0 && pendingSent.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No invites right now. Claim a court, then pull in the friends you follow.
          </p>
        )}

        {received.map((invite) => (
          <div key={invite.id} className="flex flex-col gap-2 border-b border-border pb-4 last:border-0 last:pb-0">
            <p className="text-sm">
              <strong>{invite.inviter?.display_name ?? 'A player'}</strong> invited you to{' '}
              <strong>{invite.match?.court?.name ?? 'a court'}</strong>
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                disabled={busyId === invite.id || pending || !canAfford}
                onClick={() =>
                  run(invite.id, () => respondToInvite(invite.id, 'accept'), 'You joined the court')
                }
              >
                {canAfford ? 'Accept' : 'Buy time'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="flex-1"
                disabled={busyId === invite.id || pending}
                onClick={() =>
                  run(invite.id, () => respondToInvite(invite.id, 'decline'), 'Invite declined')
                }
              >
                Decline
              </Button>
            </div>
          </div>
        ))}

        {pendingSent.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Waiting on
            </span>
            {pendingSent.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-sm text-muted-foreground">
                  {invite.invitee?.display_name ?? 'Player'}
                </span>
                <Button
                  size="xs"
                  variant="ghost"
                  disabled={busyId === invite.id || pending}
                  onClick={() => run(invite.id, () => cancelInvite(invite.id), 'Invite withdrawn')}
                >
                  Cancel
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
