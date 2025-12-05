/**
 * Posts Drawer Component
 * Based on Xocial SRS Section 3.1.2
 * Displays posts from a social account in a sliding drawer
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, MessageCircle, Heart, Share2, Eye, Bookmark, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { LoadingSkeleton, PostCardSkeleton } from '@/components/shared/loading-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { cn } from '@/lib/utils';
import { getPlatformColor, getPlatformBadgeColor } from '@/lib/platform-colors';
import { slideInRight } from '@/lib/animations';
import { motion, AnimatePresence } from 'framer-motion';
import type { SocialAccount, Post } from '@/types';
import { toast } from 'sonner';
import { usePostsSync } from '@/hooks/use-account-sync';

interface PostsDrawerProps {
    account: SocialAccount | null;
    isOpen: boolean;
    onClose: () => void;
    onPostClick: (post: Post) => void;
}

export function PostsDrawer({ account, isOpen, onClose, onPostClick }: PostsDrawerProps) {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [cursor, setCursor] = useState<string | null>(null);
    const [selectedPostType, setSelectedPostType] = useState<string>('all');

    // Platform-specific post type tabs
    const POST_TYPE_TABS: Record<string, Array<{ value: string; label: string }>> = {
        instagram: [
            { value: 'all', label: 'All' },
            { value: 'feed', label: 'Feed' },
            { value: 'story', label: 'Stories' },
            { value: 'reel', label: 'Reels' },
            { value: 'carousel', label: 'Carousels' },
        ],
        facebook: [
            { value: 'all', label: 'All' },
            { value: 'feed', label: 'Feed' },
            { value: 'story', label: 'Stories' },
            { value: 'video', label: 'Videos' },
        ],
        twitter: [
            { value: 'all', label: 'All' },
            { value: 'tweet', label: 'Tweets' },
        ],
        youtube: [
            { value: 'all', label: 'All' },
            { value: 'video', label: 'Videos' },
            { value: 'short', label: 'Shorts' },
        ],
        linkedin: [
            { value: 'all', label: 'All' },
            { value: 'article', label: 'Articles' },
            { value: 'feed', label: 'Posts' },
        ],
        tiktok: [
            { value: 'all', label: 'All' },
            { value: 'video', label: 'Videos' },
        ],
    };

    const tabs = account ? POST_TYPE_TABS[account.platform as keyof typeof POST_TYPE_TABS] || POST_TYPE_TABS.instagram : [];

    const fetchPosts = useCallback(async (isRefresh = false) => {
        if (!account) return;

        if (!isRefresh) setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                limit: '20',
            });

            if (selectedPostType !== 'all') {
                params.append('post_type', selectedPostType);
            }

            const response = await fetch(
                `/api/accounts/${account.id}/posts?${params.toString()}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch posts');
            }

            const data = await response.json();
            setPosts(data.posts || []);
            setHasMore(data.has_more || false);
            setCursor(data.next_cursor || null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load posts');
        } finally {
            if (!isRefresh) setLoading(false);
        }
    }, [account, selectedPostType]);

    // Fetch posts when account or post type changes
    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    // Real-time updates for this account
    usePostsSync({
        accountId: account?.id,
        onPostInsert: () => fetchPosts(true),
        onPostUpdate: () => fetchPosts(true),
        onPostDelete: () => fetchPosts(true),
    });

    // Handle sync posts
    const handleSync = async () => {
        if (!account || syncing) return;

        setSyncing(true);
        try {
            const response = await fetch(`/api/accounts/${account.id}/sync-posts`, {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error('Failed to sync posts');
            }

            const data = await response.json();
            toast.success(data.message || 'Posts synced successfully');

            // Refresh posts list
            await fetchPosts(true);
        } catch (err) {
            toast.error('Failed to sync posts');
            console.error(err);
        } finally {
            setSyncing(false);
        }
    };

    // Load more posts
    const loadMore = async () => {
        if (!account || !hasMore || loading || !cursor) return;

        setLoading(true);
        try {
            const params = new URLSearchParams({
                limit: '20',
                cursor: cursor,
            });

            if (selectedPostType !== 'all') {
                params.append('post_type', selectedPostType);
            }

            const response = await fetch(
                `/api/accounts/${account.id}/posts?${params.toString()}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch more posts');
            }

            const data = await response.json();
            setPosts((prev) => [...prev, ...(data.posts || [])]);
            setHasMore(data.has_more || false);
            setCursor(data.next_cursor || null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load more posts');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

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
                        className="fixed inset-0 bg-black/50 z-40"
                    />
                )}
            </AnimatePresence>

            {/* Drawer */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        variants={slideInRight}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="fixed right-0 top-0 h-full w-full sm:w-[480px] bg-white shadow-strong z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="border-b border-gray-200">
                            <div className="flex items-center justify-between p-6">
                                <div className="flex items-center gap-3">
                                    {account?.account_avatar && (
                                        <Image
                                            src={account.account_avatar}
                                            alt={account.account_name || ''}
                                            width={40}
                                            height={40}
                                            className="rounded-full"
                                        />
                                    )}
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900">
                                            {account?.account_name}
                                        </h2>
                                        <p className="text-sm text-gray-600">
                                            @{account?.account_handle || account?.account_id}
                                        </p>
                                    </div>
                                    <div
                                        className={cn(
                                            'px-2 py-1 rounded text-xs font-medium text-white',
                                            account && getPlatformBadgeColor(account.platform as any)
                                        )}
                                    >
                                        {account?.platform}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleSync}
                                        disabled={syncing}
                                        className="gap-2"
                                    >
                                        <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
                                        {syncing ? 'Syncing...' : 'Sync Posts'}
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={onClose}>
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>

                            {/* Post Type Tabs */}
                            {tabs.length > 0 && (
                                <div className="flex gap-1 px-6 pb-3 overflow-x-auto">
                                    {tabs.map((tab) => (
                                        <button
                                            key={tab.value}
                                            onClick={() => setSelectedPostType(tab.value)}
                                            className={cn(
                                                'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                                                selectedPostType === tab.value
                                                    ? cn(
                                                        'text-white',
                                                        account && getPlatformBadgeColor(account.platform as any)
                                                    )
                                                    : 'text-gray-600 hover:bg-gray-100'
                                            )}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {loading && posts.length === 0 ? (
                                <div className="space-y-4">
                                    <PostCardSkeleton />
                                    <PostCardSkeleton />
                                    <PostCardSkeleton />
                                </div>
                            ) : error ? (
                                <ErrorState
                                    message={error}
                                    onRetry={() => window.location.reload()}
                                />
                            ) : posts.length === 0 ? (
                                <EmptyState
                                    title="No posts yet"
                                    description="This account hasn't published any posts recently."
                                />
                            ) : (
                                <div className="space-y-4">
                                    {posts.map((post) => (
                                        <PostItem
                                            key={post.id}
                                            post={post}
                                            onClick={() => onPostClick?.(post)}
                                        />
                                    ))}

                                    {hasMore && (
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={loadMore}
                                            disabled={loading}
                                        >
                                            {loading ? 'Loading...' : 'Load More'}
                                        </Button>
                                    )}
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
 * Individual Post Item Component
 */
interface PostItemProps {
    post: Post;
    onClick: () => void;
}

function PostItem({ post, onClick }: PostItemProps) {
    // Get first media URL if available
    const mediaUrl = (post.media?.[0] as any)?.thumbnail || post.media?.[0]?.url || (post.media as any)?.[0];
    const caption = typeof post.content === 'string'
        ? post.content
        : (post.content as any)?.caption || '';

    // Format timestamp
    const getRelativeTime = (date: string | Date) => {
        const now = new Date();
        const postDate = new Date(date);
        const diffMs = now.getTime() - postDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    const timestamp = post.published_at || post.scheduled_at || post.created_at;

    return (
        <div
            onClick={onClick}
            className="rounded-lg border border-gray-200 bg-white hover:shadow-medium transition-shadow cursor-pointer overflow-hidden"
        >
            {/* Media Thumbnail */}
            {mediaUrl && (
                <div className="relative aspect-square bg-gray-100">
                    <Image
                        src={mediaUrl}
                        alt="Post media"
                        fill
                        className="object-cover"
                    />
                </div>
            )}

            {/* Content */}
            <div className="p-4">
                {/* Caption (truncated to 2 lines) */}
                <p className="text-sm text-gray-900 line-clamp-2 mb-3">
                    {caption}
                </p>

                {/* Metrics Row */}
                <div className="flex items-center gap-4 text-sm text-gray-600">
                    {post.metrics?.likes !== undefined && (
                        <div className="flex items-center gap-1">
                            <Heart className="h-4 w-4" />
                            <span>{post.metrics.likes.toLocaleString()}</span>
                        </div>
                    )}
                    {post.metrics?.comments !== undefined && (
                        <div className="flex items-center gap-1">
                            <MessageCircle className="h-4 w-4" />
                            <span>{post.metrics.comments.toLocaleString()}</span>
                        </div>
                    )}
                    {post.metrics?.shares !== undefined && (
                        <div className="flex items-center gap-1">
                            <Share2 className="h-4 w-4" />
                            <span>{post.metrics.shares.toLocaleString()}</span>
                        </div>
                    )}
                    {post.metrics?.saves !== undefined && (
                        <div className="flex items-center gap-1">
                            <Bookmark className="h-4 w-4" />
                            <span>{post.metrics.saves.toLocaleString()}</span>
                        </div>
                    )}
                    {post.metrics?.views !== undefined && (
                        <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            <span>{post.metrics.views.toLocaleString()}</span>
                        </div>
                    )}
                </div>

                {/* Timestamp */}
                <p className="text-xs text-gray-500 mt-2">
                    {timestamp && getRelativeTime(timestamp)}
                </p>
            </div>
        </div>
    );
}
