"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CalendarGrid } from "./components/calendar-grid";
import { DayPostsPanel } from "./components/day-posts-panel";
import { RescheduleModal } from "./components/reschedule-modal";
import { usePosts } from "@/hooks/use-posts";
import { Spinner } from "@/components/ui/spinner";
import type { Post } from "@/types";
import { toast } from "sonner";

export default function OPage() {
  const { posts, isLoading: loading, updatePost, deletePost } = usePosts();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [reschedulePost, setReschedulePost] = useState<{ id: string; date: Date } | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Filter posts for selected date
  const selectedDatePosts = selectedDate
    ? posts.filter((post) => {
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
      await updatePost(reschedulePost.id, {
        scheduled_at: scheduledDate.toISOString(),
      });
      toast.success('Post rescheduled successfully');
      setReschedulePost(null);
    } catch (error) {
      toast.error('Failed to reschedule post');
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
              <h1 className="text-3xl font-bold text-secondary-900">
                Content Calendar
              </h1>
              <p className="mt-2 text-secondary-600">
                Schedule and manage your posts across all platforms
              </p>
            </div>
            <Button>
              <Plus className="mr-2 h-5 w-5" />
              Schedule Post
            </Button>
          </div>
        </div>

        <CalendarGrid
          posts={posts}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          onPostClick={setSelectedPost}
        />
      </div>

      {/* Day Posts Panel */}
      {selectedDate && (
        <div className="w-96">
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
