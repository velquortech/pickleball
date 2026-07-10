import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OpenCourtsBoard } from '@/app/play/components/open-courts-board'
import type { OpenCourt } from '@/services/matches'

const refresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}))

const createRoster = jest.fn()
const stackOntoRoster = jest.fn()
const leaveRoster = jest.fn()
jest.mock('@/services/matches', () => ({
  createRoster: (...args: unknown[]) => createRoster(...args),
  stackOntoRoster: (...args: unknown[]) => stackOntoRoster(...args),
  leaveRoster: (...args: unknown[]) => leaveRoster(...args),
}))

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const ME = 'player-me'

function court(overrides: Partial<OpenCourt> = {}): OpenCourt {
  return {
    id: 'court-1',
    name: 'Court 1',
    sortOrder: 1,
    playable: true,
    courtStatus: 'open',
    match: null,
    ...overrides,
  }
}

function formingMatch(overrides: Partial<NonNullable<OpenCourt['match']>> = {}) {
  return {
    id: 'match-1',
    status: 'forming' as const,
    capacity: 4,
    playerCount: 3,
    openSlots: 1,
    endsAt: null,
    startedAt: '2026-07-10T10:00:00Z',
    formingExpiresAt: '2026-07-10T10:10:00Z',
    players: [
      { id: 'player-1', display_name: 'Ana' },
      { id: 'player-2', display_name: 'Ben' },
      { id: 'player-3', display_name: 'Cy' },
    ],
    ...overrides,
  }
}

function renderBoard(courts: OpenCourt[], overrides: Record<string, unknown> = {}) {
  return render(
    <OpenCourtsBoard
      courts={courts}
      playerId={ME}
      liveMatchId={null}
      queueEntryId={null}
      canAfford
      {...overrides}
    />
  )
}

describe('OpenCourtsBoard', () => {
  beforeEach(() => jest.clearAllMocks())

  it('offers doubles and singles on a free court', async () => {
    createRoster.mockResolvedValue({ matchId: 'm1' })
    renderBoard([court()])

    expect(screen.getByText(/ready for play/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /claim · doubles/i }))

    expect(createRoster).toHaveBeenCalledWith('court-1', 4)
    await waitFor(() => expect(refresh).toHaveBeenCalled())
  })

  it('claims a singles court with capacity 2', async () => {
    createRoster.mockResolvedValue({ matchId: 'm1' })
    renderBoard([court()])

    await userEvent.click(screen.getByRole('button', { name: /singles/i }))
    expect(createRoster).toHaveBeenCalledWith('court-1', 2)
  })

  // The headline: a court that is a player short advertises the open seat.
  it('shows how many players a forming court still needs and stacks you in', async () => {
    stackOntoRoster.mockResolvedValue({ matchId: 'match-1', started: true })
    renderBoard([court({ match: formingMatch() })])

    expect(screen.getByText(/waiting for 1 more player$/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /stack in/i }))

    expect(stackOntoRoster).toHaveBeenCalledWith('match-1')
  })

  it('pluralizes the seats still needed', () => {
    renderBoard([court({ match: formingMatch({ playerCount: 2, openSlots: 2 }) })])
    expect(screen.getByText(/waiting for 2 more players/i)).toBeInTheDocument()
  })

  it('lets you leave a forming court you are already on', async () => {
    leaveRoster.mockResolvedValue({ matchId: 'match-1', rosterEmpty: false })
    const match = formingMatch({
      players: [{ id: ME, display_name: 'Me' }],
      playerCount: 1,
      openSlots: 3,
    })
    renderBoard([court({ match })])

    expect(screen.getByText('you')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /leave court/i }))
    expect(leaveRoster).toHaveBeenCalledWith('match-1')
  })

  // P8: pay first. The paywall is visible, not just enforced by the API.
  it('blocks stacking without playing time and says why', () => {
    renderBoard([court({ match: formingMatch() })], { canAfford: false })

    const button = screen.getByRole('button', { name: /buy time to stack/i })
    expect(button).toBeDisabled()
  })

  it('blocks claiming a court while already on a live court', () => {
    renderBoard([court()], { liveMatchId: 'match-9' })

    expect(screen.getByRole('button', { name: /claim · doubles/i })).toBeDisabled()
    expect(screen.getByText(/already on a court/i)).toBeInTheDocument()
  })

  it('blocks claiming a court while waiting in the queue', () => {
    renderBoard([court()], { queueEntryId: 'entry-9' })

    expect(screen.getByRole('button', { name: /singles/i })).toBeDisabled()
    expect(screen.getByText(/waiting in the queue/i)).toBeInTheDocument()
  })

  it('shows an active court as in play with no join button', () => {
    const match = formingMatch({
      status: 'active',
      playerCount: 4,
      openSlots: 0,
      endsAt: '2026-07-10T10:20:00Z',
      players: [
        { id: 'player-1', display_name: 'Ana' },
        { id: 'player-2', display_name: 'Ben' },
        { id: 'player-3', display_name: 'Cy' },
        { id: 'player-4', display_name: 'Dee' },
      ],
    })
    renderBoard([court({ match })])

    expect(screen.getByText(/in play/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /stack in/i })).not.toBeInTheDocument()
  })

  it('renders an unplayable court as unavailable', () => {
    renderBoard([court({ playable: false, courtStatus: 'maintenance' })])

    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
