import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '@/app/admin/login/components/login-form'

const push = jest.fn()
const refresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}))

const signInWithPassword = jest.fn()
const signOut = jest.fn()
jest.mock('@/config/supabase/client', () => ({
  createClient: () => ({ auth: { signInWithPassword, signOut } }),
}))

async function submit(email = 'staff@pickleball.local', password = 'Secret123!') {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/email/i), email)
  await user.type(screen.getByLabelText(/password/i), password)
  await user.click(screen.getByRole('button', { name: /sign in/i }))
}

describe('LoginForm', () => {
  beforeEach(() => jest.clearAllMocks())

  it('redirects admins to the dashboard', async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: { app_metadata: { role: 'admin' } } },
      error: null,
    })

    render(<LoginForm />)
    await submit()

    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin'))
    expect(signOut).not.toHaveBeenCalled()
  })

  it('signs non-admin accounts back out with an explanation', async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: { app_metadata: {} } },
      error: null,
    })

    render(<LoginForm />)
    await submit()

    expect(await screen.findByText(/does not have staff access/i)).toBeInTheDocument()
    expect(signOut).toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })

  it('surfaces authentication errors', async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    })

    render(<LoginForm />)
    await submit()

    expect(await screen.findByText(/invalid login credentials/i)).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })
})
