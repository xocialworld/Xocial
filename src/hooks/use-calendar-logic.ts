import { useState, useCallback, useEffect, useMemo } from 'react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { useCalendarPosts } from './use-calendar-posts';
import { useQueryClient } from '@tanstack/react-query';
import { useCalendarShortcuts } from './use-calendar-shortcuts';
import { useCalendarFiltersStore, platformOptions } from '@/store/calendarFiltersStore';
import { useRouter } from 'next/navigation';
import { useSelectedWorkspace, useHasHydrated } from '@/store/workspaceStore';

export function useCalendarLogic() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const workspace = useSelectedWorkspace();
    const workspaceId = workspace?.id;
    const hasHydrated = useHasHydrated();
    
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showFilters, setShowFilters] = useState(false);

    // Calculate date range for the calendar view
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const {
        entries: calendarEntries = [],
        isLoading: loading,
        error,
        refetch,
        forceRefresh,
        getEntriesForDate,
    } = useCalendarPosts(calendarStart, calendarEnd);
    
    // Map CalendarEntry to a Post-like shape for backwards compatibility
    const posts = useMemo(() => {
        return calendarEntries.map(entry => ({
            id: entry.id,
            workspace_id: entry.workspaceId,
            content: entry.content || { text: entry.caption },
            platforms: entry.platforms,
            status: entry.status,
            scheduled_at: entry.scheduledAt,
            published_at: entry.publishedAt,
            created_at: entry.createdAt,
            updated_at: entry.updatedAt,
            media: entry.media,
            external_post_id: entry.externalPostId,
            social_account_id: entry.socialAccountId,
            // Extra fields for calendar
            _source: entry.source,
            _calendarDate: entry.calendarDate,
            _variants: entry.variants,
            _title: entry.title,
            _brief: entry.brief,
            _contentItemId: entry.contentItemId,
            _approvalWorkflowId: entry.approvalWorkflowId,
            _postType: entry.postType,
            _metrics: entry.metrics,
            _permalink: entry.permalink,
        }));
    }, [calendarEntries]);

    // Prefetch adjacent months for smooth navigation
    useEffect(() => {
        if (!workspaceId) return;

        // Prefetch next month
        const nextMonth = addMonths(currentMonth, 1);
        const nextStart = startOfWeek(startOfMonth(nextMonth));
        const nextEnd = endOfWeek(endOfMonth(nextMonth));
        
        // Prefetch previous month
        const prevMonth = subMonths(currentMonth, 1);
        const prevStart = startOfWeek(startOfMonth(prevMonth));
        const prevEnd = endOfWeek(endOfMonth(prevMonth));

        // Delay prefetch slightly to not compete with main fetch
        const prefetchTimeout = setTimeout(() => {
            // Prefetch by setting data in cache via a background fetch
            const prefetchMonth = async (start: Date, end: Date) => {
                const params = new URLSearchParams({
                    from: start.toISOString(),
                    to: end.toISOString(),
                    limit: '1000',
                    workspaceId
                });

                try {
                    const response = await fetch(`/api/posts?${params.toString()}`);
                    if (response.ok) {
                        const data = await response.json();
                        const posts = data.data?.posts || data.posts || [];
                        
                        // Set in cache for when user navigates
                        queryClient.setQueryData(
                            ['posts', 'calendar', { 
                                start: start.toISOString(), 
                                end: end.toISOString(), 
                                workspaceId 
                            }],
                            posts
                        );
                    }
                } catch (e) {
                    // Silent fail - it's just prefetching
                }
            };

            // Only prefetch if we have some time on current page
            prefetchMonth(nextStart, nextEnd);
            prefetchMonth(prevStart, prevEnd);
        }, 1000);

        return () => clearTimeout(prefetchTimeout);
    }, [currentMonth, workspaceId, queryClient]);

    const {
        platforms: platformFilters,
        statuses: statusFilters,
        togglePlatform,
        toggleStatus,
        reset,
    } = useCalendarFiltersStore();

    // Memoize filtered posts to prevent recalculation on every render
    const filteredPosts = useMemo(() => {
        return posts.filter((post) => {
            const postPlatforms = (post.platforms ?? []) as any[];
            // Treat posts with no platforms as "unassigned" and show them
            const matchesPlatform =
                platformFilters.length === 0 ||
                postPlatforms.length === 0 ||
                postPlatforms.some((platform) => platformFilters.includes(platform));

            const matchesStatus = statusFilters.length === 0 || statusFilters.includes(post.status as any);
            return matchesPlatform && matchesStatus;
        });
    }, [posts, platformFilters, statusFilters]);

    // Memoize selected date posts
    // Use _calendarDate for date bucketing (status-aware: drafted_at for drafts, scheduled_at for scheduled, etc.)
    const selectedDatePosts = useMemo(() => {
        if (!selectedDate) return [];
        
        return filteredPosts
            .filter((post) => {
                // Use calendar date for bucketing (already computed by API based on status)
                const calendarDate = post._calendarDate || post.scheduled_at || post.published_at || post.created_at;
                const postDate = new Date(calendarDate);
                return (
                    postDate.getFullYear() === selectedDate.getFullYear() &&
                    postDate.getMonth() === selectedDate.getMonth() &&
                    postDate.getDate() === selectedDate.getDate()
                );
            })
            .sort((a, b) => {
                const aDate = new Date(a._calendarDate || a.scheduled_at || a.published_at || a.created_at);
                const bDate = new Date(b._calendarDate || b.scheduled_at || b.published_at || b.created_at);
                return aDate.getTime() - bDate.getTime();
            });
    }, [filteredPosts, selectedDate]);

    const activeFilters = platformFilters.length + statusFilters.length;

    // Navigation handlers
    const handlePrevMonth = useCallback(() => {
        setCurrentMonth(prev => subMonths(prev, 1));
    }, []);
    
    const handleNextMonth = useCallback(() => {
        setCurrentMonth(prev => addMonths(prev, 1));
    }, []);
    
    const handleToday = useCallback(() => {
        setCurrentMonth(new Date());
        setSelectedDate(new Date());
    }, []);
    
    const handleNewPost = useCallback(() => {
        const date = selectedDate ?? new Date();
        const prefillDate = new Date(date);
        prefillDate.setHours(10, 0, 0, 0);
        router.push(`/c?date=${encodeURIComponent(prefillDate.toISOString())}`);
    }, [selectedDate, router]);
    
    const handleClosePanel = useCallback(() => setSelectedDate(null), []);
    
    const handleTogglePlatform = useCallback((index: number) => {
        if (index < platformOptions.length) {
            togglePlatform(platformOptions[index]);
        }
    }, [togglePlatform]);

    // Keyboard shortcuts
    useCalendarShortcuts({
        onPrevMonth: handlePrevMonth,
        onNextMonth: handleNextMonth,
        onToday: handleToday,
        onNewPost: handleNewPost,
        onClosePanel: handleClosePanel,
        onTogglePlatform: handleTogglePlatform,
    });

    // Include hydration state in loading - don't show data until hydrated
    const isLoading = loading || !hasHydrated;
    
    // Show helpful message if no workspace is selected
    const noWorkspace = hasHydrated && !workspaceId;

    return {
        selectedDate,
        setSelectedDate,
        currentMonth,
        setCurrentMonth,
        posts,
        filteredPosts,
        selectedDatePosts,
        loading: isLoading,
        error,
        refetch,
        forceRefresh,
        showFilters,
        setShowFilters,
        platformFilters,
        statusFilters,
        toggleStatus,
        reset,
        activeFilters,
        noWorkspace, // New: indicates user needs to select/create a workspace
        workspaceId,
    };
}
