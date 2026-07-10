import Link from 'next/link'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/helpers/format'
import type { PlayerMe } from '@/services/players'

// A pass sits unpaid until the payment webhook settles it. Until then it buys
// nothing, so surface it loudly rather than letting the player wonder why they
// still cannot queue.
export function PendingPassBanner({ pass }: { pass: NonNullable<PlayerMe['pendingPass']> }) {
  return (
    <Alert className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <AlertTitle>Finish paying for your {pass.hoursPurchased}-hour pass</AlertTitle>
        <AlertDescription>
          {formatCurrency(pass.amountCents, pass.currency)} · reference{' '}
          <span className="font-mono">{pass.referenceCode}</span>. Your minutes are
          credited the moment payment clears.
        </AlertDescription>
      </div>
      <Button
        size="sm"
        className="shrink-0"
        render={<Link href={`/play/pass/${pass.referenceCode}`}>Pay now</Link>}
      />
    </Alert>
  )
}
