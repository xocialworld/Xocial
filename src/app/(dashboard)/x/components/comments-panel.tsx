/**
 * Comments Panel Component
 * Based on Xocial SRS Section 3.1.2
 * Nested drawer for viewing and replying to post comments
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
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
import { fetchWithWorkspace } from '@/lib/fetch-with-workspace';

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
    accountId?: string;
}

export function CommentsPanel({ post, isOpen, onClose, platform, accountId }: CommentsPanelProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);

    const loadComments = useCallback(async () => {
        if (!post) return;

        setLoading(true);
        setError(null);

        try {
            const commentsUrl = getCommentsUrl(post, platform, accountId);
            const response = await fetchWithWorkspace(commentsUrl);

            if (!response.ok) {
                const data = await response.json().catch(() => null);
                throw new Error(data?.error?.message || data?.error || 'Failed to fetch comments');
            }

            const data = await response.json();
            setComments(normalizeComments(data, platform));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load comments');
        } finally {
            setLoading(false);
        }
    }, [accountId, platform, post]);

    // Fetch comments when post changes
    useEffect(() => {
        loadComments();
    }, [loadComments]);

    if (!isOpen) return null;

    const mediaUrl = post ? getPostMediaUrl(post) : undefined;
    const caption = post ? getPostText(post) : '';

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
                                    <div className="relative w-16 h-16 flex-shrink-0">
                                        <Image
                                            src={mediaUrl}
                                            alt="Post"
                                            fill
                                            className="rounded object-cover"
                                        />
                                    </div>
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
                                    onRetry={loadComments}
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
                                                loadComments();
                                            }}
                                            accountId={accountId}
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
    accountId?: string;
}

function CommentItem({
    comment,
    platform,
    isReplying,
    onReply,
    onCancelReply,
    onReplySuccess,
    accountId,
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
            const { url, body } = getReplyRequest(platform, comment, replyText, accountId);
            const response = await fetchWithWorkspace(url, {
                method: 'POST',
                body: JSON.stringify(body),
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
                    <Image
                        src={comment.author_avatar}
                        alt={comment.author_name}
                        width={40}
                        height={40}
                        className="rounded-full"
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

function getCommentsUrl(post: Post, platform: Platform, accountId?: string): string {
    const externalPostId = (post as any).external_post_id || post.id;

    if (platform === 'youtube') {
        if (!accountId) {
            throw new Error('Select a YouTube account before loading comments');
        }
        return `/api/youtube/comments?accountId=${encodeURIComponent(accountId)}&videoId=${encodeURIComponent(externalPostId)}`;
    }

    if (platform === 'instagram') {
        if (!accountId) {
            throw new Error('Select an Instagram account before loading comments');
        }
        return `/api/instagram/comments?accountId=${encodeURIComponent(accountId)}&mediaId=${encodeURIComponent(externalPostId)}`;
    }

    return `/api/comments?content_item_id=${encodeURIComponent(post.id)}`;
}

function normalizeComments(payload: any, platform: Platform): Comment[] {
    const rows = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.comments)
            ? payload.comments
            : [];

    return rows.map((comment: any) => {
        const author = comment.author || comment.from || {};
        const externalId = comment.external_comment_id || comment.id;
        const content = comment.content || comment.text || comment.body || '';
        const createdAt =
            comment.created_at ||
            comment.created_time ||
            comment.publishedAt ||
            comment.timestamp ||
            new Date().toISOString();

        return {
            id: String(comment.id || externalId),
            external_comment_id: externalId ? String(externalId) : undefined,
            author_name:
                comment.author_name ||
                comment.username ||
                author.name ||
                comment.author?.full_name ||
                'Unknown',
            author_avatar: comment.author_avatar || author.avatar || author.avatar_url,
            author_id: comment.author_id || author.channelId,
            content: typeof content === 'string' ? content : String(content || ''),
            parent_comment_id: comment.parent_comment_id || comment.parent_external_comment_id,
            likes: toNumber(comment.likes ?? comment.likeCount ?? comment.like_count),
            reply_count: toNumber(comment.reply_count ?? comment.replyCount),
            is_reply: Boolean(comment.is_reply || comment.parent_comment_id || comment.parent_external_comment_id),
            created_at: createdAt,
        };
    });
}

function getReplyRequest(platform: Platform, comment: Comment, replyText: string, accountId?: string) {
    const commentId = comment.external_comment_id || comment.id;

    if (platform === 'youtube') {
        if (!accountId) {
            throw new Error('Select a YouTube account before replying');
        }
        return {
            url: '/api/youtube/comments',
            body: {
                accountId,
                commentId,
                replyText,
            },
        };
    }

    if (platform === 'instagram') {
        if (!accountId) {
            throw new Error('Select an Instagram account before replying');
        }
        return {
            url: '/api/instagram/comments',
            body: {
                accountId,
                commentId,
                message: replyText,
            },
        };
    }

    return {
        url: '/api/comments/reply',
        body: {
            comment_id: commentId,
            reply_text: replyText,
        },
    };
}

function getPostText(post: Post): string {
    const content = post.content as any;

    if (typeof content === 'string') {
        return content;
    }

    const directText =
        content?.caption ||
        content?.text ||
        content?.title ||
        content?.description ||
        content?.message;

    if (typeof directText === 'string' && directText.trim()) {
        return directText;
    }

    if (content && typeof content === 'object') {
        const platformEntry = Object.values(content).find((value: any) =>
            value &&
            typeof value === 'object' &&
            typeof (value.text || value.caption || value.title) === 'string'
        ) as any;

        const nestedText = platformEntry?.text || platformEntry?.caption || platformEntry?.title;
        if (typeof nestedText === 'string' && nestedText.trim()) {
            return nestedText;
        }
    }

    return 'No caption available';
}

function getPostMediaUrl(post: Post): string | undefined {
    const media = Array.isArray(post.media) ? post.media : [];
    const firstMedia = media.find(Boolean) as any;

    if (typeof firstMedia === 'string') {
        return firstMedia;
    }

    const content = post.content as any;
    const thumbnails = content?.thumbnails;

    return (
        firstMedia?.thumbnail ||
        firstMedia?.thumbnail_url ||
        firstMedia?.url ||
        firstMedia?.media_url ||
        firstMedia?.preview_image_url ||
        content?.thumbnail_url ||
        content?.media_url ||
        thumbnails?.high?.url ||
        thumbnails?.medium?.url ||
        thumbnails?.default?.url
    );
}

function toNumber(value: unknown): number {
    const parsed = typeof value === 'number'
        ? value
        : typeof value === 'string'
            ? Number(value)
            : 0;

    return Number.isFinite(parsed) ? parsed : 0;
}
