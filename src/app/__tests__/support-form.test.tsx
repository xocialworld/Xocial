import { render, screen, fireEvent } from '@testing-library/react'
import SupportPage from '../(marketing)/support/page'

describe('SupportPage', () => {
  beforeEach(() => {
    // @ts-ignore
    global.fetch = jest.fn().mockResolvedValue({ ok: true })
  })
  it('submits the support form and shows success', async () => {
    render(<SupportPage />)
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Jane' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane@example.com' } })
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Help' } })
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))
    expect(await screen.findByText(/Message sent!/, {}, { timeout: 2000 })).toBeInTheDocument()
  })
})
