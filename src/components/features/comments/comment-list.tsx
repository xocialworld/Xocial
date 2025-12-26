"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CommentItem, Comment } from "./comment-item";
import { createClient } from "@/lib/supabase/client";
import { CommentInput } from "./comment-input";
import { toast } from "sonner";
import { MessageSquare, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommentListProps {
    contentItemId: string;
    workspaceId: string;
    className?: string;
}

export function CommentList({ contentItemId, workspaceId, className }: CommentListProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);

    const fetchComments = useCallback(async () => {
        try {
            const res = await fetch(
                `/api/comments?content_item_id=${contentItemId}&workspace_id=${workspaceId}`
            );
            const data = await res.json();

            if (res.ok) {
                setComments(data.threads || []);
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error("Failed to fetch comments:", error);
            toast.error("Failed to load comments");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [contentItemId, workspaceId]);

    useEffect(() => {
        fetchComments();

        // Realtime subscription
        const supabase = createClient();
        console.log("Setting up realtime subscription for content:", contentItemId);

        const channel = supabase
            .channel(`comments:${contentItemId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'content_comments',
                    filter: `content_item_id=eq.${contentItemId}`,
                },
                async (payload) => {
                    console.log('Realtime event:', payload);

                    if (payload.eventType === 'INSERT') {
                        // Fetch full comment with relations
                        const { new: newRecord } = payload;
                        try {
                            const res = await fetch(`/api/comments?id=${newRecord.id}&workspace_id=${workspaceId}`);
                            if (res.ok) {
                                const data = await res.json();
                                if (data.comments && data.comments.length > 0) {
                                    handleCommentAdded(data.comments[0]);
                                }
                            }
                        } catch (err) {
                            console.error("Failed to fetch new realtime comment", err);
                        }
                    } else if (payload.eventType === 'DELETE') {
                        handleCommentDeleted(payload.old.id, (payload.old as any).parent_id);
                    } else if (payload.eventType === 'UPDATE') {
                        // Optimistic update for simple fields, or re-fetch if complex
                        // For now, let's just handle resolution status locally if we have the record
                        // Ideally we might want to re-fetch to be safe, but let's try mapping first
                        const { new: updatedRecord } = payload;
                        setComments(prev => {
                            const updateInThread = (list: Comment[]): Comment[] => {
                                return list.map(c => {
                                    if (c.id === updatedRecord.id) {
                                        return { ...c, ...updatedRecord, author: c.author }; // Preserve author, update fields
                                    }
                                    if (c.replies) {
                                        return { ...c, replies: updateInThread(c.replies) };
                                    }
                                    return c;
                                });
                            };
                            return updateInThread(prev);
                        });
                    }
                }
            )
            .subscribe((status) => {
                console.log("Subscription status:", status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchComments, contentItemId, workspaceId]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchComments();
    };

    const handleCommentAdded = (newComment: Comment) => {
        if (newComment.parent_id) {
            // Add reply to parent comment
            setComments((prev) =>
                prev.map((comment) => {
                    if (comment.id === newComment.parent_id) {
                        return {
                            ...comment,
                            replies: [...(comment.replies || []), newComment],
                        };
                    }
                    return comment;
                })
            );
            setReplyingTo(null);
        } else {
            // Add as new top-level comment
            setComments((prev) => [...prev, { ...newComment, replies: [] }]);
        }
    };

    const handleCommentDeleted = (commentId: string, parentId?: string) => {
        if (parentId) {
            // Remove reply from parent
            setComments((prev) =>
                prev.map((comment) => {
                    if (comment.id === parentId) {
                        return {
                            ...comment,
                            replies: (comment.replies || []).filter((r) => r.id !== commentId),
                        };
                    }
                    return comment;
                })
            );
        } else {
            // Remove top-level comment
            setComments((prev) => prev.filter((c) => c.id !== commentId));
        }
    };

    const handleCommentResolved = (commentId: string, isResolved: boolean) => {
        setComments((prev) =>
            prev.map((comment) =>
                comment.id === commentId ? { ...comment, is_resolved: isResolved } : comment
            )
        );
    };

    if (loading) {
        return (
            <div className={cn("space-y-4", className)}>
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-full" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className={cn("space-y-4", className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-secondary-900">
                    Comments ({comments.length})
                </h3>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="h-7 px-2"
                >
                    <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                </Button>
            </div>

            {/* New Comment Input */}
            <CommentInput
                contentItemId={contentItemId}
                workspaceId={workspaceId}
                onCommentAdded={handleCommentAdded}
                placeholder="Add a comment..."
            />

            {/* Comments List */}
            {comments.length === 0 ? (
                <div className="text-center py-8">
                    <MessageSquare className="h-8 w-8 text-secondary-300 mx-auto mb-2" />
                    <p className="text-sm text-secondary-500">No comments yet</p>
                    <p className="text-xs text-secondary-400">Be the first to add a comment</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {comments.map((comment) => (
                        <div key={comment.id} className="space-y-3">
                            <CommentItem
                                comment={comment}
                                onReply={() => setReplyingTo(comment.id)}
                                onDelete={() => handleCommentDeleted(comment.id)}
                                onResolve={(resolved) => handleCommentResolved(comment.id, resolved)}
                            />

                            {/* Replies */}
                            {comment.replies && comment.replies.length > 0 && (
                                <div className="ml-10 space-y-3 pl-4 border-l-2 border-secondary-100">
                                    {comment.replies.map((reply) => (
                                        <CommentItem
                                            key={reply.id}
                                            comment={reply}
                                            isReply
                                            onDelete={() => handleCommentDeleted(reply.id, comment.id)}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Reply Input */}
                            {replyingTo === comment.id && (
                                <div className="ml-10 pl-4 border-l-2 border-primary-200">
                                    <CommentInput
                                        contentItemId={contentItemId}
                                        workspaceId={workspaceId}
                                        parentId={comment.id}
                                        onCommentAdded={handleCommentAdded}
                                        onCancel={() => setReplyingTo(null)}
                                        placeholder={`Reply to ${comment.author?.full_name || "user"}...`}
                                        autoFocus
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
