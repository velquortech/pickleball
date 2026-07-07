'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export function MatchCountdown({
  endsAt,
  className,
}: {
  endsAt: string
  className?: string
}) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null)

  useEffect(() => {
    const tick = () => setRemainingMs(new Date(endsAt).getTime() - Date.now())
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [endsAt])

  // Avoid hydration mismatch: render a placeholder until mounted.
  if (remainingMs === null) {
    return (
      <span className={cn('font-mono text-sm font-bold text-muted-foreground', className)}>
        --:--
      </span>
    )
  }

  if (remainingMs <= 0) {
    return (
      <span className={cn('font-mono text-sm font-bold text-status-occupied', className)}>
        Time&apos;s up
      </span>
    )
  }

  const minutes = Math.floor(remainingMs / 60000)
  const seconds = Math.floor((remainingMs % 60000) / 1000)

  return (
    <span
      className={cn(
        'font-mono text-sm font-bold tabular-nums',
        remainingMs < 3 * 60000 ? 'text-status-occupied' : 'text-foreground',
        className
      )}
    >
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  )
}
