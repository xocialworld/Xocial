import { render, screen } from '@testing-library/react';
import Home from '../page';
import '@testing-library/jest-dom';

describe('Homepage', () => {
  it('renders brand and hero content', () => {
    render(<Home />);
    const brandElements = screen.getAllByText(/Xocial/i);
    expect(brandElements.length).toBeGreaterThan(0);
    expect(screen.getByText(/Finally Solved/i)).toBeInTheDocument();
  });

  it('explains features in content', () => {
    render(<Home />);
    // Public homepage now has footer links, so we don't check for their absence globally.
    // Instead we check for presence of feature descriptions.
    expect(screen.getAllByText(/Visual Calendar/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/AI Assistant/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Deep Analytics/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Smart Scheduling/i).length).toBeGreaterThan(0);
  });

  it('has a features section anchor', () => {
    render(<Home />);
    expect(screen.getByText(/Everything you need/i)).toBeInTheDocument();
    expect(document.querySelector('#features')).toBeInTheDocument();
  });

  it('has signup CTA', () => {
    render(<Home />);
    const signupLink = screen.getAllByRole('link', { name: /Get Started For Free|Start Free Trial/i })[0];
    expect(signupLink).toBeInTheDocument();
  });
});
