/**
 * Calendar Keyboard Shortcuts Hook
 * Based on Xocial SRS Section 3.2.4
 * Implements keyboard navigation for the calendar
 */

'use client';

import { useEffect } from 'react';
import { addMonths, subMonths } from 'date-fns';
import { useRouter } from 'next/navigation';

interface UseCalendarShortcutsOptions {
    onPrevMonth?: () => void;
    onNextMonth?: () => void;
    onToday?: () => void;
    onNewPost?: () => void;
    onClosePanel?: () => void;
    onTogglePlatform?: (platformIndex: number) => void;
    enabled?: boolean;
}

export function useCalendarShortcuts({
    onPrevMonth,
    onNextMonth,
    onToday,
    onNewPost,
    onClosePanel,
    onTogglePlatform,
    enabled = true,
}: UseCalendarShortcutsOptions = {}) {
    const router = useRouter();

    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            // Ignore if user is typing in an input/textarea
            const target = event.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                return;
            }

            // Arrow keys for month navigation
            if (event.key === 'ArrowLeft' && !event.shiftKey) {
                event.preventDefault();
                onPrevMonth?.();
            } else if (event.key === 'ArrowRight' && !event.shiftKey) {
                event.preventDefault();
                onNextMonth?.();
            }

            // 'n' for new post
            else if (event.key === 'n' || event.key === 'N') {
                event.preventDefault();
                if (onNewPost) {
                    onNewPost();
                } else {
                    router.push('/c');
                }
            }

            // 't' for today
            else if (event.key === 't' || event.key === 'T') {
                event.preventDefault();
                onToday?.();
            }

            // 'Escape' to close panel
            else if (event.key === 'Escape') {
                event.preventDefault();
                onClosePanel?.();
            }

            // Number keys 1-6 for platform filters
            else if (event.key >= '1' && event.key <= '6') {
                event.preventDefault();
                const platformIndex = parseInt(event.key) - 1;
                onTogglePlatform?.(platformIndex);
            }

            // '?' for help (optional - could show keyboard shortcuts modal)
            else if (event.key === '?' && event.shiftKey) {
                event.preventDefault();
                console.log('Keyboard shortcuts:', {
                    'Arrow Left/Right': 'Navigate months',
                    'n': 'New post',
                    't': 'Go to today',
                    'Esc': 'Close panel',
                    '1-6': 'Toggle platform filters',
                });
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [
        enabled,
        onPrevMonth,
        onNextMonth,
        onToday,
        onNewPost,
        onClosePanel,
        onTogglePlatform,
        router,
    ]);
}

/**
 * Get keyboard shortcut hints for UI display
 */
export function getCalendarShortcuts() {
    return [
        { key: '←/→', description: 'Navigate months' },
        { key: 'N', description: 'New post' },
        { key: 'T', description: 'Go to today' },
        { key: 'Esc', description: 'Close panel' },
        { key: '1-6', description: 'Toggle platforms' },
    ];
}
