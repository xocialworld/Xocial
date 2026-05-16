'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Instagram, ArrowLeft, RefreshCw, TrendingUp, Eye, ThumbsUp, MessageSquare, Image as ImageIcon, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithWorkspace } from '@/lib/fetch-with-workspace';
import { useSelectedWorkspace } from '@/store/workspaceStore';

interface ChannelData {
    account: any;
    posts: any[];
    stats: {
        followers: number;
        following: number;
        media_count: number;
    };
}

export default function InstagramChannelPage() {
    const params = useParams();
    const router = useRouter();
    const accountId = params.accountId as string;
    const selectedWorkspace = useSelectedWorkspace();

    const [data, setData] = useState<ChannelData | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    const fetchChannelData = useCallback(async () => {
        if (!selectedWorkspace?.id) return;

        try {
            setLoading(true);
            const workspaceFetchOptions = { workspaceId: selectedWorkspace.id };
            const [accountRes, postsRes] = await Promise.all([
                fetchWithWorkspace(`/api/accounts/${accountId}`, workspaceFetchOptions),
                fetchWithWorkspace(`/api/posts?account_id=${encodeURIComponent(accountId)}&limit=20`, workspaceFetchOptions),
            ]);

            if (!accountRes.ok) throw new Error('Failed to fetch account');

            const accountData = await accountRes.json();
            const postsData = postsRes.ok ? await postsRes.json() : { data: [] };

            setData({
                account: accountData.data,
                posts: postsData.data?.posts || postsData.posts || [],
                stats: {
                    followers: accountData.data.metadata?.followers_count || accountData.data.follower_count || 0,
                    following: accountData.data.metadata?.follows_count || 0,
                    media_count: accountData.data.metadata?.media_count || 0,
                },
            });
        } catch (error: any) {
            console.error('Error fetching channel data:', error);
            toast.error('Failed to load channel data');
        } finally {
            setLoading(false);
        }
    }, [accountId, selectedWorkspace?.id]);

    useEffect(() => {
        if (accountId) {
            fetchChannelData();
        }
    }, [accountId, fetchChannelData]);

    const handleSync = async () => {
        try {
            setSyncing(true);
            const response = await fetch(`/api/instagram/sync?accountId=${accountId}&type=full`, {
                method: 'POST',
            });

            if (!response.ok) throw new Error('Sync failed');

            toast.success('Channel synced successfully');
            await fetchChannelData();
        } catch (error: any) {
            console.error('Sync error:', error);
            toast.error('Failed to sync channel');
        } finally {
            setSyncing(false);
        }
    };

    if (loading || !data) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    const { account, posts, stats } = data;

    const formatNumber = (num: number) => {
        if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
        if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
        return num.toString();
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.push('/x')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="h-16 w-16 rounded-full overflow-hidden bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 relative">
                            {account.account_avatar ? (
                                <Image
                                    src={account.account_avatar}
                                    alt={account.account_name}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <Instagram className="h-8 w-8 text-white" />
                                </div>
                            )}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">{account.account_name}</h1>
                            <p className="text-muted-foreground">@{account.account_handle}</p>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => router.push(`/x/instagram/${accountId}/publish`)}
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        Publish Post
                    </Button>
                    <Button onClick={handleSync} disabled={syncing}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Syncing...' : 'Sync Account'}
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Followers</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(stats.followers)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Following</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(stats.following)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Posts</CardTitle>
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(stats.media_count)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-4">
                <Button
                    className="flex-1"
                    onClick={() => router.push(`/x/instagram/${accountId}/insights`)}
                >
                    View Detailed Insights
                </Button>
                <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push(`/x/instagram/${accountId}/publish`)}
                >
                    <Upload className="h-4 w-4 mr-2" />
                    Publish New Post
                </Button>
            </div>

            {/* Recent Posts */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Posts</CardTitle>
                    <CardDescription>Your latest Instagram posts</CardDescription>
                </CardHeader>
                <CardContent>
                    {posts.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                            No posts found. Sync your account to import posts.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {posts.map((post) => (
                                <div
                                    key={post.id}
                                    className="flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                                >
                                    {post.content?.media_url && (
                                        <div className="h-20 w-20 rounded overflow-hidden flex-shrink-0 relative">
                                            <Image
                                                src={post.content.media_url}
                                                alt="Post media"
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium line-clamp-2">
                                            {post.content?.caption || 'No caption'}
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {new Date(post.published_at).toLocaleString()}
                                        </p>
                                        <div className="flex items-center gap-4 mt-2 text-sm">
                                            {post.post_analytics?.[0] && (
                                                <>
                                                    <div className="flex items-center gap-1">
                                                        <Eye className="h-4 w-4" />
                                                        <span>{formatNumber(post.post_analytics[0].impressions || 0)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <ThumbsUp className="h-4 w-4" />
                                                        <span>{formatNumber(post.post_analytics[0].likes || 0)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <MessageSquare className="h-4 w-4" />
                                                        <span>{formatNumber(post.post_analytics[0].comments || 0)}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
