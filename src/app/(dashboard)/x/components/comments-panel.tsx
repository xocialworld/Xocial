/**
 * Comments Panel Component
 * Based on Xocial SRS Section 3.1.2
 * Nested drawer for viewing and replying to post comments
 */

'use client';

import { useState, useEffect } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState, InlineError } from '@/components/shared/error-state';
import { cn } from '@/lib/utils';
import { getCharacterLimit, getCharacterCountColor, Platform } from '@/lib/platform-colors';
import { slideInRight } from '@/lib/animations';
import { motion, AnimatePresence } from 'framer-motion';
import type { Post } from '@/types';
import { toast } from 'sonner';

interface Comment {
    id: string;
    external_comment_id?: string;
    author_name: string;
    author_avatar?: string;
    author_id?: string;
    content: string;
    parent_comment_id?: string;
    likes: number;
    reply_count: number;
    is_reply: boolean;
    created_at: string;
}

interface CommentsPanelProps {
    post: Post | null;
    isOpen: boolean;
    onClose: () => void;
    platform: Platform;
}

export function CommentsPanel({ post, isOpen, onClose, platform }: CommentsPanelProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);

    // Fetch comments when post changes
    useEffect(() => {
        if (!post) return;

        const fetchComments = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(`/api/comments?post_id=${post.id}`);

                if (!response.ok) {
                    throw new Error('Failed to fetch comments');
                }

                const data = await response.json();
                setComments(data.comments || []);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load comments');
            } finally {
                setLoading(false);
            }
        };

        fetchComments();
    }, [post]);

    if (!isOpen) return null;

    const mediaUrl = post?.media?.[0]?.url || (post?.media as any)?.[0];
    const caption = typeof post?.content === 'string'
        ? post.content
        : (post?.content as any)?.caption || '';

    return (
        <>
            {/* Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-50"
                    />
                )}
            </AnimatePresence>

            {/* Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        variants={slideInRight}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-white shadow-strong z-[60] flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">Comments</h2>
                            <Button variant="ghost" size="sm" onClick={onClose}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Post Preview */}
                        <div className="p-4 border-b border-gray-200 bg-gray-50">
                            <div className="flex gap-3">
                                {mediaUrl && (
                                    <img
                                        src={mediaUrl}
                                        alt="Post"
                                        className="w-16 h-16 rounded object-cover flex-shrink-0"
                                    />
                                )}
                                <p className="text-sm text-gray-900 line-clamp-3 flex-1">
                                    {caption}
                                </p>
                            </div>
                        </div>

                        {/* Comments List */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {loading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex gap-3">
                                            <LoadingSkeleton variant="circular" width={40} height={40} />
                                            <div className="flex-1 space-y-2">
                                                <LoadingSkeleton variant="text" width="60%" />
                                                <LoadingSkeleton variant="text" width="80%" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : error ? (
                                <ErrorState
                                    message={error}
                                    onRetry={() => window.location.reload()}
                                    variant="minimal"
                                />
                            ) : comments.length === 0 ? (
                                <EmptyState
                                    title="No comments yet"
                                    description="Be the first to comment on this post!"
                                />
                            ) : (
                                <div className="space-y-4">
                                    {comments.map((comment) => (
                                        <CommentItem
                                            key={comment.id}
                                            comment={comment}
                                            platform={platform}
                                            isReplying={replyingTo === comment.id}
                                            onReply={() => setReplyingTo(comment.id)}
                                            onCancelReply={() => setReplyingTo(null)}
                                            onReplySuccess={() => {
                                                setReplyingTo(null);
                                                // Refresh comments
                                                if (post) {
                                                    fetch(`/api/comments?post_id=${post.id}`)
                                                        .then((res) => res.json())
                                                        .then((data) => setComments(data.comments || []));
                                                }
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

/**
 * Individual Comment Item Component
 */
interface CommentItemProps {
    comment: Comment;
    platform: Platform;
    isReplying: boolean;
    onReply: () => void;
    onCancelReply: () => void;
    onReplySuccess: () => void;
}

function CommentItem({
    comment,
    platform,
    isReplying,
    onReply,
    onCancelReply,
    onReplySuccess,
}: CommentItemProps) {
    const [replyText, setReplyText] = useState(`@${comment.author_name} `);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const characterLimit = getCharacterLimit(platform);
    const characterCount = replyText.length;
    const characterColor = getCharacterCountColor(characterCount, characterLimit);

    const handleSubmitReply = async () => {
        if (!replyText.trim() || submitting) return;

        setSubmitting(true);
        setError(null);

        try {
            const response = await fetch('/api/comments/reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    comment_id: comment.external_comment_id || comment.id,
                    reply_text: replyText,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to post reply');
            }

            toast.success('Reply posted successfully');
            setReplyText('');
            onReplySuccess();
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to post reply';
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    // Format timestamp
    const getRelativeTime = (date: string) => {
        const now = new Date();
        const commentDate = new Date(date);
        const diffMs = now.getTime() - commentDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return commentDate.toLocaleDateString();
    };

    return (
        <div className="flex gap-3">
            {/* Avatar */}
            <div className="flex-shrink-0">
                {comment.author_avatar ? (
                    <img
                        src={comment.author_avatar}
                        alt={comment.author_name}
                        className="w-10 h-10 rounded-full"
                    />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                        {comment.author_name.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                {/* Author and timestamp */}
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-900">
                        {comment.author_name}
                    </span>
                    <span className="text-xs text-gray-500">
                        {getRelativeTime(comment.created_at)}
                    </span>
                </div>

                {/* Comment text */}
                <p className="text-sm text-gray-700 mb-2">{comment.content}</p>

                {/* Actions */}
                <div className="flex items-center gap-4 text-xs text-gray-600">
                    {comment.likes > 0 && <span>{comment.likes} likes</span>}
                    <button
                        onClick={onReply}
                        className="hover:text-primary-600 font-medium"
                    >
                        Reply
                    </button>
                </div>

                {/* Reply Input */}
                {isReplying && (
                    <div className="mt-3 space-y-2">
                        <Textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={`Reply to ${comment.author_name}...`}
                            className="min-h-[80px]"
                            maxLength={characterLimit}
                        />

                        {/* Character counter */}
                        <div className="flex items-center justify-between">
                            <span className={cn('text-xs', characterColor)}>
                                {characterCount} / {characterLimit}
                            </span>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onCancelReply}
                                    disabled={submitting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleSubmitReply}
                                    disabled={
                                        submitting ||
                                        !replyText.trim() ||
                                        characterCount > characterLimit
                                    }
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="mr-2 h-4 w-4" />
                                            Send
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {error && <InlineError message={error} />}
                    </div>
                )}
            </div>
        </div>
    );
}
