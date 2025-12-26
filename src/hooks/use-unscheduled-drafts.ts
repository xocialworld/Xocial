import { useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query';
import { Post } from '@/types';
import { useSelectedWorkspace } from '@/store/workspaceStore';
import { createClient } from '@/lib/supabase/client';

/**
 * Hook to fetch unscheduled drafts (drafts with no scheduled date)
 * Uses the /api/posts endpoint with unscheduled=true
 * Subscribes to Realtime changes
 */
export function useUnscheduledDrafts() {
    const queryClient = useQueryClient();
    const workspace = useSelectedWorkspace();
    const workspaceId = workspace?.id;
    const supabase = useMemo(() => createClient(), []);

    const queryKey = useMemo(() => queryKeys.posts.list({
        unscheduled: 'true',
        workspaceId
    }), [workspaceId]);

    // Fetch function
    const fetchDrafts = useCallback(async (): Promise<Post[]> => {
        if (!workspaceId) {
            console.log('[Unscheduled Drafts] No workspace ID, skipping fetch');
            return [];
        }

        console.log('[Unscheduled Drafts] Fetching drafts for workspace:', workspaceId);

        const params = new URLSearchParams({
            unscheduled: 'true',
            workspaceId,
        });

        const response = await fetch(`/api/posts?${params.toString()}`);

        if (!response.ok) {
            console.error('[Unscheduled Drafts] Fetch failed:', response.status);
            throw new Error('Failed to fetch drafts');
        }

        const data = await response.json();
        const posts = data.data?.posts || data.posts || [];
        
        console.log('[Unscheduled Drafts] Fetched', posts.length, 'drafts');

        return posts;
    }, [workspaceId]);

    // Realtime subscription
    useEffect(() => {
        if (!workspaceId) return;

        const channel = supabase
            .channel(`unscheduled-drafts-realtime:${workspaceId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'posts',
                    filter: `workspace_id=eq.${workspaceId}`,
                },
                (payload) => {
                    console.log('[Drafts Realtime] Post change detected:', payload.eventType);
                    // Force immediate refetch
                    queryClient.refetchQueries({ queryKey: queryKeys.posts.all });
                }
            )
            .subscribe((status) => {
                console.log('[Drafts Realtime] Subscription status:', status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [workspaceId, queryClient, supabase]);

    return useQuery({
        queryKey,
        queryFn: fetchDrafts,
        enabled: !!workspaceId,
        // No caching - always fresh data
        staleTime: 0,
        gcTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
    });
}
