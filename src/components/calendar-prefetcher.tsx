/**
 * Calendar Prefetcher Component
 * Based on Xocial SRS Section 3.2.4
 * Prefetches posts for adjacent months to improve navigation performance
 */

'use client';

import { useEffect } from 'react';
import { addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';

interface CalendarPrefetcherProps {
    currentMonth: Date;
    onPrefetch?: (startDate: Date, endDate: Date) => Promise<void>;
}

export function CalendarPrefetcher({ currentMonth, onPrefetch }: CalendarPrefetcherProps) {
    useEffect(() => {
        if (!onPrefetch) return;

        // Prefetch previous and next month
        const prefetchAdjacentMonths = async () => {
            const prevMonth = subMonths(currentMonth, 1);
            const nextMonth = addMonths(currentMonth, 1);

            try {
                // Prefetch previous month
                await onPrefetch(
                    startOfMonth(prevMonth),
                    endOfMonth(prevMonth)
                );

                // Prefetch next month
                await onPrefetch(
                    startOfMonth(nextMonth),
                    endOfMonth(nextMonth)
                );

                console.log('[Prefetch] Adjacent months loaded');
            } catch (error) {
                console.error('[Prefetch] Failed to prefetch adjacent months:', error);
            }
        };

        // Debounce prefetching to avoid excessive requests
        const timeoutId = setTimeout(prefetchAdjacentMonths, 300);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [currentMonth, onPrefetch]);

    // This component doesn't render anything
    return null;
}

/**
 * Hook for prefetching calendar data
 */
export function useCalendarPrefetch(currentMonth: Date) {
    useEffect(() => {
        const prefetchAdjacentMonths = async () => {
            const prevMonth = subMonths(currentMonth, 1);
            const nextMonth = addMonths(currentMonth, 1);

            const prevMonthKey = `${prevMonth.getFullYear()}-${prevMonth.getMonth()}`;
            const nextMonthKey = `${nextMonth.getFullYear()}-${nextMonth.getMonth()}`;

            // Check if already cached (using simple sessionStorage)
            if (typeof window !== 'undefined') {
                const cached = sessionStorage.getItem(`calendar-${prevMonthKey}`);
                if (!cached) {
                    // Prefetch previous month
                    const prevStart = startOfMonth(prevMonth).toISOString();
                    const prevEnd = endOfMonth(prevMonth).toISOString();

                    try {
                        const response = await fetch(
                            `/api/posts?start_date=${prevStart}&end_date=${prevEnd}`,
                            { priority: 'low' } as any
                        );

                        if (response.ok) {
                            const data = await response.json();
                            sessionStorage.setItem(`calendar-${prevMonthKey}`, JSON.stringify(data));
                        }
                    } catch (error) {
                        console.error('[Prefetch] Failed to prefetch previous month:', error);
                    }
                }

                const cachedNext = sessionStorage.getItem(`calendar-${nextMonthKey}`);
                if (!cachedNext) {
                    // Prefetch next month
                    const nextStart = startOfMonth(nextMonth).toISOString();
                    const nextEnd = endOfMonth(nextMonth).toISOString();

                    try {
                        const response = await fetch(
                            `/api/posts?start_date=${nextStart}&end_date=${nextEnd}`,
                            { priority: 'low' } as any
                        );

                        if (response.ok) {
                            const data = await response.json();
                            sessionStorage.setItem(`calendar-${nextMonthKey}`, JSON.stringify(data));
                        }
                    } catch (error) {
                        console.error('[Prefetch] Failed to prefetch next month:', error);
                    }
                }
            }
        };

        // Debounce prefetching
        const timeoutId = setTimeout(prefetchAdjacentMonths, 500);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [currentMonth]);
}
