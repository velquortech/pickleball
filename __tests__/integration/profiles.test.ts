import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY

// Verifies the auth → profiles trigger: any auth.users insert (self-signup or
// admin-created) must produce a profiles row automatically.
const describeWithSupabase = url && secretKey ? describe : describe.skip

describeWithSupabase('profiles trigger', () => {
  const admin = () =>
    createClient(url!, secretKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

  it('creates a profile when the admin registers a user', async () => {
    const supabase = admin()
    const email = `trigger-test-${Date.now()}@pickleball.local`

    const { data: created, error } = await supabase.auth.admin.createUser({
      email,
      password: 'Test1234!',
      email_confirm: true,
      user_metadata: { full_name: 'Trigger Test' },
    })
    expect(error).toBeNull()
    const userId = created.user!.id

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('id', userId)
        .single()

      expect(profile).toMatchObject({
        id: userId,
        email,
        full_name: 'Trigger Test',
        role: 'player',
      })
    } finally {
      await supabase.auth.admin.deleteUser(userId)
    }
  })

  it('removes the profile when the user is deleted (cascade)', async () => {
    const supabase = admin()
    const email = `trigger-cascade-${Date.now()}@pickleball.local`

    const { data: created } = await supabase.auth.admin.createUser({
      email,
      password: 'Test1234!',
      email_confirm: true,
    })
    const userId = created.user!.id
    await supabase.auth.admin.deleteUser(userId)

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    expect(profile).toBeNull()
  })
})
