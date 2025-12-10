/**
 * Platform Selector Unit Tests
 * Verifies that all 6 platform buttons render correctly
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlatformSelector } from '../platform-selector';

// Mock the Button component
jest.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, disabled, className, ...props }: any) => (
        <button onClick={onClick} disabled={disabled} className={className} {...props}>
            {children}
        </button>
    ),
}));

describe('PlatformSelector', () => {
    const mockOnToggle = jest.fn();
    const defaultProps = {
        selectedPlatforms: [],
        onToggle: mockOnToggle,
        connectedPlatforms: [],
        isLoading: false,
    };

    beforeEach(() => {
        mockOnToggle.mockClear();
    });

    it('renders all 6 platform buttons', () => {
        render(<PlatformSelector {...defaultProps} />);

        // Check that all platform names are rendered
        expect(screen.getByText('Instagram')).toBeInTheDocument();
        expect(screen.getByText('Facebook')).toBeInTheDocument();
        expect(screen.getByText('Twitter')).toBeInTheDocument();
        expect(screen.getByText('LinkedIn')).toBeInTheDocument();
        expect(screen.getByText('YouTube')).toBeInTheDocument();
        expect(screen.getByText('TikTok')).toBeInTheDocument();
    });

    it('renders the header text', () => {
        render(<PlatformSelector {...defaultProps} />);

        expect(screen.getByText('Select Platforms')).toBeInTheDocument();
        expect(screen.getByText('Choose where you want to publish this content')).toBeInTheDocument();
    });

    it('shows "Select at least one platform" message when none selected', () => {
        render(<PlatformSelector {...defaultProps} />);

        expect(screen.getByText('Select at least one platform to continue')).toBeInTheDocument();
    });

    it('shows platform count when platforms are selected', () => {
        render(
            <PlatformSelector
                {...defaultProps}
                selectedPlatforms={['instagram', 'facebook']}
            />
        );

        expect(screen.getByText('2 platforms selected')).toBeInTheDocument();
    });

    it('calls onToggle when a platform button is clicked', () => {
        render(<PlatformSelector {...defaultProps} />);

        const instagramButton = screen.getByText('Instagram').closest('button');
        if (instagramButton) {
            fireEvent.click(instagramButton);
        }

        expect(mockOnToggle).toHaveBeenCalledWith('instagram');
    });

    it('disables buttons when isLoading is true', () => {
        render(<PlatformSelector {...defaultProps} isLoading={true} />);

        const buttons = screen.getAllByRole('button');
        buttons.forEach((button) => {
            expect(button).toBeDisabled();
        });
    });

    it('shows loading message when isLoading and no onRefresh', () => {
        render(<PlatformSelector {...defaultProps} isLoading={true} />);

        expect(screen.getByText('Loading accounts...')).toBeInTheDocument();
    });

    it('shows Sync button when onRefresh is provided', () => {
        const mockRefresh = jest.fn();
        render(<PlatformSelector {...defaultProps} onRefresh={mockRefresh} />);

        expect(screen.getByText('Sync')).toBeInTheDocument();
    });
});
