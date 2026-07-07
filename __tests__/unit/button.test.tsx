import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('renders with its label', () => {
    render(<Button>Click me</Button>)

    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('is disabled when the disabled prop is set', () => {
    render(<Button disabled>Submit</Button>)

    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled()
  })
})
