import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSelectedWorkspace } from '@/store/workspaceStore';
import type { SocialAccount, Platform } from '@/types';
export type { SocialAccount, Platform };

export interface UseAccountsOptions {
  platform?: string;
  status?: 'active' | 'inactive' | 'all' | string;
}

interface UseAccountsReturn {
  accounts: SocialAccount[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  syncAccount: (accountId: string) => Promise<void>;
  disconnectAccount: (accountId: string) => Promise<void>;
}

/**
 * Hook to fetch and manage social accounts
 * @param platformOrOptions - Optional platform filter or options object
 */
export function useAccounts(platformOrOptions?: Platform | UseAccountsOptions): UseAccountsReturn {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const workspace = useSelectedWorkspace();

  // Memoize options to prevent infinite loops if object is passed inline
  const optionsKey = JSON.stringify(platformOrOptions);

  const fetchAccounts = useCallback(async () => {
    // Parse options inside callback
    const options: UseAccountsOptions = typeof platformOrOptions === 'object'
      ? platformOrOptions as UseAccountsOptions
      : { platform: platformOrOptions };

    if (!workspace) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();

      // Build query
      let query = supabase
        .from('social_accounts')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false });

      // Apply status filter
      if (options.status) {
        if (options.status === 'active') query = query.eq('is_active', true);
        else if (options.status === 'inactive') query = query.eq('is_active', false);
        // if 'all' or undefined, don't filter
      } else {
        // Default behavior: show only active accounts
        query = query.eq('is_active', true);
      }

      // Apply platform filter
      if (options.platform) {
        const platforms = options.platform.split(',').map(p => p.trim());
        if (platforms.length > 0) {
          query = query.in('platform', platforms);
        }
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Map Supabase response (nulls) to TypeScript interface (undefined)
      // This ensures compatibility with shared types
      const mappedAccounts: SocialAccount[] = (data || []).map((acc: any) => ({
        ...acc,
        account_handle: acc.account_handle || undefined,
        account_avatar: acc.account_avatar || undefined,
        refresh_token: acc.refresh_token || undefined,
        token_expires_at: acc.token_expires_at || undefined,
        last_synced_at: acc.last_synced_at || undefined,
        metrics: acc.metrics || undefined,
        metadata: acc.metadata || undefined,
      }));

      setAccounts(mappedAccounts);
    } catch (err) {
      console.error('[useAccounts] Error:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch accounts'));
    } finally {
      setLoading(false);
    }
  }, [optionsKey, workspace]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Realtime subscription
  useEffect(() => {
    if (!workspace?.id) {
      return;
    }

    const supabase = createClient();
    const channelName = `social-accounts-realtime:${workspace.id}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'social_accounts',
          filter: `workspace_id=eq.${workspace.id}`,
        },
        () => {
          fetchAccounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspace?.id, fetchAccounts]);

  const syncAccount = useCallback(async (accountId: string) => {
    try {
      const response = await fetch('/api/sync/engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });

      if (!response.ok) throw new Error('Failed to sync account');

      await fetchAccounts();
    } catch (err) {
      console.error('Sync failed', err);
      throw err;
    }
  }, [fetchAccounts]);

  const disconnectAccount = useCallback(async (accountId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('social_accounts')
        .update({ is_active: false })
        .eq('id', accountId)
        .eq('workspace_id', workspace?.id); // Extra safety

      if (error) throw error;

      await fetchAccounts();
    } catch (err) {
      console.error('Disconnect failed', err);
      throw err;
    }
  }, [fetchAccounts, workspace?.id]);

  return {
    accounts,
    loading,
    error,
    refetch: fetchAccounts,
    syncAccount,
    disconnectAccount
  };
}
