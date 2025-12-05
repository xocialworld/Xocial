'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Youtube, RefreshCw, Trash2, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface YouTubeAccountCardProps {
    account: {
        id: string;
        account_name: string;
        account_handle: string;
        account_avatar: string;
        follower_count: number;
        is_active: boolean;
        token_expires_at: string;
        last_synced_at?: string;
        metadata?: {
            subscriber_count?: number;
            video_count?: number;
            view_count?: number;
        };
    };
    onDisconnect?: (accountId: string) => void;
    onSync?: (accountId: string) => void;
}

/**
 * YouTubeAccountCard Component
 * 
 * Displays YouTube channel information with status indicators and actions.
 * Shows different states: Active, Token Expiring, Disconnected, Syncing.
 */
export function YouTubeAccountCard({ account, onDisconnect, onSync }: YouTubeAccountCardProps) {
    const [isSyncing, setIsSyncing] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);

    // Check token expiration status
    const tokenExpiresAt = new Date(account.token_expires_at);
    const now = new Date();
    const hoursUntilExpiry = (tokenExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    const isExpired = hoursUntilExpiry <= 0;
    const isExpiringSoon = hoursUntilExpiry > 0 && hoursUntilExpiry < 24;

    // Determine account status
    const getAccountStatus = () => {
        if (isExpired || !account.is_active) {
            return { label: 'Disconnected', variant: 'error' as const, icon: AlertCircle };
        }
        if (isExpiringSoon) {
            return { label: 'Token Expiring', variant: 'warning' as const, icon: AlertCircle };
        }
        return { label: 'Active', variant: 'success' as const, icon: Youtube };
    };

    const status = getAccountStatus();
    const StatusIcon = status.icon;

    // Format numbers
    const formatNumber = (num: number) => {
        if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
        if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
        return num.toString();
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const response = await fetch(`/api/youtube/sync?accountId=${account.id}&type=full`, {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error('Sync failed');
            }

            toast.success('YouTube data synced successfully');
            onSync?.(account.id);
        } catch (error) {
            console.error('Sync error:', error);
            toast.error('Failed to sync YouTube data');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm(`Are you sure you want to disconnect ${account.account_name}?`)) {
            return;
        }

        setIsDisconnecting(true);
        try {
            const response = await fetch(`/api/accounts/${account.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Disconnect failed');
            }

            toast.success('YouTube account disconnected');
            onDisconnect?.(account.id);
        } catch (error) {
            console.error('Disconnect error:', error);
            toast.error('Failed to disconnect YouTube account');
        } finally {
            setIsDisconnecting(false);
        }
    };

    const subscriberCount = account.metadata?.subscriber_count || account.follower_count;
    const videoCount = account.metadata?.video_count || 0;
    const viewCount = account.metadata?.view_count || 0;

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center space-x-3">
                    <div className="relative h-12 w-12 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                        {account.account_avatar ? (
                            <Image
                                src={account.account_avatar}
                                alt={account.account_name}
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <Youtube className="h-6 w-6 text-red-600" />
                        )}
                    </div>
                    <div>
                        <CardTitle className="text-base font-semibold">
                            {account.account_name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            {account.account_handle}
                        </p>
                    </div>
                </div>
                <Badge variant={status.variant} className="flex items-center gap-1">
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                </Badge>
            </CardHeader>

            <CardContent>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold">{formatNumber(subscriberCount)}</div>
                        <div className="text-xs text-muted-foreground">Subscribers</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold">{formatNumber(videoCount)}</div>
                        <div className="text-xs text-muted-foreground">Videos</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold">{formatNumber(viewCount)}</div>
                        <div className="text-xs text-muted-foreground">Views</div>
                    </div>
                </div>

                {/* Warning message for expired/expiring tokens */}
                {(isExpired || isExpiringSoon) && (
                    <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            {isExpired
                                ? 'Access token has expired. Reconnect your account to continue.'
                                : 'Access token expires soon. It will be automatically refreshed.'}
                        </p>
                    </div>
                )}

                {/* Last synced info */}
                {account.last_synced_at && (
                    <div className="text-xs text-muted-foreground mb-4">
                        Last synced: {new Date(account.last_synced_at).toLocaleString()}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSync}
                        disabled={isSyncing || isExpired}
                        className="flex-1"
                    >
                        <RefreshCw className={`h-4 w-4 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Syncing...' : 'Sync'}
                    </Button>

                    <Link href={`/x/youtube/${account.id}`}>
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                        >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Details
                        </Button>
                    </Link>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDisconnect}
                        disabled={isDisconnecting}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
