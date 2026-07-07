import Link from 'next/link'
import { Button } from '@/components/ui/button'

const NAV_LINKS = [
  { href: '/#club', label: 'The Club' },
  { href: '/#activities', label: "What's On" },
  { href: '/#rates', label: 'Rates' },
  { href: '/#faq', label: 'FAQ' },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-baseline gap-1">
          <span className="font-heading text-xl font-black tracking-tight text-primary">
            Dink District
          </span>
          <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
        </Link>

        <nav className="hidden items-center gap-7 font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-primary">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/live"
            className="hidden items-center gap-2 rounded-full border border-border px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary sm:flex"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Live
          </Link>
          <Button render={<Link href="/book">Book a Court</Link>} />
        </div>
      </div>
    </header>
  )
}
