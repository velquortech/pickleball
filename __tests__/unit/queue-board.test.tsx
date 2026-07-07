import { render, screen } from '@testing-library/react'
import { QueueBoard } from '@/app/live/components/queue-board'

function entry(position: number, name: string) {
  return {
    id: `entry-${position}`,
    status: 'waiting' as const,
    joined_at: new Date().toISOString(),
    called_at: null,
    position,
    player: { id: `player-${position}`, display_name: name, skill_level: null },
  }
}

describe('QueueBoard', () => {
  it('shows an inviting empty state', () => {
    render(<QueueBoard queue={[]} />)

    expect(screen.getByText(/queue is empty/i)).toBeInTheDocument()
    expect(screen.getByText('0 waiting')).toBeInTheDocument()
  })

  it('lists waiting players with zero-padded positions, FIFO', () => {
    render(<QueueBoard queue={[entry(1, 'Ana'), entry(2, 'Ben'), entry(3, 'Carlo')]} />)

    expect(screen.getByText('3 waiting')).toBeInTheDocument()
    expect(screen.getByText('01')).toBeInTheDocument()
    expect(screen.getByText('03')).toBeInTheDocument()

    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Ana')
    expect(items[2]).toHaveTextContent('Carlo')
  })

  it('flags only the first player as next up', () => {
    render(<QueueBoard queue={[entry(1, 'Ana'), entry(2, 'Ben')]} />)

    expect(screen.getAllByText(/next up/i)).toHaveLength(1)
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent(/next up/i)
  })

  it('hides players who are already on court', () => {
    const playing = { ...entry(0, 'Dina'), status: 'playing' as const, position: null }
    render(<QueueBoard queue={[playing, entry(1, 'Ana')]} />)

    expect(screen.queryByText('Dina')).not.toBeInTheDocument()
    expect(screen.getByText('1 waiting')).toBeInTheDocument()
  })
})
