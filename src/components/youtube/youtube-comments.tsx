'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, ThumbsUp, Reply, Send, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Comment {
    id: string;
    external_comment_id: string;
    author_name: string;
    author_avatar?: string;
    content: string;
    likes: number;
    reply_count: number;
    created_at: string;
    video_title?: string;
    video_id?: string;
}

export function YouTubeComments() {
    const params = useParams();
    const accountId = params.accountId as string;

    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unanswered'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);
    const [syncing, setSyncing] = useState(false);

    const fetchComments = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(
                `/api/youtube/comments?accountId=${accountId}&filter=${filter}`
            );
            if (!response.ok) throw new Error('Failed to fetch comments');
            const result = await response.json();
            setComments(result.data || []);
        } catch (error: any) {
            console.error('Comments error:', error);
            toast.error('Failed to load comments');
        } finally {
            setLoading(false);
        }
    }, [accountId, filter]);

    useEffect(() => {
        if (accountId) {
            fetchComments();
        }
    }, [accountId, filter, fetchComments]);

    const handleSyncComments = async () => {
        try {
            setSyncing(true);
            const response = await fetch(`/api/youtube/sync?accountId=${accountId}&type=comments`, {
                method: 'POST',
            });
            if (!response.ok) throw new Error('Sync failed');
            toast.success('Comments synced successfully');
            await fetchComments();
        } catch (error: any) {
            console.error('Sync error:', error);
            toast.error('Failed to sync comments');
        } finally {
            setSyncing(false);
        }
    };

    const handleReply = async (commentId: string) => {
        if (!replyText.trim()) {
            toast.error('Please enter a reply');
            return;
        }

        try {
            setSending(true);
            const response = await fetch('/api/youtube/comments/reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accountId,
                    commentId,
                    replyText,
                }),
            });

            if (!response.ok) throw new Error('Failed to send reply');

            toast.success('Reply sent successfully');
            setReplyingTo(null);
            setReplyText('');
            await fetchComments();
        } catch (error: any) {
            console.error('Reply error:', error);
            toast.error(error.message || 'Failed to send reply');
        } finally {
            setSending(false);
        }
    };

    const filteredComments = comments.filter((comment) => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                comment.content.toLowerCase().includes(query) ||
                comment.author_name.toLowerCase().includes(query) ||
                comment.video_title?.toLowerCase().includes(query)
            );
        }
        return true;
    });

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <MessageSquare className="h-6 w-6" />
                        Comments Inbox
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        {comments.length} comments across all videos
                    </p>
                </div>
                <Button onClick={handleSyncComments} disabled={syncing} variant="outline">
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Syncing...' : 'Sync Comments'}
                </Button>
            </div>

            {/* Filters and Search */}
            <div className="flex gap-4">
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search comments..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>
                <Select value={filter} onValueChange={(val: any) => setFilter(val)}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Comments</SelectItem>
                        <SelectItem value="unanswered">Unanswered Only</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Comments List */}
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
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className="relative h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                            {comment.author_avatar ? (
                                                <Image
                                                    src={comment.author_avatar}
                                                    alt={comment.author_name}
                                                    fill
                                                    className="rounded-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-sm font-semibold">
                                                    {comment.author_name.charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-semibold">{comment.author_name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(comment.created_at).toLocaleString()}
                                            </p>
                                            {comment.video_title && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    On: {comment.video_title}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <ThumbsUp className="h-4 w-4" />
                                            <span>{comment.likes}</span>
                                        </div>
                                        {comment.reply_count > 0 && (
                                            <Badge variant="secondary">{comment.reply_count} replies</Badge>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>

                                {/* Reply Section */}
                                {replyingTo === comment.id ? (
                                    <div className="space-y-2 pl-4 border-l-2">
                                        <Textarea
                                            placeholder="Write your reply..."
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            rows={3}
                                        />
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setReplyingTo(null);
                                                    setReplyText('');
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleReply(comment.external_comment_id)}
                                                disabled={sending}
                                            >
                                                <Send className="h-4 w-4 mr-2" />
                                                {sending ? 'Sending...' : 'Send Reply'}
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setReplyingTo(comment.id)}
                                    >
                                        <Reply className="h-4 w-4 mr-2" />
                                        Reply
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
