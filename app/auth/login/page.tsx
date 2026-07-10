import Link from 'next/link'
import { PlayerLoginForm } from '../components/player-login-form'
import { safeNextPath } from '../helpers/next-path'

export default async function PlayerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const next = safeNextPath((await searchParams).next)

  return (
    <>
      <div className="mb-8 flex flex-col gap-2">
        <Link href="/" className="mb-4 flex items-baseline gap-1 lg:hidden">
          <span className="font-heading text-lg font-black tracking-tight text-primary">
            Pickleball District
          </span>
          <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
        </Link>
        <h2 className="font-heading text-2xl font-black uppercase tracking-tight">
          Player sign in
        </h2>
        <p className="text-sm text-muted-foreground">
          Sign in to buy playing time, queue up, and invite your friends.
        </p>
      </div>

      <PlayerLoginForm next={next} />

      <p className="mt-8 text-center text-xs text-muted-foreground">
        New here?{' '}
        <Link
          href={`/auth/register?next=${encodeURIComponent(next)}`}
          className="underline underline-offset-4 hover:text-foreground"
        >
          Create an account
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Staff?{' '}
        <Link href="/admin/login" className="underline underline-offset-4 hover:text-foreground">
          Front desk sign in
        </Link>
      </p>
    </>
  )
}
