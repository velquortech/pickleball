import Link from 'next/link'
import { CourtIllustration } from '@/components/site/court-illustration'
import { LoginForm } from './components/login-form'

export default function AdminLoginPage() {
  return (
    <main className="grid min-h-svh flex-1 lg:grid-cols-2">
      {/* Brand panel */}
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
            Dink District
          </span>
          <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
        </Link>

        <div className="relative flex flex-col gap-4">
          <h1 className="font-heading max-w-md text-balance text-4xl font-black uppercase leading-tight tracking-tight">
            Run the courts.
            <br />
            <span className="text-primary">Keep the queue moving.</span>
          </h1>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">
            Walk-ins, matchmaking, court status, and bookings — everything the
            front desk needs, in one place.
          </p>
        </div>

        <p className="relative font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground/70">
          Staff access only · Dink District Pickleball Club, Iloilo City
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col gap-2">
            <Link href="/" className="mb-4 flex items-baseline gap-1 lg:hidden">
              <span className="font-heading text-lg font-black tracking-tight text-primary">
                Dink District
              </span>
              <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
            </Link>
            <h2 className="font-heading text-2xl font-black uppercase tracking-tight">
              Staff sign in
            </h2>
            <p className="text-sm text-muted-foreground">
              Use your staff account to open the front desk dashboard.
            </p>
          </div>

          <LoginForm />

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Not staff?{' '}
            <Link href="/" className="underline underline-offset-4 hover:text-foreground">
              Back to the club site
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
