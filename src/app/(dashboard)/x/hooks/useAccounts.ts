'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { queryKeys } from '@/lib/react-query';
import type { SocialAccount, SocialAccountMetrics } from '@/types';
import { toast } from 'sonner';
import { useSelectedWorkspace } from '@/store/workspaceStore';
import { logger } from '@/lib/logger';

const DEFAULT_ACCOUNT_METRICS: SocialAccountMetrics = {
  postsPublished: 0,
  totalLikes: 0,
  totalComments: 0,
  totalShares: 0,
  totalEngagement: 0,
  avgEngagementRate: 0,
  lastPublishedAt: null,
  lastSyncedAt: null,
  totalVideoViews: 0,
};

/**
 * Fetch social accounts for a workspace
 */
async function fetchAccounts(
  workspaceId?: string,
  filters?: { platform?: string; status?: 'active' | 'inactive'; owner?: 'me' | 'all' }
): Promise<SocialAccount[]> {
  const params = new URLSearchParams();
  if (workspaceId) {
    params.set('workspaceId', workspaceId);
  }
  if (filters?.platform) params.set('platform', filters.platform);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.owner) params.set('owner', filters.owner);

  const response = await fetch(`/api/accounts${params.size ? `?${params.toString()}` : ''}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
    },
  });

  let payload: any = null;

  try {
    payload = await response.json();
  } catch (error) {
    // Ignore JSON parse errors and fall through to generic message
  }

  if (!response.ok || !payload?.success) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      `Failed to load accounts (status ${response.status})`;
    logger.error('Accounts fetch failed', new Error(message), {
      action: 'fetch_accounts',
      workspaceId,
      filters,
      status: response.status,
    });
    throw new Error(message);
  }

  const accounts: SocialAccount[] = payload?.data?.accounts ?? [];
  return accounts.map((account) => ({
    ...account,
    metrics: account.metrics ?? { ...DEFAULT_ACCOUNT_METRICS },
  }));
}

/**
 * Sync an account with its platform
 */
async function syncAccount(accountId: string): Promise<void> {
  // Call the sync API endpoint
  const response = await fetch('/api/sync/engagement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountId }),
  });

  if (!response.ok) {
    throw new Error('Failed to sync account');
  }
}

/**
 * Disconnect a social account
 */
async function disconnectAccount(accountId: string, workspaceId?: string): Promise<void> {
  const supabase = createClient();

  let query = supabase
    .from('social_accounts')
    .update({ is_active: false })
    .eq('id', accountId);

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  const { error } = await query;

  if (error) throw error;
}

/**
 * Hook to fetch and manage social accounts with React Query
 */
export function useAccounts(
  workspaceId?: string,
  filters?: { platform?: string; status?: 'active' | 'inactive'; owner?: 'me' | 'all' }
) {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const selectedWorkspace = useSelectedWorkspace();
  const activeWorkspaceId = workspaceId ?? selectedWorkspace?.id;

  // Fetch accounts with React Query
  const {
    data: accounts = [] as SocialAccount[],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.accounts.list(JSON.stringify({ id: activeWorkspaceId, filters })),
    queryFn: () => fetchAccounts(activeWorkspaceId, filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Set up real-time subscription
  useEffect(() => {
    const channelName = `social_accounts_changes_${activeWorkspaceId ?? 'all'}`;
    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'social_accounts',
          ...(activeWorkspaceId ? { filter: `workspace_id=eq.${activeWorkspaceId}` } : {}),
        },
        () => {
          // Invalidate and refetch accounts when changes occur
          queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
          logger.info('Accounts change event received', {
            action: 'accounts_change',
            workspaceId: activeWorkspaceId,
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [activeWorkspaceId, queryClient, supabase]);

  // Sync account mutation
  const syncMutation = useMutation({
    mutationFn: syncAccount,
    onSuccess: () => {
      toast.success('Account synced successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    },
    onError: (error: any) => {
      toast.error('Failed to sync account');
      console.error('Sync error:', error);
    },
  });

  // Disconnect account mutation
  const disconnectMutation = useMutation({
    mutationFn: (id: string) => disconnectAccount(id, activeWorkspaceId),
    onMutate: async (accountId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.accounts.all });

      // Snapshot previous value
      const previousAccounts = queryClient.getQueryData(queryKeys.accounts.list(workspaceId));

      // Optimistically update
      if (previousAccounts) {
        queryClient.setQueryData(queryKeys.accounts.list(workspaceId), (old: SocialAccount[] = []) =>
          old.filter((account) => account.id !== accountId)
        );
      }

      return { previousAccounts };
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousAccounts) {
        queryClient.setQueryData(queryKeys.accounts.list(workspaceId), context.previousAccounts);
      }
      toast.error('Failed to disconnect account');
    },
    onSuccess: () => {
      toast.success('Account disconnected');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    },
  });

  return {
    accounts,
    loading,
    error: error ? (error as Error).message : null,
    refetch,
    syncAccount: syncMutation.mutate,
    disconnectAccount: disconnectMutation.mutate,
    isSyncing: syncMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
  };
}
