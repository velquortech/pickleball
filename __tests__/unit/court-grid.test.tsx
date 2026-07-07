import { render, screen } from '@testing-library/react'
import { CourtGrid } from '@/app/live/components/court-grid'
import type { Court, CourtStatus, CourtType } from '@/config/supabase/models'

function court(
  overrides: Partial<Court> & { id: string; name: string; sort_order: number }
): Court {
  return {
    court_type: 'open_play' as CourtType,
    status: 'open' as CourtStatus,
    is_active: true,
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}

function activeMatch(courtRow: Court, players: string[]) {
  return {
    id: `match-${courtRow.id}`,
    status: 'active' as const,
    started_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    court: { id: courtRow.id, name: courtRow.name, court_type: courtRow.court_type },
    match_players: players.map((name, index) => ({
      player: { id: `${courtRow.id}-p${index}`, display_name: name },
    })),
  }
}

describe('CourtGrid', () => {
  it('marks a free open-play court as ready with its padded number', () => {
    render(
      <CourtGrid courts={[court({ id: 'c1', name: 'Court 1', sort_order: 1 })]} matches={[]} />
    )

    expect(screen.getByText(/ready for play/i)).toBeInTheDocument()
    expect(screen.getByText('01')).toBeInTheDocument()
    expect(screen.getByText('Available')).toBeInTheDocument()
  })

  it('offers Book now on a free VIP court', () => {
    render(
      <CourtGrid
        courts={[court({ id: 'v1', name: 'VIP Court 1', court_type: 'vip', sort_order: 5 })]}
        matches={[]}
      />
    )

    // Base UI renders link-buttons as <a role="button">
    expect(screen.getByRole('button', { name: /book now/i })).toHaveAttribute('href', '/book')
    expect(screen.queryByText(/ready for play/i)).not.toBeInTheDocument()
  })

  it('shows players and doubles label on an occupied court', () => {
    const c1 = court({ id: 'c1', name: 'Court 1', sort_order: 1 })
    render(
      <CourtGrid courts={[c1]} matches={[activeMatch(c1, ['Ana', 'Ben', 'Carlo', 'Dina'])]} />
    )

    expect(screen.getByText('Occupied')).toBeInTheDocument()
    expect(screen.getByText(/doubles/i)).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Dina')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /book now/i })).not.toBeInTheDocument()
  })

  it('labels a two-player match as singles', () => {
    const c1 = court({ id: 'c1', name: 'Court 1', sort_order: 1 })
    render(<CourtGrid courts={[c1]} matches={[activeMatch(c1, ['Erik', 'Fely'])]} />)

    expect(screen.getByText(/singles/i)).toBeInTheDocument()
  })

  it('shows the cleaning state for maintenance courts', () => {
    render(
      <CourtGrid
        courts={[court({ id: 'c3', name: 'Court 3', status: 'maintenance', sort_order: 3 })]}
        matches={[]}
      />
    )

    expect(screen.getByText('Maint')).toBeInTheDocument()
    expect(screen.getByText(/sweeping surface/i)).toBeInTheDocument()
    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument()
  })
})
