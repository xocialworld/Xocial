'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { KEYBOARD_SHORTCUTS } from '@/hooks/use-global-shortcuts';

interface KeyboardShortcutsHelpProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsHelp({ open, onOpenChange }: KeyboardShortcutsHelpProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-secondary-100 rounded text-sm">?</kbd>
                        Keyboard Shortcuts
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    {/* Navigation */}
                    <section>
                        <h3 className="text-sm font-semibold text-secondary-900 mb-3">Navigation</h3>
                        <div className="space-y-2">
                            {KEYBOARD_SHORTCUTS.navigation.map((shortcut) => (
                                <ShortcutRow key={shortcut.description} {...shortcut} />
                            ))}
                        </div>
                    </section>

                    {/* Calendar */}
                    <section>
                        <h3 className="text-sm font-semibold text-secondary-900 mb-3">Calendar</h3>
                        <div className="space-y-2">
                            {KEYBOARD_SHORTCUTS.calendar.map((shortcut) => (
                                <ShortcutRow key={shortcut.description} {...shortcut} />
                            ))}
                        </div>
                    </section>

                    {/* Composer */}
                    <section>
                        <h3 className="text-sm font-semibold text-secondary-900 mb-3">Composer</h3>
                        <div className="space-y-2">
                            {KEYBOARD_SHORTCUTS.composer.map((shortcut) => (
                                <ShortcutRow key={shortcut.description} {...shortcut} />
                            ))}
                        </div>
                    </section>

                    {/* General */}
                    <section>
                        <h3 className="text-sm font-semibold text-secondary-900 mb-3">General</h3>
                        <div className="space-y-2">
                            {KEYBOARD_SHORTCUTS.general.map((shortcut) => (
                                <ShortcutRow key={shortcut.description} {...shortcut} />
                            ))}
                        </div>
                    </section>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function ShortcutRow({ keys, description }: { keys: string[]; description: string }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm text-secondary-600">{description}</span>
            <div className="flex gap-1">
                {keys.map((key, i) => (
                    <kbd
                        key={i}
                        className="px-2 py-0.5 bg-secondary-100 border border-secondary-200 rounded text-xs font-mono"
                    >
                        {key}
                    </kbd>
                ))}
            </div>
        </div>
    );
}

/**
 * Hook to manage keyboard shortcuts help dialog
 */
export function useKeyboardShortcutsHelp() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === '?' && e.shiftKey) {
                e.preventDefault();
                setOpen(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return { open, setOpen };
}
