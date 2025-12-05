'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Eye, ThumbsUp, MessageSquare, Users } from 'lucide-react';
import { toast } from 'sonner';

interface AnalyticsData {
    channel: {
        subscriberCount: number;
        videoCount: number;
        viewCount: number;
    };
    videos: Array<{
        id: string;
        title: string;
        published_at: string;
        analytics: {
            video_views: number;
            likes: number;
            comments: number;
            engagement_rate: number;
        };
    }>;
    trends: {
        viewsTrend: number;
        likesTrend: number;
        commentsTrend: number;
        subscribersTrend: number;
    };
}

export function YouTubeAnalytics() {
    const params = useParams();
    const accountId = params.accountId as string;

    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('30'); // days

    const fetchAnalytics = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/youtube/analytics?accountId=${accountId}&days=${timeRange}`);
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
            {/* Time Range Selector */}
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
                        <SelectItem value="365">Last Year</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Metrics Cards with Trends */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatNumber(data.channel.viewCount)}
                        </div>
                        {formatTrend(data.trends.viewsTrend)}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatNumber(data.channel.subscriberCount)}
                        </div>
                        {formatTrend(data.trends.subscribersTrend)}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
                        <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatNumber(
                                data.videos.reduce((sum, v) => sum + (v.analytics?.likes || 0), 0)
                            )}
                        </div>
                        {formatTrend(data.trends.likesTrend)}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatNumber(
                                data.videos.reduce((sum, v) => sum + (v.analytics?.comments || 0), 0)
                            )}
                        </div>
                        {formatTrend(data.trends.commentsTrend)}
                    </CardContent>
                </Card>
            </div>

            {/* Top Performing Videos */}
            <Card>
                <CardHeader>
                    <CardTitle>Top Performing Videos</CardTitle>
                    <CardDescription>Based on views in the selected time period</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {data.videos
                            .sort((a, b) => (b.analytics?.video_views || 0) - (a.analytics?.video_views || 0))
                            .slice(0, 10)
                            .map((video, index) => (
                                <div
                                    key={video.id}
                                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{video.title}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(video.published_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 text-sm">
                                        <div className="flex items-center gap-1">
                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                            <span>{formatNumber(video.analytics?.video_views || 0)}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                                            <span>{formatNumber(video.analytics?.likes || 0)}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                            <span>{formatNumber(video.analytics?.comments || 0)}</span>
                                        </div>
                                        <div className="text-muted-foreground">
                                            {(video.analytics?.engagement_rate || 0).toFixed(2)}%
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </CardContent>
            </Card>

            {/* Engagement Breakdown */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Average Engagement Rate</CardTitle>
                        <CardDescription>Likes + Comments / Views</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">
                            {(
                                data.videos.reduce((sum, v) => sum + (v.analytics?.engagement_rate || 0), 0) /
                                Math.max(data.videos.length, 1)
                            ).toFixed(2)}%
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                            Across {data.videos.length} videos
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Average Views per Video</CardTitle>
                        <CardDescription>Total views / Total videos</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">
                            {formatNumber(
                                data.videos.reduce((sum, v) => sum + (v.analytics?.video_views || 0), 0) /
                                Math.max(data.videos.length, 1)
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                            Based on {data.videos.length} videos
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
