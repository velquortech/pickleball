import Link from 'next/link'
import { RegisterForm } from '../components/register-form'
import { safeNextPath } from '../helpers/next-path'

export default async function RegisterPage({
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
          Create your account
        </h2>
        <p className="text-sm text-muted-foreground">
          Free to join. You only pay for the hours you play.
        </p>
      </div>

      <RegisterForm next={next} />

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Already have an account?{' '}
        <Link
          href={`/auth/login?next=${encodeURIComponent(next)}`}
          className="underline underline-offset-4 hover:text-foreground"
        >
          Sign in
        </Link>
      </p>
    </>
  )
}
