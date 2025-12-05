'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Heart, Repeat, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

export function TwitterAnalytics() {
    const params = useParams();
    const accountId = params.accountId as string;

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('30');

    const fetchAnalytics = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/twitter/analytics?accountId=${accountId}&days=${timeRange}`);
            if (!response.ok) throw new Error('Failed to fetch analytics');
            const result = await response.json();
            setData(result.data);
        } catch (error: any) {
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

    if (loading || !data) {
        return <div className="text-center py-8">Loading analytics...</div>;
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
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
                        <Heart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatNumber(data.totals?.likes || 0)}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Retweets</CardTitle>
                        <Repeat className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatNumber(data.totals?.retweets || 0)}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Replies</CardTitle>
                        <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatNumber(data.totals?.replies || 0)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Top Performing Tweets</CardTitle>
                    <CardDescription>Based on engagement</CardDescription>
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
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">
                                            {post.content?.text?.slice(0, 60) || 'No text'}
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
                                        <Heart className="h-4 w-4 text-muted-foreground" />
                                        <span>{formatNumber(post.analytics?.likes || 0)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Repeat className="h-4 w-4 text-muted-foreground" />
                                        <span>{formatNumber(post.analytics?.retweets || 0)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
