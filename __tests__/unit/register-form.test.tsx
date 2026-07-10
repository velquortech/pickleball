import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegisterForm } from '@/app/auth/components/register-form'

const push = jest.fn()
const refresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}))

const signUp = jest.fn()
jest.mock('@/config/supabase/client', () => ({
  createClient: () => ({ auth: { signUp } }),
}))

async function submit({
  name = 'Rico Player',
  email = 'rico@pickleball.local',
  password = 'Secret123!',
} = {}) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/full name/i), name)
  await user.type(screen.getByLabelText(/email/i), email)
  await user.type(screen.getByLabelText(/password/i), password)
  await user.click(screen.getByRole('button', { name: /create account/i }))
}

describe('RegisterForm', () => {
  beforeEach(() => jest.clearAllMocks())

  it('sends the player to the requested page once a session exists', async () => {
    signUp.mockResolvedValue({ data: { session: { access_token: 'token' } }, error: null })

    render(<RegisterForm next="/play/buy" />)
    await submit()

    await waitFor(() => expect(push).toHaveBeenCalledWith('/play/buy'))
    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'rico@pickleball.local',
        options: { data: { full_name: 'Rico Player' } },
      })
    )
  })

  it('surfaces the sign-up error and stays put', async () => {
    signUp.mockResolvedValue({ data: {}, error: { message: 'User already registered' } })

    render(<RegisterForm next="/play" />)
    await submit()

    expect(await screen.findByText(/user already registered/i)).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  // Email confirmations are off locally, but a hosted project may require them.
  it('explains when sign-up needs email confirmation before sign-in', async () => {
    signUp.mockResolvedValue({ data: { session: null }, error: null })

    render(<RegisterForm next="/play" />)
    await submit()

    expect(await screen.findByText(/check your inbox/i)).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it('rejects a short password without calling Supabase', async () => {
    render(<RegisterForm next="/play" />)
    await submit({ password: 'short' })

    expect(
      await screen.findByText(/use at least 8 characters for your password/i)
    ).toBeInTheDocument()
    expect(signUp).not.toHaveBeenCalled()
  })
})
