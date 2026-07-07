import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { SiteHeader } from '@/components/site/header'
import { SiteFooter } from '@/components/site/footer'
import { CourtGrid } from './components/court-grid'
import { QueueBoard } from './components/queue-board'
import { LiveRefresher } from './components/live-refresher'
import { getLiveData } from '@/helpers/live-data'
import { occupancyLevel, OCCUPANCY_COPY } from './helpers/occupancy'

export const dynamic = 'force-dynamic'

const LEVEL_STYLES: Record<string, string> = {
  quiet: 'bg-status-available/15 text-status-available hover:bg-status-available/15',
  steady: 'bg-status-available/15 text-status-available hover:bg-status-available/15',
  busy: 'bg-status-occupied/15 text-status-occupied hover:bg-status-occupied/15',
  packed: 'bg-destructive/15 text-destructive hover:bg-destructive/15',
}

export default async function LivePage() {
  const { courts, queue, matches, online } = await getLiveData()

  const playableCourts = courts.filter((court) => court.status === 'open')
  const waitingCount = queue.filter((entry) => entry.status === 'waiting').length
  const level = occupancyLevel(matches.length, playableCourts.length, waitingCount)

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <LiveRefresher />

        <div className="mb-8 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-4xl font-black uppercase tracking-tight">
              Live courts
            </h1>
            <Badge
              className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${LEVEL_STYLES[level]}`}
            >
              {level}
            </Badge>
          </div>
          <p className="text-muted-foreground">{OCCUPANCY_COPY[level]}</p>
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">{matches.length}</strong> of{' '}
              <strong className="text-foreground">{playableCourts.length}</strong> courts in play
            </span>
            <span>
              <strong className="text-foreground">
                {matches.reduce((total, match) => total + match.match_players.length, 0)}
              </strong>{' '}
              players on court
            </span>
            <span>
              <strong className="text-foreground">{waitingCount}</strong> in the queue
            </span>
          </div>
        </div>

        {!online && (
          <Alert className="mb-6">
            <AlertTitle>Live data unavailable</AlertTitle>
            <AlertDescription>
              We couldn&apos;t reach the facility system. Court status will appear here once
              it&apos;s back online.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <CourtGrid courts={courts} matches={matches} />
          <QueueBoard queue={queue} />
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
