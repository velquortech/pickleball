import { SiteHeader } from '@/components/site/header'
import { SiteFooter } from '@/components/site/footer'
import { getMe } from '@/app/api/players/controller'
import { listOpenCourts } from '@/app/api/matches/controller'
import { getQueueProjection } from '@/app/api/queue/controller'
import { listInvites } from '@/app/api/invites/controller'
import { listFollows } from '@/app/api/follows/controller'
import { CreditsCard } from './components/credits-card'
import { PendingPassBanner } from './components/pending-pass-banner'
import { OpenCourtsBoard } from './components/open-courts-board'
import { QueueCard } from './components/queue-card'
import { InvitesInbox } from './components/invites-inbox'
import { FriendsPanel } from './components/friends-panel'
import { PlayRefresher } from './components/play-refresher'
import { SignOutButton } from './components/sign-out-button'

export const dynamic = 'force-dynamic'

// SSR-first: the page reuses the API controllers directly (no HTTP round trip),
// and the client components mutate through /services then router.refresh().
export default async function PlayPage() {
  const me = await getMe()

  const [courts, projection, invites, following] = await Promise.all([
    listOpenCourts(),
    getQueueProjection(),
    listInvites(),
    listFollows({ type: 'following' }),
  ])

  const canAfford = me.credits.matchesRemaining > 0
  const myProjection =
    projection.find((entry) => entry.playerId === me.player.id) ?? null
  const waitingCount = projection.length

  // Friends can only be pulled onto a court you are standing on, that is still
  // forming, and that still has a seat.
  const myFormingCourt = courts.find(
    (court) =>
      court.match?.status === 'forming' &&
      court.match.players.some((player) => player.id === me.player.id)
  )

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <PlayRefresher />

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-3xl font-black uppercase tracking-tight sm:text-4xl">
              Play
            </h1>
            <p className="text-sm text-muted-foreground">
              Welcome back, {me.player.displayName}.
            </p>
          </div>
          <SignOutButton />
        </div>

        <div className="flex flex-col gap-6">
          {me.pendingPass && <PendingPassBanner pass={me.pendingPass} />}

          <CreditsCard credits={me.credits} />

          <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="order-2 flex flex-col gap-6 lg:order-1">
              <OpenCourtsBoard
                courts={courts}
                playerId={me.player.id}
                liveMatchId={me.liveMatchId}
                queueEntryId={me.queueEntryId}
                canAfford={canAfford}
              />
            </div>

            <div className="order-1 flex flex-col gap-6 lg:order-2">
              <QueueCard
                queueEntryId={me.queueEntryId}
                liveMatchId={me.liveMatchId}
                canAfford={canAfford}
                waitingCount={waitingCount}
                myProjection={myProjection}
              />
              <InvitesInbox
                received={invites.received}
                sent={invites.sent}
                canAfford={canAfford}
              />
              <FriendsPanel
                following={following}
                invitableMatchId={myFormingCourt?.match?.id ?? null}
                openSlots={myFormingCourt?.match?.openSlots ?? 0}
              />
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
