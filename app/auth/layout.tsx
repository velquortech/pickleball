import Link from 'next/link'
import { CourtIllustration } from '@/components/site/court-illustration'

// Split-screen shell shared by player sign-in and registration. Collapses to a
// single centered column on mobile, where most players will land from a phone.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-svh flex-1 lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <CourtIllustration className="pointer-events-none absolute -right-20 top-1/2 w-[24rem] -translate-y-1/2 rotate-[16deg] text-primary/[0.08]" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
        />

        <Link href="/" className="relative flex items-baseline gap-1">
          <span className="font-heading text-xl font-black tracking-tight text-primary">
            Pickleball District
          </span>
          <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
        </Link>

        <div className="relative flex flex-col gap-4">
          <h1 className="font-heading max-w-md text-balance text-4xl font-black uppercase leading-tight tracking-tight">
            Buy your hours.
            <br />
            <span className="text-primary">Then take the court.</span>
          </h1>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">
            Queue from your phone, stack onto a court that&apos;s a player short,
            and pull your friends in when a seat opens.
          </p>
        </div>

        <p className="relative font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground/70">
          Players · Pickleball Club, Iloilo City
        </p>
      </div>

      <div className="flex items-center justify-center px-6 py-12 sm:py-16">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </main>
  )
}
