import { useEffect } from 'react';

interface CalendarShortcutsProps {
    onPrevMonth: () => void;
    onNextMonth: () => void;
    onToday: () => void;
    onNewPost: () => void;
    onClosePanel: () => void;
    onTogglePlatform: (index: number) => void;
}

export function useCalendarShortcuts({
    onPrevMonth,
    onNextMonth,
    onToday,
    onNewPost,
    onClosePanel,
    onTogglePlatform,
}: CalendarShortcutsProps) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input
            const active = document.activeElement as (HTMLElement | null);
            if (
                active?.tagName === 'INPUT' ||
                active?.tagName === 'TEXTAREA' ||
                active?.isContentEditable
            ) {
                return;
            }

            switch (e.key.toLowerCase()) {
                case 'arrowleft':
                    onPrevMonth();
                    break;
                case 'arrowright':
                    onNextMonth();
                    break;
                case 't':
                    onToday();
                    break;
                case 'c':
                    if (!e.metaKey && !e.ctrlKey) {
                        e.preventDefault();
                        onNewPost();
                    }
                    break;
                case 'escape':
                    onClosePanel();
                    break;
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                    onTogglePlatform(parseInt(e.key) - 1);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onPrevMonth, onNextMonth, onToday, onNewPost, onClosePanel, onTogglePlatform]);
}
