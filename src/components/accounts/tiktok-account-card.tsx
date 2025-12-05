'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Music, AlertCircle, RefreshCw, ExternalLink, TrashIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface TikTokAccountCardProps {
    account: {
        id: string;
        account_name: string;
        account_handle: string;
        account_avatar?: string;
        follower_count: number;
        is_active: boolean;
        token_expires_at?: string;
        last_synced_at?: string;
        metadata?: {
            following_count?: number;
            video_count?: number;
            likes_count?: number;
        };
    };
    onSync?: (id: string) => void;
    onDisconnect?: (id: string) => void;
    className?: string;
}

export function TikTokAccountCard({
    account,
    onSync,
    onDisconnect,
    className,
}: TikTokAccountCardProps) {
    const router = useRouter();
    const [syncing, setSyncing] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);

    const handleSync = async () => {
        setSyncing(true);
        try {
            const response = await fetch(`/api/tiktok/sync?accountId=${account.id}&type=full`, {
                method: 'POST',
            });
            if (!response.ok) throw new Error('Sync failed');
            toast.success('TikTok account synced successfully');
            onSync?.(account.id);
        } catch (error) {
            toast.error('Failed to sync TikTok account');
        } finally {
            setSyncing(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Are you sure you want to disconnect this TikTok account?')) {
            return;
        }
        setDisconnecting(true);
        try {
            const response = await fetch(`/api/accounts/${account.id}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Disconnect failed');
            toast.success('TikTok account disconnected');
            onDisconnect?.(account.id);
        } catch (error) {
            toast.error('Failed to disconnect TikTok account');
        } finally {
            setDisconnecting(false);
        }
    };

    const tokenExpiresAt = account.token_expires_at ? new Date(account.token_expires_at) : null;
    const now = new Date();
    const isExpired = tokenExpiresAt ? tokenExpiresAt < now : false;

    const getAccountStatus = () => {
        if (isExpired || !account.is_active) {
            return { label: 'Disconnected', variant: 'error' as const, icon: AlertCircle };
        }
        return { label: 'Active', variant: 'success' as const, icon: Music };
    };

    const status = getAccountStatus();
    const StatusIcon = status.icon;

    const formatNumber = (num: number) => {
        if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
        if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
        return num.toString();
    };

    return (
        <Card className={className}>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-full overflow-hidden bg-black flex items-center justify-center">
                            {account.account_avatar ? (
                                <Image
                                    src={account.account_avatar}
                                    alt={account.account_name}
                                    width={48}
                                    height={48}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <Music className="h-6 w-6 text-white" />
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">{account.account_name}</h3>
                            <p className="text-sm text-muted-foreground">@{account.account_handle}</p>
                        </div>
                    </div>
                    <Badge variant={status.variant} className="gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-2xl font-bold">
                            {formatNumber(account.metadata?.video_count || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">Videos</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold">
                            {formatNumber(account.follower_count || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">Followers</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold">
                            {formatNumber(account.metadata?.likes_count || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">Likes</p>
                    </div>
                </div>

                {account.last_synced_at && (
                    <p className="text-xs text-muted-foreground">
                        Last synced: {new Date(account.last_synced_at).toLocaleString()}
                    </p>
                )}

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={handleSync}
                        disabled={syncing}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Syncing...' : 'Sync'}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => router.push(`/x/tiktok/${account.id}`)}
                    >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Details
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDisconnect}
                        disabled={disconnecting}
                    >
                        <TrashIcon className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
