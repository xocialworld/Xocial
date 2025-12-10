'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface GlobalShortcutsOptions {
    enabled?: boolean;
    onShowHelp?: () => void;
}

/**
 * Global keyboard shortcuts for navigation
 * X.O.C.I.A.L navigation pattern
 */
export function useGlobalShortcuts({
    enabled = true,
    onShowHelp,
}: GlobalShortcutsOptions = {}) {
    const router = useRouter();

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!enabled) return;

        // Ignore if typing in input fields
        const target = e.target as HTMLElement;
        if (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable
        ) {
            return;
        }

        // Handle global shortcuts with Alt/Option key
        if (e.altKey) {
            switch (e.key.toLowerCase()) {
                case 'x':
                    e.preventDefault();
                    router.push('/x');
                    break;
                case 'o':
                    e.preventDefault();
                    router.push('/o');
                    break;
                case 'c':
                    e.preventDefault();
                    router.push('/c');
                    break;
                case 'i':
                    e.preventDefault();
                    router.push('/i');
                    break;
                case 'a':
                    e.preventDefault();
                    router.push('/a');
                    break;
                case 'l':
                    e.preventDefault();
                    router.push('/l');
                    break;
            }
        }

        // '?' for help
        if (e.key === '?' && e.shiftKey) {
            e.preventDefault();
            onShowHelp?.();
        }

        // Escape to close modals (handled by individual components)
    }, [enabled, router, onShowHelp]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}

/**
 * List of all keyboard shortcuts for help display
 */
export const KEYBOARD_SHORTCUTS = {
    navigation: [
        { keys: ['⌥', 'X'], description: 'Go to Accounts' },
        { keys: ['⌥', 'O'], description: 'Go to Calendar' },
        { keys: ['⌥', 'C'], description: 'Go to Composer' },
        { keys: ['⌥', 'I'], description: 'Go to Influence' },
        { keys: ['⌥', 'A'], description: 'Go to Analytics' },
        { keys: ['⌥', 'L'], description: 'Go to Leverage' },
    ],
    calendar: [
        { keys: ['←'], description: 'Previous month' },
        { keys: ['→'], description: 'Next month' },
        { keys: ['T'], description: 'Go to today' },
        { keys: ['C'], description: 'Create new post' },
        { keys: ['Esc'], description: 'Close panel' },
        { keys: ['1-6'], description: 'Toggle platform filter' },
    ],
    composer: [
        { keys: ['G'], description: 'Generate AI content' },
        { keys: ['R'], description: 'Refine content' },
        { keys: ['V'], description: 'Generate variations' },
        { keys: ['1-6'], description: 'Switch platform' },
    ],
    general: [
        { keys: ['?'], description: 'Show keyboard shortcuts' },
        { keys: ['Esc'], description: 'Close modals/panels' },
    ],
};
