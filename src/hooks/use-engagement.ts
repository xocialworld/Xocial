import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys, handleQueryError } from '@/lib/react-query';
import { createClient } from '@/lib/supabase/client';
import { useSelectedWorkspace } from '@/store/workspaceStore';

export type EngagementType = 'comment' | 'mention' | 'like' | 'follow' | 'dm';

export interface EngagementItem {
    id: string;
    type: EngagementType;
    user: string;
    handle: string;
    avatar: string | null;
    content: string;
    platform: 'instagram' | 'twitter' | 'linkedin' | 'facebook' | 'tiktok' | 'youtube';
    postTitle: string | null;
    timestamp: string;
    responded: boolean;
    isRead: boolean;
    socialAccountId: string;
}

export interface EngagementFilters {
    platform?: string;
    type?: string;
    status?: 'all' | 'new' | 'unread' | 'replied';
    limit?: number;
    offset?: number;
}

async function fetchEngagement(filters?: EngagementFilters) {
    const params = new URLSearchParams();
    if (filters?.platform) params.set('platform', filters.platform);
    if (filters?.type && filters.type !== 'all') params.set('type', filters.type);
    if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters?.limit) params.set('limit', filters.limit.toString());
    if (filters?.offset) params.set('offset', filters.offset.toString());

    const response = await fetch(`/api/engagement?${params.toString()}`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch engagement data');
    }

    return await response.json();
}

export function useEngagement(filters?: EngagementFilters) {
    const queryClient = useQueryClient();
    const queryKey = queryKeys.engagement.list(filters);
    const workspace = useSelectedWorkspace();
    const workspaceId = workspace?.id;
    const supabase = createClient();

    // Realtime subscription
    useEffect(() => {
        if (!workspaceId) return;

        const channel = supabase
            .channel(`engagement-realtime:${workspaceId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'social_engagements',
                    filter: `workspace_id=eq.${workspaceId}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['engagement'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [workspaceId, queryClient, supabase]);


    const {
        data,
        isLoading,
        error,
        refetch,
        isRefetching
    } = useQuery({
        queryKey,
        queryFn: () => fetchEngagement(filters),
        staleTime: Infinity,
    });

    return {
        items: (data?.data?.items || []) as EngagementItem[],
        total: (data?.data?.total || 0) as number,
        hasMore: (data?.data?.hasMore || false) as boolean,
        accounts: (data?.data?.accounts || []) as any[],
        isLoading: isLoading || isRefetching,
        error: error ? handleQueryError(error) : null,
        refetch
    };
}
