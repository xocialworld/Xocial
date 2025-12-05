'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, ThumbsUp, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';

export function FacebookComments() {
    const params = useParams();
    const accountId = params.accountId as string;

    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchComments = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/facebook/comments?accountId=${accountId}`);
            if (!response.ok) throw new Error('Failed to fetch comments');
            const result = await response.json();
            setComments(result.data || []);
        } catch (error: any) {
            toast.error('Failed to load comments');
        } finally {
            setLoading(false);
        }
    }, [accountId]);

    useEffect(() => {
        if (accountId) {
            fetchComments();
        }
    }, [accountId, fetchComments]);

    const filteredComments = comments.filter((comment) => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                comment.content?.toLowerCase().includes(query) ||
                comment.author_name?.toLowerCase().includes(query)
            );
        }
        return true;
    });

    if (loading) {
        return <div className="text-center py-8">Loading comments...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <MessageSquare className="h-6 w-6" />
                        Comments & Reactions
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        {comments.length} comments
                    </p>
                </div>
                <Button onClick={fetchComments} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search comments..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            <div className="space-y-4">
                {filteredComments.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            No comments found
                        </CardContent>
                    </Card>
                ) : (
                    filteredComments.map((comment) => (
                        <Card key={comment.id}>
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className="h-10 w-10 rounded-full bg-[#1877F2] flex items-center justify-center text-white font-semibold">
                                            {comment.author_name?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                        <div>
                                            <p className="font-semibold">{comment.author_name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(comment.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <ThumbsUp className="h-4 w-4" />
                                        <span>{comment.likes || 0}</span>
                                    </div>
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
