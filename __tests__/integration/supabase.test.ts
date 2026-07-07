import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

// Integration tests need the local Supabase stack running:
//   make setup-supabase   (starts the stack and writes .env)
// They are skipped automatically when the env vars are absent.
const describeWithSupabase = url && key ? describe : describe.skip

describeWithSupabase('supabase local stack', () => {
  it('responds to auth requests', async () => {
    const supabase = createClient(url!, key!)
    const { data, error } = await supabase.auth.getSession()

    expect(error).toBeNull()
    expect(data.session).toBeNull()
  })
})
