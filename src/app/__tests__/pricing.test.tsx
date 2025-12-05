import { render, screen, fireEvent } from '@testing-library/react'
import PricingPage from '../(marketing)/pricing/page'

describe('PricingPage', () => {
  it('renders plan cards and toggles yearly pricing', () => {
    render(<PricingPage />)
    expect(screen.getByText(/Pricing/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Pro/i })).toBeInTheDocument()
    const toggle = screen.getByLabelText('Toggle yearly pricing')
    fireEvent.click(toggle)
    expect(screen.getAllByText(/\/ yr/).length).toBeGreaterThan(0)
  })
  it('updates estimate when inputs change', () => {
    render(<PricingPage />)
    const workspaces = screen.getByLabelText('Workspaces') as HTMLInputElement
    const seats = screen.getByLabelText('Seats') as HTMLInputElement
    fireEvent.change(workspaces, { target: { value: '2' } })
    fireEvent.change(seats, { target: { value: '5' } })
    expect(screen.getByText(/Estimated/)).toBeInTheDocument()
  })
})
