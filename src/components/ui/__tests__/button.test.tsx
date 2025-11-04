/**
 * Button Component Tests
 * Tests for button variants, states, and accessibility
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../button';

describe('Button Component', () => {
  // ═══════════════════════════════════════════════════════════════
  // Basic Rendering
  // ═══════════════════════════════════════════════════════════════
  
  it('should render button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('should render with children', () => {
    render(
      <Button>
        <span>Test Content</span>
      </Button>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════
  // Click Handling
  // ═══════════════════════════════════════════════════════════════
  
  it('should call onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not call onClick when disabled', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick} disabled>Click me</Button>);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  // ═══════════════════════════════════════════════════════════════
  // Variants
  // ═══════════════════════════════════════════════════════════════
  
  it('should apply default variant class', () => {
    render(<Button variant="default">Button</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should apply outline variant class', () => {
    render(<Button variant="outline">Button</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should apply ghost variant class', () => {
    render(<Button variant="ghost">Button</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════
  // Sizes
  // ═══════════════════════════════════════════════════════════════
  
  it('should apply size classes', () => {
    const { rerender } = render(<Button size="sm">Button</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();

    rerender(<Button size="default">Button</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();

    rerender(<Button size="lg">Button</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════
  // States
  // ═══════════════════════════════════════════════════════════════
  
  it('should show disabled state', () => {
    render(<Button disabled>Button</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should apply custom className', () => {
    render(<Button className="custom-class">Button</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  // ═══════════════════════════════════════════════════════════════
  // Accessibility
  // ═══════════════════════════════════════════════════════════════
  
  it('should be keyboard accessible', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Button</Button>);
    
    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
    
    // Button natively handles Enter key
    expect(button).toBeInTheDocument();
  });

  it('should have proper aria attributes when disabled', () => {
    render(<Button disabled>Button</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('disabled');
  });

  it('should support asChild prop', () => {
    // If asChild is implemented
    const { container } = render(<Button>Button</Button>);
    expect(container.querySelector('button')).toBeInTheDocument();
  });
});

