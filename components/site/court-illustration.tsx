import { cn } from '@/lib/utils'

// Top-down pickleball court, drawn to real proportions (20ft × 44ft, 7ft
// kitchen). Strokes inherit currentColor so it works on any surface.
export function CourtIllustration({
  className,
  withBall = false,
}: {
  className?: string
  withBall?: boolean
}) {
  return (
    <svg
      viewBox="0 0 220 460"
      fill="none"
      aria-hidden
      className={cn('h-auto w-full', className)}
    >
      {/* outer boundary */}
      <rect x="10" y="10" width="200" height="440" rx="2" stroke="currentColor" strokeWidth="3" />
      {/* kitchen (non-volley) lines — 7ft from the net on each side */}
      <line x1="10" y1="160" x2="210" y2="160" stroke="currentColor" strokeWidth="2" />
      <line x1="10" y1="300" x2="210" y2="300" stroke="currentColor" strokeWidth="2" />
      {/* center service lines, baseline to kitchen */}
      <line x1="110" y1="10" x2="110" y2="160" stroke="currentColor" strokeWidth="2" />
      <line x1="110" y1="300" x2="110" y2="450" stroke="currentColor" strokeWidth="2" />
      {/* net */}
      <line x1="2" y1="230" x2="218" y2="230" stroke="currentColor" strokeWidth="5" strokeDasharray="7 5" />
      {withBall && (
        <g>
          <circle cx="158" cy="106" r="13" className="fill-accent" stroke="none" />
          <circle cx="153" cy="101" r="1.8" className="fill-accent-foreground/60" stroke="none" />
          <circle cx="162" cy="104" r="1.8" className="fill-accent-foreground/60" stroke="none" />
          <circle cx="157" cy="111" r="1.8" className="fill-accent-foreground/60" stroke="none" />
        </g>
      )}
    </svg>
  )
}
