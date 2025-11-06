'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { queryKeys } from '@/lib/react-query';
import type { SocialAccount } from '@/types';
import { toast } from 'sonner';

/**
 * Fetch social accounts for a workspace
 */
async function fetchAccounts(workspaceId?: string): Promise<SocialAccount[]> {
  const params = new URLSearchParams();
  if (workspaceId) {
    params.set('workspaceId', workspaceId);
  }

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
    throw new Error(message);
  }

  return payload?.data?.accounts ?? [];
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
async function disconnectAccount(accountId: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('social_accounts')
    .update({ is_active: false })
    .eq('id', accountId);

  if (error) throw error;
}

/**
 * Hook to fetch and manage social accounts with React Query
 */
export function useAccounts(workspaceId?: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  // Fetch accounts with React Query
  const {
    data: accounts = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.accounts.list(workspaceId),
    queryFn: () => fetchAccounts(workspaceId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Set up real-time subscription
  useEffect(() => {
    const subscription = supabase
      .channel('social_accounts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'social_accounts',
        },
        () => {
          // Invalidate and refetch accounts when changes occur
          queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient, supabase]);

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
    mutationFn: disconnectAccount,
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

