import { act, render, screen } from '@testing-library/react'
import { MatchCountdown } from '@/app/live/components/match-countdown'

describe('MatchCountdown', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-07-08T00:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders the remaining time as MM:SS', () => {
    render(<MatchCountdown endsAt="2026-07-08T00:12:30Z" />)

    expect(screen.getByText('12:30')).toBeInTheDocument()
  })

  it('ticks down every second', () => {
    render(<MatchCountdown endsAt="2026-07-08T00:12:30Z" />)

    act(() => {
      jest.advanceTimersByTime(2000)
    })

    expect(screen.getByText('12:28')).toBeInTheDocument()
  })

  it("shows time's up once the match overruns", () => {
    render(<MatchCountdown endsAt="2026-07-07T23:59:00Z" />)

    expect(screen.getByText(/time's up/i)).toBeInTheDocument()
  })
})
