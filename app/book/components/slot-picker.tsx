import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatTime } from '@/helpers/format'
import { bookUrl, type BookSearchParams } from '../helpers/search-params'
import type { CourtAvailability } from '@/services/bookings'

// Server component: every slot is a Link that writes the selection into the URL.
export function SlotPicker({
  availability,
  params,
}: {
  availability: CourtAvailability[]
  params: BookSearchParams
}) {
  return (
    <div className="flex flex-col gap-4">
      {availability.map((court) => (
        <Card key={court.id}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{court.name}</CardTitle>
            <Badge variant="outline">VIP</Badge>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {court.slots.map((slot) => {
                const selected =
                  params.courtId === court.id && params.startsAt === slot.startsAt

                if (!slot.available) {
                  return (
                    <span
                      key={slot.startsAt}
                      className="cursor-not-allowed rounded-md border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground/40 line-through"
                    >
                      {formatTime(slot.startsAt)}
                    </span>
                  )
                }

                return (
                  <Link
                    key={slot.startsAt}
                    href={bookUrl({ ...params, courtId: court.id, startsAt: slot.startsAt })}
                    replace
                    scroll={false}
                    className={cn(
                      'rounded-md border px-3 py-1.5 font-mono text-xs font-bold transition-all',
                      selected
                        ? 'border-primary bg-primary text-primary-foreground glow-primary'
                        : 'border-border text-foreground/80 hover:border-primary/60 hover:text-primary'
                    )}
                  >
                    {formatTime(slot.startsAt)}
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
