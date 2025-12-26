import { useState } from 'react';
import { usePosts } from './use-posts';
import { Platform } from '@/types';
import { toast } from 'sonner';

// Calendar post type - flexible to handle both Post and CalendarEntry shapes
type CalendarPost = {
  id: string;
  status: string;
  platforms?: string[];
  scheduled_at?: string;
  published_at?: string;
  created_at?: string;
  content?: Record<string, unknown>;
  _source?: string;
  _calendarDate?: string;
  [key: string]: unknown;
};

export function useCalendarActions(posts: CalendarPost[]) {
    const { updatePostAsync, deletePost, createPostAsync, updateStatus } = usePosts();

    const [reschedulePost, setReschedulePost] = useState<{ id: string; date: Date } | null>(null);
    const [selectedPost, setSelectedPost] = useState<CalendarPost | null>(null);
    const [editingPost, setEditingPost] = useState<CalendarPost | null>(null);

    const handleReschedule = async (postId: string) => {
        const post = posts.find((p) => p.id === postId);
        if (!post) return;

        const currentDate = new Date(post.scheduled_at || new Date());
        setReschedulePost({ id: postId, date: currentDate });
    };

    const handleRescheduleSubmit = async (newDate: Date, newTime: string) => {
        if (!reschedulePost) return;

        const [hours, minutes] = newTime.split(':');
        const scheduledDate = new Date(newDate);
        scheduledDate.setHours(parseInt(hours), parseInt(minutes));

        try {
            await updatePostAsync(reschedulePost.id, {
                scheduled_at: scheduledDate.toISOString(),
                status: 'scheduled',
            });
            toast.success('Post rescheduled successfully');
            setReschedulePost(null);
        } catch (error) {
            toast.error('Failed to reschedule post');
        }
    };

    const handlePostDrop = async (data: string | object, targetDate: Date) => {
        // Check if it's a media drop
        if (typeof data === 'string' && data.startsWith('{') && data.includes('original_filename')) {
            try {
                const media = JSON.parse(data);
                const scheduledAt = new Date(targetDate);
                scheduledAt.setHours(10, 0, 0, 0);

                const newPost = {
                    content: {},
                    media_urls: [media.url],
                    scheduled_at: scheduledAt.toISOString(),
                    status: 'draft',
                    platforms: ['instagram'] as Platform[], // Default platform
                    metadata: {
                        media_assets: [{
                            id: media.id,
                            url: media.url,
                            type: media.file_type || 'image',
                        }]
                    }
                };

                const createdPost = await createPostAsync(newPost as any);

                if (createdPost) {
                    // Map created post to CalendarPost shape
                    setEditingPost({
                        ...createdPost,
                        status: createdPost.status || 'draft',
                    } as CalendarPost);
                    toast.success('Draft created from media');
                }

            } catch (e) {
                console.error('Failed to parse media drop', e);
                toast.error('Failed to create post from media');
            }
            return;
        }

        const postId = data as string;
        const post = posts.find((p) => p.id === postId);

        let hours = 10;
        let minutes = 0;

        if (post) {
            const dateStr = post.scheduled_at || post.published_at || post.created_at;
            if (dateStr) {
                const referenceDate = new Date(dateStr);
                hours = referenceDate.getHours();
                minutes = referenceDate.getMinutes();
            }
        }

        const nextDate = new Date(targetDate);
        nextDate.setHours(hours, minutes, 0, 0);

        try {
            await updatePostAsync(postId, {
                scheduled_at: nextDate.toISOString(),
                status: 'scheduled',
            });
            toast.success(`Post scheduled for ${nextDate.toLocaleDateString()} at ${hours}:${minutes.toString().padStart(2, '0')}`);
        } catch (error) {
            toast.error('Failed to move post');
        }
    };

    const handleDeletePost = async (postId: string) => {
        if (!confirm('Are you sure you want to delete this post?')) return;

        try {
            const restoreToken = `restore_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            await updatePostAsync(postId, {
                metadata: {
                    restore_token: restoreToken,
                    deleted_at: new Date().toISOString(),
                },
            });

            await deletePost(postId);

            toast.success('Post deleted', {
                description: 'You can undo this action',
                duration: 5000,
                action: {
                    label: 'Undo',
                    onClick: async () => {
                        try {
                            const response = await fetch('/api/posts/scheduled/restore', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ post_id: postId, restore_token: restoreToken }),
                            });

                            if (response.ok) {
                                toast.success('Post restored');
                                window.location.reload();
                            } else {
                                const error = await response.json();
                                toast.error(error.hint || 'Failed to restore post');
                            }
                        } catch (error) {
                            toast.error('Failed to restore post');
                        }
                    },
                },
            });
        } catch (error) {
            toast.error('Failed to delete post');
        }
    };

    const handleApprovePost = async (postId: string) => {
        try {
            await updatePostAsync(postId, { status: 'scheduled' });
            toast.success('Post approved and scheduled');
        } catch (error) {
            toast.error('Failed to approve post');
        }
    };

    const handleRejectPost = async (postId: string) => {
        try {
            await updatePostAsync(postId, { status: 'draft' });
            toast.success('Post rejected and returned to drafts');
        } catch (error) {
            toast.error('Failed to reject post');
        }
    };

    return {
        handleReschedule,
        handleRescheduleSubmit,
        handlePostDrop,
        handleDeletePost,
        handleApprovePost,
        handleRejectPost,
        reschedulePost,
        setReschedulePost,
        selectedPost,
        setSelectedPost,
        editingPost,
        setEditingPost,
        updatePostAsync,
        updateStatus,
    };
}
