'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Heart, MessageSquare, Share2, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';

export function TikTokEngagement() {
    const params = useParams();
    const accountId = params.accountId as string;

    const [videos, setVideos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchEngagement = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/posts?accountId=${accountId}&limit=50`);
            if (!response.ok) throw new Error('Failed to fetch videos');
            const result = await response.json();
            setVideos(result.data || []);
        } catch (error: any) {
            toast.error('Failed to load engagement data');
        } finally {
            setLoading(false);
        }
    }, [accountId]);

    useEffect(() => {
        if (accountId) {
            fetchEngagement();
        }
    }, [accountId, fetchEngagement]);

    const filteredVideos = videos.filter((video) => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                video.content?.title?.toLowerCase().includes(query) ||
                video.content?.description?.toLowerCase().includes(query)
            );
        }
        return true;
    });

    const formatNumber = (num: number) => {
        if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
        if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
        return num.toString();
    };

    if (loading) {
        return <div className="text-center py-8">Loading engagement data...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <MessageSquare className="h-6 w-6" />
                        Video Engagement
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        {videos.length} videos
                    </p>
                </div>
                <Button onClick={fetchEngagement} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search videos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            <div className="space-y-4">
                {filteredVideos.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            No videos found
                        </CardContent>
                    </Card>
                ) : (
                    filteredVideos.map((video) => (
                        <Card key={video.id}>
                            <CardContent className="pt-6 space-y-4">
                                <div>
                                    <p className="font-medium">{video.content?.title || 'No title'}</p>
                                    {video.content?.description && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {video.content.description}
                                        </p>
                                    )}
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {new Date(video.published_at).toLocaleString()}
                                    </p>
                                </div>
                                <div className="flex items-center gap-6 text-sm">
                                    <div className="flex items-center gap-1">
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                        <span>{formatNumber(video.post_analytics?.[0]?.views || 0)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Heart className="h-4 w-4 text-muted-foreground" />
                                        <span>{formatNumber(video.post_analytics?.[0]?.likes || 0)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                        <span>{formatNumber(video.post_analytics?.[0]?.comments || 0)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Share2 className="h-4 w-4 text-muted-foreground" />
                                        <span>{formatNumber(video.post_analytics?.[0]?.shares || 0)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
