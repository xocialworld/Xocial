'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThumbsUp, MessageSquare, Share2, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithWorkspace } from '@/lib/fetch-with-workspace';
import { useSelectedWorkspace } from '@/store/workspaceStore';

export function LinkedInEngagement() {
    const params = useParams();
    const accountId = params.accountId as string;
    const selectedWorkspace = useSelectedWorkspace();

    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchEngagement = useCallback(async () => {
        if (!selectedWorkspace?.id) return;

        try {
            setLoading(true);
            const response = await fetchWithWorkspace(
                `/api/posts?account_id=${encodeURIComponent(accountId)}&limit=50`,
                { workspaceId: selectedWorkspace.id }
            );
            if (!response.ok) throw new Error('Failed to fetch posts');
            const result = await response.json();
            setPosts(result.data?.posts || result.posts || []);
        } catch (error: any) {
            toast.error('Failed to load engagement data');
        } finally {
            setLoading(false);
        }
    }, [accountId, selectedWorkspace?.id]);

    useEffect(() => {
        if (accountId) {
            fetchEngagement();
        }
    }, [accountId, fetchEngagement]);

    const filteredPosts = posts.filter((post) => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return post.content?.text?.toLowerCase().includes(query);
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
                        Post Engagement
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        {posts.length} posts
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
                    placeholder="Search posts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            <div className="space-y-4">
                {filteredPosts.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            No posts found
                        </CardContent>
                    </Card>
                ) : (
                    filteredPosts.map((post) => (
                        <Card key={post.id}>
                            <CardContent className="pt-6 space-y-4">
                                <div>
                                    <p className="text-sm">{post.content?.text}</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {new Date(post.published_at).toLocaleString()}
                                    </p>
                                </div>
                                <div className="flex items-center gap-6 text-sm">
                                    <div className="flex items-center gap-1">
                                        <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                                        <span>{formatNumber(post.post_analytics?.[0]?.likes || 0)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                        <span>{formatNumber(post.post_analytics?.[0]?.comments || 0)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Share2 className="h-4 w-4 text-muted-foreground" />
                                        <span>{formatNumber(post.post_analytics?.[0]?.shares || 0)}</span>
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
