/**
 * Real-time Account Sync Hook
 * Based on Xocial SRS Section 3.1.5
 * Subscribes to Supabase real-time updates for social accounts
 */

'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { SocialAccount } from '@/types';

interface UseAccountSyncOptions {
    workspaceId?: string;
    onAccountUpdate?: (account: SocialAccount) => void;
    onAccountDelete?: (accountId: string) => void;
    onAccountInsert?: (account: SocialAccount) => void;
}

export function useAccountSync({
    workspaceId,
    onAccountUpdate,
    onAccountDelete,
    onAccountInsert,
}: UseAccountSyncOptions = {}) {
    useEffect(() => {
        if (!workspaceId) return;

        const supabase = createClient();

        // Subscribe to social_accounts table changes
        const channel = supabase
            .channel(`accounts:${workspaceId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'social_accounts',
                    filter: `workspace_id=eq.${workspaceId}`,
                },
                (payload) => {
                    const newAccount = payload.new as SocialAccount;
                    console.log('[Real-time] Account connected:', newAccount);

                    toast.success(
                        `${newAccount.account_name} connected successfully`,
                        {
                            description: `${newAccount.platform} account is now active`,
                        }
                    );

                    onAccountInsert?.(newAccount);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'social_accounts',
                    filter: `workspace_id=eq.${workspaceId}`,
                },
                (payload) => {
                    const updatedAccount = payload.new as SocialAccount;
                    const oldAccount = payload.old as SocialAccount;

                    console.log('[Real-time] Account updated:', updatedAccount);

                    // Show notification for significant changes
                    if (oldAccount.is_active && !updatedAccount.is_active) {
                        toast.warning(
                            `${updatedAccount.account_name} disconnected`,
                            {
                                description: 'Please reconnect your account to continue posting',
                            }
                        );
                    } else if (!oldAccount.is_active && updatedAccount.is_active) {
                        toast.success(
                            `${updatedAccount.account_name} reconnected`,
                            {
                                description: 'Your account is now active',
                            }
                        );
                    } else if (updatedAccount.last_synced_at !== oldAccount.last_synced_at) {
                        toast.info(
                            `${updatedAccount.account_name} synced`,
                            {
                                description: 'Latest analytics data has been fetched',
                            }
                        );
                    }

                    onAccountUpdate?.(updatedAccount);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'social_accounts',
                    filter: `workspace_id=eq.${workspaceId}`,
                },
                (payload) => {
                    const deletedAccount = payload.old as SocialAccount;
                    console.log('[Real-time] Account deleted:', deletedAccount);

                    toast.info(
                        `${deletedAccount.account_name} disconnected`,
                        {
                            description: 'Account has been removed from your workspace',
                        }
                    );

                    onAccountDelete?.(deletedAccount.id);
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('[Real-time] Subscribed to account updates');
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('[Real-time] Channel error');
                    toast.error('Real-time sync error', {
                        description: 'Unable to connect to real-time updates',
                    });
                }
            });

        // Cleanup subscription on unmount
        return () => {
            console.log('[Real-time] Unsubscribing from account updates');
            supabase.removeChannel(channel);
        };
    }, [workspaceId, onAccountUpdate, onAccountDelete, onAccountInsert]);
}

/**
 * Real-time Posts Sync Hook
 * Subscribes to post updates for a specific account
 */
export function usePostsSync({
    accountId,
    onPostUpdate,
    onPostDelete,
    onPostInsert,
}: {
    accountId?: string;
    onPostUpdate?: (post: any) => void;
    onPostDelete?: (postId: string) => void;
    onPostInsert?: (post: any) => void;
} = {}) {
    useEffect(() => {
        if (!accountId) return;

        const supabase = createClient();

        const channel = supabase
            .channel(`posts:${accountId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'posts',
                    filter: `social_account_id=eq.${accountId}`,
                },
                (payload) => {
                    console.log('[Real-time] New post:', payload.new);
                    onPostInsert?.(payload.new);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'posts',
                    filter: `social_account_id=eq.${accountId}`,
                },
                (payload) => {
                    console.log('[Real-time] Post updated:', payload.new);
                    onPostUpdate?.(payload.new);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'posts',
                    filter: `social_account_id=eq.${accountId}`,
                },
                (payload) => {
                    console.log('[Real-time] Post deleted:', payload.old);
                    onPostDelete?.((payload.old as any).id);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [accountId, onPostUpdate, onPostDelete, onPostInsert]);
}
