import { render, screen } from '@testing-library/react';
import Home from '../page';
import '@testing-library/jest-dom';

describe('Homepage', () => {
  it('renders brand and hero content', () => {
    render(<Home />);
    expect(screen.getByText(/Xocial/i)).toBeInTheDocument();
    expect(screen.getByText(/Command Center/i)).toBeInTheDocument();
  });

  it('does not show app nav links on public homepage and explains features in content', () => {
    render(<Home />);
    expect(screen.queryByRole('link', { name: /Accounts/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Calendar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Create/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Analytics/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Multi-Account Management/i)).toBeInTheDocument();
    expect(screen.getByText(/Visual Calendar/i)).toBeInTheDocument();
    expect(screen.getByText(/AI Content Assistant/i)).toBeInTheDocument();
    expect(screen.getByText(/Analytics & Insights/i)).toBeInTheDocument();
  });

  it('has a features section anchor', () => {
    render(<Home />);
    const featuresHeader = screen.getAllByText(/Why XOCIAL/i)[0];
    expect(featuresHeader).toBeInTheDocument();
  });

  it('has signup CTA', () => {
    render(<Home />);
    const signupLink = screen.getAllByRole('link', { name: /Get Started For Free|Start Free Trial/i })[0];
    expect(signupLink).toBeInTheDocument();
  });
});