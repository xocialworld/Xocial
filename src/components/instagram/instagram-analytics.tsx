'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Eye, ThumbsUp, MessageSquare, Bookmark } from 'lucide-react';
import { toast } from 'sonner';

export function InstagramAnalytics() {
    const params = useParams();
    const accountId = params.accountId as string;

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('30');

    const fetchAnalytics = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/instagram/analytics?accountId=${accountId}&days=${timeRange}`);
            if (!response.ok) throw new Error('Failed to fetch analytics');
            const result = await response.json();
            setData(result.data);
        } catch (error: any) {
            console.error('Analytics error:', error);
            toast.error('Failed to load analytics');
        } finally {
            setLoading(false);
        }
    }, [accountId, timeRange]);

    useEffect(() => {
        if (accountId) {
            fetchAnalytics();
        }
    }, [accountId, timeRange, fetchAnalytics]);

    const formatNumber = (num: number) => {
        if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
        if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
        return num.toString();
    };

    const formatTrend = (trend: number) => {
        const isPositive = trend >= 0;
        const Icon = isPositive ? TrendingUp : TrendingDown;
        const color = isPositive ? 'text-green-600' : 'text-red-600';

        return (
            <div className={`flex items-center gap-1 text-sm ${color}`}>
                <Icon className="h-4 w-4" />
                <span>{Math.abs(trend).toFixed(1)}%</span>
            </div>
        );
    };

    if (loading || !data) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Performance Analytics</h2>
                <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7">Last 7 Days</SelectItem>
                        <SelectItem value="30">Last 30 Days</SelectItem>
                        <SelectItem value="90">Last 90 Days</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatNumber(data.totals?.impressions || 0)}
                        </div>
                        {data.trends && formatTrend(data.trends.impressionsTrend || 0)}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Reach</CardTitle>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatNumber(data.totals?.reach || 0)}
                        </div>
                        {data.trends && formatTrend(data.trends.reachTrend || 0)}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Engagement</CardTitle>
                        <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatNumber(data.totals?.engagement || 0)}
                        </div>
                        {data.trends && formatTrend(data.trends.engagementTrend || 0)}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Saves</CardTitle>
                        <Bookmark className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatNumber(data.totals?.saves || 0)}
                        </div>
                        {data.trends && formatTrend(data.trends.savesTrend || 0)}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Top Performing Posts</CardTitle>
                    <CardDescription>Based on engagement in the selected time period</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {data.posts?.slice(0, 10).map((post: any, index: number) => (
                            <div
                                key={post.id}
                                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                                        {index + 1}
                                    </div>
                                    {post.content?.media_url && (
                                        <div className="relative h-12 w-12 rounded overflow-hidden flex-shrink-0">
                                            <Image
                                                src={post.content.media_url}
                                                alt=""
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">
                                            {post.content?.caption?.slice(0, 50) || 'No caption'}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {new Date(post.published_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 text-sm">
                                    <div className="flex items-center gap-1">
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                        <span>{formatNumber(post.analytics?.impressions || 0)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                                        <span>{formatNumber(post.analytics?.likes || 0)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                        <span>{formatNumber(post.analytics?.comments || 0)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Average Engagement Rate</CardTitle>
                        <CardDescription>Engagement / Reach</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">
                            {data.average?.engagementRate?.toFixed(2) || '0.00'}%
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                            Across {data.posts?.length || 0} posts
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Average Impressions per Post</CardTitle>
                        <CardDescription>Total impressions / Total posts</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">
                            {formatNumber(data.average?.impressionsPerPost || 0)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                            Based on {data.posts?.length || 0} posts
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
