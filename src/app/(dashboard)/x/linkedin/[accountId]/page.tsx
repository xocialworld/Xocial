'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Linkedin, ArrowLeft, RefreshCw, TrendingUp, Eye, ThumbsUp, MessageSquare, Share2, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function LinkedInProfilePage() {
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
            const response = await fetch(`/api/linkedin/sync?accountId=${accountId}&type=full`, {
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
                        <div className="h-16 w-16 rounded-full overflow-hidden bg-[#0A66C2] relative">
                            {account.account_avatar ? (
                                <Image
                                    src={account.account_avatar}
                                    alt={account.account_name}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <Linkedin className="h-8 w-8 text-white" />
                                </div>
                            )}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">{account.account_name}</h1>
                            <p className="text-muted-foreground">{account.account_handle}</p>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => router.push(`/x/linkedin/${accountId}/publish`)}
                    >
                        <Send className="h-4 w-4 mr-2" />
                        Create Post
                    </Button>
                    <Button onClick={handleSync} disabled={syncing}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Syncing...' : 'Sync Profile'}
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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
                        <CardTitle className="text-sm font-medium">Connections</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatNumber(account.metadata?.connections_count || 0)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex gap-4">
                <Button
                    className="flex-1"
                    onClick={() => router.push(`/x/linkedin/${accountId}/insights`)}
                >
                    View Detailed Insights
                </Button>
                <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push(`/x/linkedin/${accountId}/publish`)}
                >
                    <Send className="h-4 w-4 mr-2" />
                    Create New Post
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Posts</CardTitle>
                    <CardDescription>Your latest LinkedIn posts</CardDescription>
                </CardHeader>
                <CardContent>
                    {posts.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                            No posts found. Sync your profile to import posts.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {posts.map((post: any) => (
                                <div
                                    key={post.id}
                                    className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                                >
                                    <p className="font-medium">
                                        {post.content?.text || 'No text'}
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
                                                <div className="flex items-center gap-1">
                                                    <Share2 className="h-4 w-4" />
                                                    <span>{formatNumber(post.post_analytics[0].shares || 0)}</span>
                                                </div>
                                            </>
                                        )}
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
