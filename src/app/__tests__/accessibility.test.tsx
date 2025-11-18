import React from 'react';
import { render, screen } from '@testing-library/react';
import RootLayout from '../layout';

describe('Accessibility', () => {
  it('renders a skip-to-content link and main region', () => {
    render(
      // @ts-expect-error Next.js layout types
      <RootLayout>
        <div>Child content</div>
      </RootLayout>
    );
    expect(screen.getByText(/Skip to content/i)).toBeInTheDocument();
    expect(document.getElementById('main-content')).toBeTruthy();
  });
});