"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CalendarGrid } from "./components/calendar-grid";
import { DayPostsPanel } from "./components/day-posts-panel";
import { RescheduleModal } from "./components/reschedule-modal";
import { usePosts } from "@/hooks/use-posts";
import { Spinner } from "@/components/ui/spinner";
import type { Post, Platform } from "@/types";
import { toast } from "sonner";
import {
  platformOptions,
  statusOptions,
  useCalendarFiltersStore,
} from "@/store/calendarFiltersStore";
import { useRouter } from "next/navigation";

export default function OPage() {
  const router = useRouter();
  const { posts, isLoading: loading, updatePostAsync, deletePost } = usePosts();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [reschedulePost, setReschedulePost] = useState<{ id: string; date: Date } | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const {
    platforms: platformFilters,
    statuses: statusFilters,
    togglePlatform,
    toggleStatus,
    reset,
  } = useCalendarFiltersStore();

  const filteredPosts = posts.filter((post) => {
    const matchesPlatform =
      platformFilters.length === 0 ||
      post.platforms.some((platform: Platform) => platformFilters.includes(platform));
    const matchesStatus = statusFilters.length === 0 || statusFilters.includes(post.status);
    return matchesPlatform && matchesStatus;
  });

  // Filter posts for selected date
  const selectedDatePosts = selectedDate
    ? filteredPosts.filter((post) => {
        const postDate = new Date(post.scheduled_at || post.published_at || post.created_at);
        return (
          postDate.getFullYear() === selectedDate.getFullYear() &&
          postDate.getMonth() === selectedDate.getMonth() &&
          postDate.getDate() === selectedDate.getDate()
        );
      })
    : [];

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
      });
      toast.success('Post rescheduled successfully');
      setReschedulePost(null);
    } catch (error) {
      toast.error('Failed to reschedule post');
    }
  };

  const handlePostDrop = async (postId: string, targetDate: Date) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const referenceDate = new Date(post.scheduled_at || post.published_at || post.created_at);
    const nextDate = new Date(targetDate);
    nextDate.setHours(referenceDate.getHours(), referenceDate.getMinutes(), 0, 0);

    try {
      await updatePostAsync(postId, {
        scheduled_at: nextDate.toISOString(),
        status: 'scheduled',
      });
      toast.success(`Post moved to ${nextDate.toLocaleDateString()}`);
    } catch (error) {
      toast.error('Failed to move post');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      await deletePost(postId);
      toast.success('Post deleted successfully');
    } catch (error) {
      toast.error('Failed to delete post');
    }
  };

  if (loading && posts.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main Calendar Area */}
      <div className="flex-1 p-8 overflow-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-secondary-900">O — Organize</h1>
              <p className="mt-2 text-secondary-600">Visual, multi-platform calendar to schedule and manage posts</p>
            </div>
            <Button
              onClick={() => {
                const date = selectedDate ?? new Date();
                // set default time to 10:00 for convenience
                const prefillDate = new Date(date);
                prefillDate.setHours(10, 0, 0, 0);
                router.push(`/c?date=${encodeURIComponent(prefillDate.toISOString())}`);
              }}
            >
              <Plus className="mr-2 h-5 w-5" />
              Schedule Post
            </Button>
          </div>
        </div>

        <div className="mb-6 space-y-4">
          <div>
            <p className="text-sm font-semibold text-secondary-700 mb-2">Platforms</p>
            <div className="flex flex-wrap gap-2">
              {platformOptions.map((platform) => {
                const selected = platformFilters.includes(platform);
                return (
                  <Button
                    key={platform}
                    variant={selected ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => togglePlatform(platform)}
                    className="capitalize"
                  >
                    {platform}
                  </Button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-secondary-700 mb-2">Statuses</p>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((status) => {
                const selected = statusFilters.includes(status);
                return (
                  <Button
                    key={status}
                    variant={selected ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => toggleStatus(status)}
                    className="capitalize"
                  >
                    {status.replace(/_/g, ' ')}
                  </Button>
                );
              })}
            </div>
          </div>

          {(platformFilters.length > 0 || statusFilters.length > 0) && (
            <Button variant="ghost" size="sm" onClick={reset}>
              Clear filters
            </Button>
          )}
        </div>

        <CalendarGrid
          posts={filteredPosts}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          onPostClick={setSelectedPost}
          onPostDrop={handlePostDrop}
        />
      </div>

      {/* Day Posts Panel */}
      {selectedDate && (
        <div className="sm:w-96 w-full fixed sm:relative inset-0 sm:inset-auto z-50 sm:z-auto bg-white">
          <DayPostsPanel
            date={selectedDate}
            posts={selectedDatePosts}
            onClose={() => setSelectedDate(null)}
            onEditPost={setSelectedPost}
            onDeletePost={handleDeletePost}
            onReschedulePost={handleReschedule}
          />
        </div>
      )}

      {/* Reschedule Modal */}
      {reschedulePost && (
        <RescheduleModal
          open={!!reschedulePost}
          onOpenChange={(open) => !open && setReschedulePost(null)}
          currentDate={reschedulePost.date}
          onReschedule={handleRescheduleSubmit}
        />
      )}
    </div>
  );
}
