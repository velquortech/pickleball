import { CalendarCheck, LayoutGrid, ListOrdered, Swords } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { listCourts } from '@/app/api/courts/controller'
import { listQueue } from '@/app/api/queue/controller'
import { listActiveMatches } from '@/app/api/matches/controller'
import { listBookings } from '@/app/api/bookings/controller'
import { parseAdminTab } from './helpers/tabs'
import { QueuePanel } from './components/queue-panel'
import { MatchesPanel } from './components/matches-panel'
import { CourtsPanel } from './components/courts-panel'
import { BookingsPanel } from './components/bookings-panel'

export const dynamic = 'force-dynamic'

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const tab = parseAdminTab((await searchParams).tab)

  const data = await Promise.all([
    listCourts(),
    listQueue(),
    listActiveMatches(),
    listBookings(),
  ]).catch(() => null)

  if (data === null) {
    return (
      <Alert>
        <AlertTitle>Facility system unreachable</AlertTitle>
        <AlertDescription>
          Could not load queue and court data. Is the Supabase stack running?
        </AlertDescription>
      </Alert>
    )
  }

  const [courts, queue, matches, bookings] = data
  const waiting = queue.filter((entry) => entry.status === 'waiting').length
  const openCourts = courts.filter((court) => court.status === 'open').length
  const confirmedBookings = bookings.filter(
    (booking) => booking.status === 'confirmed'
  ).length

  const stats = [
    {
      label: 'Waiting in queue',
      value: waiting,
      hint: waiting >= 2 ? 'Enough for a match' : 'Below match minimum',
      icon: ListOrdered,
      tone: 'bg-chart-1/12 text-chart-1',
    },
    {
      label: 'Matches in play',
      value: matches.length,
      hint: `${matches.reduce((n, m) => n + m.match_players.length, 0)} players on court`,
      icon: Swords,
      tone: 'bg-chart-3/12 text-chart-3',
    },
    {
      label: 'Courts free',
      value: `${openCourts - matches.length} of ${openCourts}`,
      hint: 'Open-play and VIP combined',
      icon: LayoutGrid,
      tone: 'bg-chart-4/12 text-chart-4',
    },
    {
      label: 'Confirmed bookings',
      value: confirmedBookings,
      hint: 'Paid and holding their slot',
      icon: CalendarCheck,
      tone: 'bg-chart-2/15 text-chart-2',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="relative overflow-hidden">
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/70 to-primary/10"
            />
            <CardContent className="flex items-center gap-4">
              <span
                className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${stat.tone}`}
              >
                <stat.icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm text-muted-foreground">{stat.label}</p>
                <p className="font-heading text-2xl font-bold leading-tight tabular-nums">
                  {stat.value}
                </p>
                <p className="truncate text-xs text-muted-foreground/80">{stat.hint}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tab === 'queue' && <QueuePanel queue={queue} />}
      {tab === 'matches' && <MatchesPanel matches={matches} />}
      {tab === 'courts' && <CourtsPanel courts={courts} />}
      {tab === 'bookings' && <BookingsPanel bookings={bookings} />}
    </div>
  )
}
