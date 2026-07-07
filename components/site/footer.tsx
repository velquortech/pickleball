import Link from "next/link";
import { CourtIllustration } from "./court-illustration";

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-border bg-sidebar text-sidebar-foreground">
      <CourtIllustration className="pointer-events-none absolute -right-16 -top-24 w-72 rotate-12 text-primary/[0.06]" />
      <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div className="flex flex-col gap-3">
          <p className="flex items-baseline gap-1">
            <span className="font-heading text-xl font-black tracking-tight text-primary">
              Pickleball District
            </span>
            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
          </p>
          <p className="max-w-xs text-sm leading-6 text-muted-foreground">
            Six indoor pickleball courts in Iloilo City. Open play queues,
            private rentals, and coaching. All levels, all welcome.
          </p>
        </div>

        <div className="flex flex-col gap-3 text-sm">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Hours &amp; location
          </p>
          <p className="text-foreground/85">Open daily · 8:00 AM – 10:00 PM</p>
          <p className="text-foreground/85">
            Mandurriao, Iloilo City, Philippines
          </p>
          <a
            href="mailto:play@dinkdistrict.ph"
            className="w-fit text-foreground/85 underline-offset-4 hover:text-primary hover:underline"
          >
            play@dinkdistrict.ph
          </a>
        </div>

        <div className="flex flex-col gap-3 text-sm">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Quick links
          </p>
          <Link
            href="/live"
            className="w-fit text-foreground/85 underline-offset-4 hover:text-primary hover:underline"
          >
            Live court display
          </Link>
          <Link
            href="/book"
            className="w-fit text-foreground/85 underline-offset-4 hover:text-primary hover:underline"
          >
            Book a court
          </Link>
          <Link
            href="/admin"
            className="w-fit text-foreground/85 underline-offset-4 hover:text-primary hover:underline"
          >
            Staff sign in
          </Link>
        </div>
      </div>
      <div className="relative border-t border-border">
        <p className="mx-auto w-full max-w-6xl px-4 py-5 font-mono text-xs text-muted-foreground/70 sm:px-6">
          © {new Date().getFullYear()} Pickleball Club · Iloilo City
        </p>
      </div>
    </footer>
  );
}
