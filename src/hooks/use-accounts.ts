import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useHasHydrated, useSelectedWorkspace } from '@/store/workspaceStore';
import { fetchWithWorkspace, requireHydratedWorkspaceId } from '@/lib/fetch-with-workspace';
import type { SocialAccount, Platform } from '@/types';
export type { SocialAccount, Platform };

type AccountsApiResponse = {
  success: boolean;
  data?: {
    accounts?: SocialAccount[];
  };
  error?: {
    message?: string;
  };
};

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
  const hasHydrated = useHasHydrated();
  const workspaceId = workspace?.id;
  const requestIdRef = useRef(0);

  // Memoize options to prevent infinite loops if object is passed inline
  const optionsKey = JSON.stringify(platformOrOptions);
  const options = useMemo<UseAccountsOptions>(() => {
    if (!optionsKey) {
      return {};
    }

    const parsedOptions = JSON.parse(optionsKey) as Platform | UseAccountsOptions | null;
    if (!parsedOptions) {
      return {};
    }

    return typeof parsedOptions === 'string'
      ? { platform: parsedOptions }
      : parsedOptions;
  }, [optionsKey]);

  const fetchAccounts = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (!hasHydrated) {
      return;
    }

    if (!workspaceId) {
      setAccounts([]);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        workspaceId,
        limit: '100',
      });

      if (options.platform) {
        params.set('platform', options.platform);
      }

      if (options.status === 'active' || options.status === 'inactive') {
        params.set('status', options.status);
      } else if (!options.status) {
        // Preserve previous hook behavior: active accounts are the default view.
        params.set('status', 'active');
      }

      const response = await fetchWithWorkspace(`/api/accounts?${params.toString()}`, {
        method: 'GET',
        workspaceId,
        headers: { 'Accept': 'application/json' },
      });
      const payload = (await response.json()) as AccountsApiResponse;

      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message || 'Failed to fetch accounts');
      }

      // Map API response (nulls) to TypeScript interface (undefined)
      // This ensures compatibility with shared types
      const mappedAccounts: SocialAccount[] = (payload.data?.accounts || []).map((acc: any) => ({
        ...acc,
        account_handle: acc.account_handle || undefined,
        account_avatar: acc.account_avatar || undefined,
        token_expires_at: acc.token_expires_at || undefined,
        last_synced_at: acc.last_synced_at || undefined,
        metrics: acc.metrics || undefined,
        metadata: acc.metadata || undefined,
      }));

      if (requestId === requestIdRef.current) {
        setAccounts(mappedAccounts);
      }
    } catch (err) {
      console.error('[useAccounts] Error:', err);
      if (requestId === requestIdRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch accounts'));
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [hasHydrated, options, workspaceId]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const syncAccount = useCallback(async (accountId: string) => {
    try {
      const activeWorkspaceId = requireHydratedWorkspaceId(workspaceId);
      const response = await fetchWithWorkspace('/api/sync/engagement', {
        method: 'POST',
        workspaceId: activeWorkspaceId,
        body: JSON.stringify({ accountId, workspaceId: activeWorkspaceId }),
      });

      const payload = await response.json().catch(() => null) as AccountsApiResponse | null;

      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error?.message || 'Failed to sync account');
      }

      await fetchAccounts();
    } catch (err) {
      console.error('Sync failed', err);
      throw err;
    }
  }, [fetchAccounts, workspaceId]);

  const disconnectAccount = useCallback(async (accountId: string) => {
    try {
      const activeWorkspaceId = requireHydratedWorkspaceId(workspaceId);
      const params = new URLSearchParams({
        id: accountId,
        workspaceId: activeWorkspaceId,
      });

      const response = await fetchWithWorkspace(`/api/accounts?${params.toString()}`, {
        method: 'DELETE',
        workspaceId: activeWorkspaceId,
        headers: { 'Accept': 'application/json' },
      });
      const payload = await response.json().catch(() => null) as AccountsApiResponse | null;

      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error?.message || 'Failed to disconnect account');
      }

      await fetchAccounts();
    } catch (err) {
      console.error('Disconnect failed', err);
      throw err;
    }
  }, [fetchAccounts, workspaceId]);

  return {
    accounts,
    loading,
    error,
    refetch: fetchAccounts,
    syncAccount,
    disconnectAccount
  };
}
