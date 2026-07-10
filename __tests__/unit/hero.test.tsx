import { render, screen } from '@testing-library/react'
import { Hero } from '@/app/components/hero'
import type { LiveData } from '@/helpers/live-data'

const OFFLINE: LiveData = { courts: [], queue: [], matches: [], forming: [], online: false }

function onlineData(): LiveData {
  return {
    online: true,
    forming: [],
    courts: [
      { id: 'c1', name: 'Court 1', court_type: 'open_play', status: 'open', is_active: true, sort_order: 1, created_at: '', updated_at: '' },
      { id: 'c2', name: 'Court 2', court_type: 'open_play', status: 'open', is_active: true, sort_order: 2, created_at: '', updated_at: '' },
    ],
    queue: [
      {
        id: 'q1',
        status: 'waiting',
        joined_at: '',
        called_at: null,
        position: 1,
        player: { id: 'p1', display_name: 'Ana', skill_level: null },
      },
    ],
    matches: [
      {
        id: 'm1',
        status: 'active',
        started_at: '',
        ends_at: new Date(Date.now() + 600_000).toISOString(),
        court: { id: 'c1', name: 'Court 1', court_type: 'open_play' },
        match_players: [
          { player: { id: 'p2', display_name: 'Ben' } },
          { player: { id: 'p3', display_name: 'Carlo' } },
        ],
      },
    ],
  }
}

describe('Hero live board', () => {
  it('shows live counts and the next players when online', () => {
    render(<Hero live={onlineData()} />)

    expect(screen.getByText('courts in play')).toBeInTheDocument()
    expect(screen.getByText('in queue')).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument() // up next
    expect(screen.getByRole('link', { name: /full court display/i })).toHaveAttribute(
      'href',
      '/live'
    )
  })

  it('falls back to hours copy when the facility system is offline', () => {
    render(<Hero live={OFFLINE} />)

    expect(screen.getByText(/court status appears here/i)).toBeInTheDocument()
    expect(screen.queryByText('courts in play')).not.toBeInTheDocument()
  })

  it('always renders the primary calls to action', () => {
    render(<Hero live={OFFLINE} />)

    // Base UI renders link-buttons as <a role="button">
    expect(screen.getByRole('button', { name: /book a court/i })).toHaveAttribute(
      'href',
      '/book'
    )
    expect(screen.getByRole('button', { name: /see who's playing/i })).toHaveAttribute(
      'href',
      '/live'
    )
  })
})
