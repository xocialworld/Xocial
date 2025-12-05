import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export type Platform = 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube';

export interface SocialAccount {
    id: string;
    workspace_id: string;
    platform: Platform;
    account_id: string;
    account_name: string;
    account_avatar: string | null;
    account_handle: string | null;
    follower_count: number;
    access_token: string;
    refresh_token: string | null;
    token_expires_at: string | null;
    connected_at: string;
    last_synced_at: string | null;
    is_active: boolean;
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}

interface UseAccountsReturn {
    accounts: SocialAccount[];
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage social accounts
 * @param platform - Optional platform filter
 */
export function useAccounts(platform?: Platform): UseAccountsReturn {
    const [accounts, setAccounts] = useState<SocialAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchAccounts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const supabase = createClient();

            // Get current user's workspace
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Fetch workspace
            const { data: workspace, error: workspaceError } = await supabase
                .from('workspaces')
                .select('id')
                .eq('owner_id', user.id)
                .single();

            if (workspaceError) throw workspaceError;

            // Build query
            let query = supabase
                .from('social_accounts')
                .select('*')
                .eq('workspace_id', workspace.id)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            // Apply platform filter if provided
            if (platform) {
                query = query.eq('platform', platform);
            }

            const { data, error: fetchError } = await query;

            if (fetchError) throw fetchError;

            setAccounts(data || []);
        } catch (err) {
            console.error('[useAccounts] Error:', err);
            setError(err instanceof Error ? err : new Error('Failed to fetch accounts'));
        } finally {
            setLoading(false);
        }
    }, [platform]);

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    return {
        accounts,
        loading,
        error,
        refetch: fetchAccounts,
    };
}
