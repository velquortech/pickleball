import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { LiveData } from '@/helpers/live-data'

export function QueueBoard({ queue }: Pick<LiveData, 'queue'>) {
  const waiting = queue.filter((entry) => entry.status === 'waiting')

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="font-heading text-base font-bold uppercase tracking-tight">
          Queue
        </CardTitle>
        <Badge className="bg-primary/15 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-primary hover:bg-primary/15">
          {waiting.length} waiting
        </Badge>
      </CardHeader>
      <CardContent>
        {waiting.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Queue is empty — walk in and you&apos;re straight onto a court.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {waiting.map((entry, index) => (
              <li
                key={entry.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm',
                  index === 0 && 'border-primary/50 bg-primary/10'
                )}
              >
                <span
                  className={cn(
                    'font-mono text-xs font-bold tabular-nums',
                    index === 0 ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {String(entry.position).padStart(2, '0')}
                </span>
                <span className="truncate font-medium">{entry.player.display_name}</span>
                {index === 0 && (
                  <span className="ml-auto font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-primary">
                    Next up
                  </span>
                )}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
