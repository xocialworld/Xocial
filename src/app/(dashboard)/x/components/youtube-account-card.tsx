"use client";

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, ExternalLink, Trash2, Users, Video, Eye } from 'lucide-react';
import { SocialAccount } from '@/hooks/use-accounts';
import { useYouTubeStats } from '@/hooks/use-youtube-stats';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface YouTubeAccountCardProps {
    account: SocialAccount;
    onDisconnect?: (accountId: string) => void;
    onRefresh?: () => void;
}

export function YouTubeAccountCard({ account, onDisconnect, onRefresh }: YouTubeAccountCardProps) {
    const { stats, loading, refetch } = useYouTubeStats(account.id);
    const [syncing, setSyncing] = useState(false);

    const handleSync = async () => {
        setSyncing(true);
        try {
            await refetch();
            toast.success('YouTube channel synced successfully');
            onRefresh?.();
        } catch (error) {
            toast.error('Failed to sync YouTube channel');
        } finally {
            setSyncing(false);
        }
    };

    const handleDisconnect = () => {
        if (window.confirm(`Disconnect ${account.account_name}?`)) {
            onDisconnect?.(account.id);
        }
    };

    const subscriberCount = stats?.subscriberCount || account.metadata?.subscriber_count || account.follower_count || 0;
    const videoCount = stats?.videoCount || account.metadata?.video_count || 0;
    const viewCount = stats?.viewCount || account.metadata?.view_count || 0;
    const customUrl = account.metadata?.custom_url || account.account_handle;

    return (
        <Card className="overflow-hidden">
            {/* YouTube Brand Header */}
            <div className="bg-gradient-to-br from-[#FF0000] via-[#E60000] to-[#CC0000] p-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        {account.account_avatar ? (
                            <Image
                                src={account.account_avatar}
                                alt={account.account_name}
                                width={64}
                                height={64}
                                className="rounded-full border-2 border-white shadow-lg"
                            />
                        ) : (
                            <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
                                <Video className="h-8 w-8 text-white" />
                            </div>
                        )}
                        <div>
                            <h3 className="text-xl font-bold text-white">{account.account_name}</h3>
                            {customUrl && (
                                <p className="text-sm text-white/80">@{customUrl.replace('@', '')}</p>
                            )}
                            <Badge variant="secondary" className="mt-1 bg-white/20 text-white border-white/30">
                                YouTube
                            </Badge>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleSync}
                            disabled={syncing || loading}
                            className="text-white hover:bg-white/20"
                        >
                            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(`https://studio.youtube.com/channel/${account.account_id}`, '_blank')}
                            className="text-white hover:bg-white/20"
                        >
                            <ExternalLink className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="p-6">
                {loading ? (
                    <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="space-y-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-8 w-full" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                <Users className="h-4 w-4" />
                                <span>Subscribers</span>
                            </div>
                            <p className="text-2xl font-bold">{subscriberCount.toLocaleString()}</p>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                <Video className="h-4 w-4" />
                                <span>Videos</span>
                            </div>
                            <p className="text-2xl font-bold">{videoCount.toLocaleString()}</p>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                <Eye className="h-4 w-4" />
                                <span>Total Views</span>
                            </div>
                            <p className="text-2xl font-bold">{viewCount.toLocaleString()}</p>
                        </div>
                    </div>
                )}

                {/* Last Synced */}
                {account.last_synced_at && (
                    <p className="text-xs text-muted-foreground mt-4">
                        Last synced: {new Date(account.last_synced_at).toLocaleString()}
                    </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDisconnect}
                        className="flex-1"
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Disconnect
                    </Button>
                </div>
            </div>
        </Card>
    );
}
