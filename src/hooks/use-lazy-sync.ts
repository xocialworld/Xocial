import { useState, useCallback, useRef } from 'react';
import { useSelectedWorkspace } from '@/store/workspaceStore';
import { useAccounts, type SocialAccount } from '@/hooks/use-accounts';
import { startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';

interface SyncStatus {
  accountId: string;
  platform: string;
  status: 'idle' | 'syncing' | 'success' | 'error';
  message?: string;
  syncedCount?: number;
}

interface UseLazySyncReturn {
  syncMonthRange: (targetMonth: Date) => Promise<void>;
  syncStatus: SyncStatus[];
  isSyncing: boolean;
  lastSyncedMonth: Date | null;
}

/**
 * Hook for lazy month-based syncing of external posts.
 * Triggers sync for the selected month + adjacent months when user navigates.
 */
export function useLazySync(): UseLazySyncReturn {
  const workspace = useSelectedWorkspace();
  const { accounts } = useAccounts();
  const [syncStatus, setSyncStatus] = useState<SyncStatus[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedMonth, setLastSyncedMonth] = useState<Date | null>(null);
  
  // Track which month ranges have been synced this session
  const syncedRangesRef = useRef<Set<string>>(new Set());

  const syncMonthRange = useCallback(async (targetMonth: Date) => {
    if (!workspace?.id || !accounts || accounts.length === 0) {
      return;
    }

    // Calculate range: target month + adjacent months
    const prevMonth = subMonths(targetMonth, 1);
    const nextMonth = addMonths(targetMonth, 1);
    
    const from = startOfMonth(prevMonth);
    const to = endOfMonth(nextMonth);
    
    // Create a range key to avoid duplicate syncs
    const rangeKey = `${from.toISOString().split('T')[0]}_${to.toISOString().split('T')[0]}`;
    
    // Skip if we've already synced this range this session
    if (syncedRangesRef.current.has(rangeKey)) {
      return;
    }

    setIsSyncing(true);
    setSyncStatus(
      accounts.map((acc: SocialAccount) => ({
        accountId: acc.id,
        platform: acc.platform,
        status: 'syncing' as const,
      }))
    );

    // Mark range as being synced
    syncedRangesRef.current.add(rangeKey);

    try {
      // Sync each connected account in parallel
      const syncPromises = accounts.map(async (account: SocialAccount) => {
        try {
          const response = await fetch(`/api/accounts/${account.id}/sync-range`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: from.toISOString(),
              to: to.toISOString(),
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            return {
              accountId: account.id,
              platform: account.platform,
              status: 'error' as const,
              message: data.error || 'Sync failed',
            };
          }

          // Check if it was cached (already synced)
          if (data.cached) {
            return {
              accountId: account.id,
              platform: account.platform,
              status: 'success' as const,
              message: 'Already synced',
              syncedCount: 0,
            };
          }

          return {
            accountId: account.id,
            platform: account.platform,
            status: 'success' as const,
            message: data.message,
            syncedCount: data.count,
          };
        } catch (error) {
          return {
            accountId: account.id,
            platform: account.platform,
            status: 'error' as const,
            message: error instanceof Error ? error.message : 'Network error',
          };
        }
      });

      const results = await Promise.all(syncPromises);
      setSyncStatus(results);
      setLastSyncedMonth(targetMonth);
    } finally {
      setIsSyncing(false);
    }
  }, [workspace?.id, accounts]);

  return {
    syncMonthRange,
    syncStatus,
    isSyncing,
    lastSyncedMonth,
  };
}

/**
 * Lightweight hook to check if a month range needs syncing
 */
export function useShouldSync(targetMonth: Date): boolean {
  const { accounts } = useAccounts();
  
  // If we have connected accounts and haven't synced recently, suggest sync
  if (!accounts || accounts.length === 0) return false;
  
  // Check if any account hasn't been synced in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  return accounts.some((account: SocialAccount) => {
    const lastSync = account.last_synced_at ? new Date(account.last_synced_at) : null;
    return !lastSync || lastSync < oneHourAgo;
  });
}

