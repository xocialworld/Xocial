/**
 * AI Content Studio Keyboard Shortcuts Hook
 * Based on Xocial SRS Section 3.3
 * Implements keyboard shortcuts for AI content generation workflow
 */

'use client';

import { useEffect } from 'react';

interface UseAIShortcutsOptions {
    onGenerate?: () => void;
    onRefine?: () => void;
    onVariations?: () => void;
    onCopy?: () => void;
    onSwitchPlatform?: (index: number) => void;
    enabled?: boolean;
}

export function useAIShortcuts({
    onGenerate,
    onRefine,
    onVariations,
    onCopy,
    onSwitchPlatform,
    enabled = true,
}: UseAIShortcutsOptions = {}) {
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

            // Check for modifier keys
            const hasModifier = event.ctrlKey || event.metaKey || event.altKey;

            // 'g' for generate
            if ((event.key === 'g' || event.key === 'G') && !hasModifier) {
                event.preventDefault();
                onGenerate?.();
            }

            // 'r' for refine
            else if ((event.key === 'r' || event.key === 'R') && !hasModifier) {
                event.preventDefault();
                onRefine?.();
            }

            // 'v' for variations
            else if ((event.key === 'v' || event.key === 'V') && !hasModifier) {
                event.preventDefault();
                onVariations?.();
            }

            // 'c' for copy
            else if ((event.key === 'c' || event.key === 'C') && !hasModifier) {
                event.preventDefault();
                onCopy?.();
            }

            // Number keys 1-6 for platform switching
            else if (event.key >= '1' && event.key <= '6' && !hasModifier) {
                event.preventDefault();
                const platformIndex = parseInt(event.key) - 1;
                onSwitchPlatform?.(platformIndex);
            }

            // '?' for help (show keyboard shortcuts)
            else if (event.key === '?' && event.shiftKey) {
                event.preventDefault();
                console.log('AI Studio Keyboard Shortcuts:', {
                    'G': 'Generate content',
                    'R': 'Refine current platform',
                    'V': 'Generate variations',
                    'C': 'Copy current platform content',
                    '1-6': 'Switch platform tabs',
                });
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [enabled, onGenerate, onRefine, onVariations, onCopy, onSwitchPlatform]);
}

/**
 * Get keyboard shortcut hints for UI display
 */
export function getAIShortcuts() {
    return [
        { key: 'G', description: 'Generate content' },
        { key: 'R', description: 'Refine' },
        { key: 'V', description: 'Variations' },
        { key: 'C', description: 'Copy' },
        { key: '1-6', description: 'Switch platforms' },
    ];
}
