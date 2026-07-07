import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

// Regression for the local dev seeder: the admin account must be able to sign
// in and must carry its role in app_metadata (S2) — never user_metadata.
const describeWithSupabase = url && publishableKey ? describe : describe.skip

describeWithSupabase('seeded local admin', () => {
  it('signs in with the documented dev credentials as an admin', async () => {
    const supabase = createClient(url!, publishableKey!)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@pickleball.local',
      password: 'Admin123!',
    })

    expect(error).toBeNull()
    expect(data.user?.app_metadata?.role).toBe('admin')
    expect(data.user?.user_metadata?.role).toBeUndefined()

    // Authenticated users can read their own profile through RLS.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, role')
      .eq('id', data.user!.id)
      .single()

    expect(profileError).toBeNull()
    expect(profile).toMatchObject({ email: 'admin@pickleball.local', role: 'admin' })

    await supabase.auth.signOut()
  })
})
