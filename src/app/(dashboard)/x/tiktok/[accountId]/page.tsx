'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Music, ArrowLeft, RefreshCw, TrendingUp, Eye, Heart, Upload } from 'lucide-react';
import { toast } from 'sonner';

export default function TikTokProfilePage() {
    const params = useParams();
    const router = useRouter();
    const accountId = params.accountId as string;

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    const fetchProfileData = useCallback(async () => {
        try {
            setLoading(true);
            const [accountRes, postsRes] = await Promise.all([
                fetch(`/api/accounts/${accountId}`),
                fetch(`/api/posts?accountId=${accountId}&limit=20`),
            ]);

            if (!accountRes.ok) throw new Error('Failed to fetch account');

            const accountData = await accountRes.json();
            const postsData = postsRes.ok ? await postsRes.json() : { data: [] };

            setData({
                account: accountData.data,
                posts: postsData.data || [],
            });
        } catch (error: any) {
            toast.error('Failed to load profile data');
        } finally {
            setLoading(false);
        }
    }, [accountId]);

    useEffect(() => {
        if (accountId) {
            fetchProfileData();
        }
    }, [accountId, fetchProfileData]);

    const handleSync = async () => {
        try {
            setSyncing(true);
            const response = await fetch(`/api/tiktok/sync?accountId=${accountId}&type=full`, {
                method: 'POST',
            });

            if (!response.ok) throw new Error('Sync failed');

            toast.success('Profile synced successfully');
            await fetchProfileData();
        } catch (error: any) {
            toast.error('Failed to sync profile');
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

    const { account, posts } = data;

    const formatNumber = (num: number) => {
        if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
        if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
        return num.toString();
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.push('/x')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="h-16 w-16 rounded-full overflow-hidden bg-black relative">
                            {account.account_avatar ? (
                                <Image
                                    src={account.account_avatar}
                                    alt={account.account_name}
                                    width={64}
                                    height={64}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <Music className="h-8 w-8 text-white" />
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
                        onClick={() => router.push(`/x/tiktok/${accountId}/publish`)}
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Video
                    </Button>
                    <Button onClick={handleSync} disabled={syncing}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Syncing...' : 'Sync Profile'}
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Videos</CardTitle>
                        <Music className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatNumber(account.metadata?.video_count || 0)}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Followers</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatNumber(account.follower_count || 0)}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
                        <Heart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatNumber(account.metadata?.likes_count || 0)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex gap-4">
                <Button
                    className="flex-1"
                    onClick={() => router.push(`/x/tiktok/${accountId}/insights`)}
                >
                    View Detailed Insights
                </Button>
                <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push(`/x/tiktok/${accountId}/publish`)}
                >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload New Video
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Videos</CardTitle>
                    <CardDescription>Your latest TikTok videos</CardDescription>
                </CardHeader>
                <CardContent>
                    {posts.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                            No videos found. Sync your profile to import videos.
                        </p>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {posts.map((post: any) => (
                                <div
                                    key={post.id}
                                    className="aspect-[9/16] rounded-lg border overflow-hidden hover:shadow-lg transition-shadow"
                                >
                                    {post.content?.cover_image_url ? (
                                        <div className="relative h-full">
                                            <Image
                                                src={post.content.cover_image_url}
                                                alt={post.content?.title || 'Video'}
                                                fill
                                                className="object-cover"
                                            />
                                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent text-white">
                                                <p className="text-sm font-medium line-clamp-2">
                                                    {post.content?.title || post.content?.description || 'No title'}
                                                </p>
                                                <div className="flex items-center gap-3 mt-2 text-xs">
                                                    {post.post_analytics?.[0] && (
                                                        <>
                                                            <span className="flex items-center gap-1">
                                                                <Eye className="h-3 w-3" />
                                                                {formatNumber(post.post_analytics[0].views || 0)}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Heart className="h-3 w-3" />
                                                                {formatNumber(post.post_analytics[0].likes || 0)}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full flex items-center justify-center bg-muted">
                                            <Music className="h-12 w-12 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
