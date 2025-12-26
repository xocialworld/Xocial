import { useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidateCalendarQueries } from '@/lib/react-query';
import { CalendarEntry, CalendarAPIResponse } from '@/types';
import { useSelectedWorkspace } from '@/store/workspaceStore';
import { createClient } from '@/lib/supabase/client';

/**
 * Hook to fetch calendar entries for a date range
 * Uses the /api/calendar endpoint which returns unified entries from:
 * - content_items + content_variants (internal planned content)
 * - external_posts (imported platform content)
 * - legacy posts table (for backwards compatibility)
 * 
 * Subscribes to Realtime changes for instant updates
 */
export function useCalendarPosts(start: Date, end: Date) {
  const queryClient = useQueryClient();
  const workspace = useSelectedWorkspace();
  const workspaceId = workspace?.id;
  const supabase = useMemo(() => createClient(), []);
  
  // Track subscription to prevent duplicate subscriptions
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Memoize date strings to prevent unnecessary re-renders
  // Use date-only comparison for cache keys to improve cache hits
  const startIso = useMemo(() => {
    const d = new Date(start);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, [start.getFullYear(), start.getMonth(), start.getDate()]);
  
  const endIso = useMemo(() => {
    const d = new Date(end);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  }, [end.getFullYear(), end.getMonth(), end.getDate()]);

  // Use calendar-specific query key from centralized key factory
  const queryKey = useMemo(() => 
    queryKeys.calendar.entries({ start: startIso, end: endIso, workspaceId: workspaceId || '' }),
    [startIso, endIso, workspaceId]
  );

  // Fetch function - can be called directly for manual refresh
  const fetchCalendarEntries = useCallback(async (): Promise<CalendarEntry[]> => {
    if (!workspaceId) {
      console.log('[Calendar] No workspace ID, skipping fetch');
      return [];
    }

    console.log('[Calendar] Fetching entries for workspace:', workspaceId, 'range:', startIso, '->', endIso);

    const params = new URLSearchParams({
      from: startIso,
      to: endIso,
      workspaceId
    });

    const response = await fetch(`/api/calendar?${params.toString()}`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[Calendar] Fetch failed:', response.status, errorText);
      throw new Error(`Failed to fetch calendar entries: ${response.status}`);
    }

    const data: CalendarAPIResponse = await response.json();
    const entries = data.entries || [];
    
    console.log('[Calendar] Fetched', entries.length, 'entries');

    return entries;
  }, [workspaceId, startIso, endIso]);

  // Realtime subscription with proper cleanup
  // Subscribe to changes on content_items, external_posts, and posts tables
  useEffect(() => {
    if (!workspaceId) return;

    // Clean up existing subscription before creating new one
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    const channelName = `calendar-realtime:${workspaceId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content_items',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          console.log('[Calendar Realtime] content_items change detected:', payload.eventType);
          invalidateCalendarQueries(queryClient);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content_variants',
        },
        (payload) => {
          console.log('[Calendar Realtime] content_variants change detected:', payload.eventType);
          invalidateCalendarQueries(queryClient);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'external_posts',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          console.log('[Calendar Realtime] external_posts change detected:', payload.eventType);
          invalidateCalendarQueries(queryClient);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          console.log('[Calendar Realtime] posts change detected:', payload.eventType);
          invalidateCalendarQueries(queryClient);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Calendar Realtime] Successfully subscribed to', channelName);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Calendar Realtime] Subscription error for', channelName);
        }
      });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [workspaceId, queryClient, supabase]);

  const query = useQuery({
    queryKey,
    queryFn: fetchCalendarEntries,
    enabled: !!workspaceId,
    // Short stale time for calendar - balance between freshness and performance
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    // Retry with backoff on failure
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  // Expose a manual refetch that also clears cache
  const forceRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
    return query.refetch();
  }, [queryClient, queryKey, query]);

  // Helper to group entries by date
  const entriesByDate = useMemo(() => {
    const grouped: Record<string, CalendarEntry[]> = {};
    for (const entry of query.data || []) {
      const dateKey = entry.calendarDate.split('T')[0]; // YYYY-MM-DD
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(entry);
    }
    return grouped;
  }, [query.data]);

  // Helper to get entries for a specific date
  const getEntriesForDate = useCallback((date: Date): CalendarEntry[] => {
    const dateKey = date.toISOString().split('T')[0];
    return entriesByDate[dateKey] || [];
  }, [entriesByDate]);

  return {
    ...query,
    entries: query.data || [],
    entriesByDate,
    getEntriesForDate,
    forceRefresh,
  };
}

/**
 * Legacy export for backwards compatibility
 * Maps CalendarEntry to Post-like shape for existing components
 */
export function useCalendarPostsLegacy(start: Date, end: Date) {
  const result = useCalendarPosts(start, end);
  
  // Map entries to legacy Post shape
  const posts = useMemo(() => {
    return (result.entries || []).map(entry => ({
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
    }));
  }, [result.entries]);

  return {
    ...result,
    data: posts,
    posts,
  };
}
