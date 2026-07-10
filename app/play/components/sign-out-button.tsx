'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/config/supabase/client'

export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    await createClient().auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleSignOut}>
      Sign out
    </Button>
  )
}
