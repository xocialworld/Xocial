'use client';
/* eslint-disable @next/next/no-img-element -- Calendar previews surface stored media where Next Image constraints are impractical */

import * as React from "react";
import { format } from "date-fns";
import { X, Calendar, Clock, Edit, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Post } from "@/types";

interface DayPostsPanelProps {
  date: Date | null;
  posts: Post[];
  onClose: () => void;
  onEditPost?: (post: Post) => void;
  onDeletePost?: (postId: string) => void;
  onReschedulePost?: (postId: string) => void;
}

const platformColors = {
  facebook: 'bg-[#1877F2] text-white',
  instagram: 'bg-gradient-to-r from-[#F58529] to-[#DD2A7B] text-white',
  twitter: 'bg-[#1DA1F2] text-white',
  linkedin: 'bg-[#0A66C2] text-white',
  tiktok: 'bg-black text-white',
  youtube: 'bg-[#FF0000] text-white',
};

export function DayPostsPanel({
  date,
  posts,
  onClose,
  onEditPost,
  onDeletePost,
  onReschedulePost,
}: DayPostsPanelProps) {
  if (!date) return null;

  const sortedPosts = [...posts].sort((a, b) => {
    const timeA = new Date(a.scheduled_at || a.created_at).getTime();
    const timeB = new Date(b.scheduled_at || b.created_at).getTime();
    return timeA - timeB;
  });

  return (
    <div className="flex h-full flex-col bg-white sm:border-l border-secondary-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-secondary-200 px-6 py-4">
        <div>
          <h3 className="text-lg font-semibold text-secondary-900">
            {format(date, 'MMMM d, yyyy')}
          </h3>
          <p className="text-sm text-secondary-600">
            {posts.length} {posts.length === 1 ? 'post' : 'posts'}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="p-2">
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Posts List */}
      <ScrollArea className="flex-1 px-6 py-4">
        {sortedPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-12 w-12 text-secondary-300 mb-4" />
            <p className="text-secondary-600">No posts scheduled for this day</p>
            <Button size="sm" className="mt-4">
              Schedule Post
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedPosts.map((post) => (
              <div
                key={post.id}
                className="rounded-lg border border-secondary-200 p-4 transition-shadow hover:shadow-md"
              >
                {/* Post Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {post.scheduled_at && (
                      <div className="flex items-center gap-1 text-xs text-secondary-600">
                        <Clock className="h-3 w-3" />
                        {format(new Date(post.scheduled_at), 'HH:mm')}
                      </div>
                    )}
                    <Badge
                      variant={post.status === 'scheduled' ? 'default' : 'secondary'}
                      className="capitalize"
                    >
                      {post.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onReschedulePost?.(post.id)}
                      className="h-7 w-7 p-0"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditPost?.(post)}
                      className="h-7 w-7 p-0"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeletePost?.(post.id)}
                      className="h-7 w-7 p-0 text-error-600 hover:text-error-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Platforms */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {post.platforms.map((platform) => (
                    <Badge
                      key={platform}
                      className={cn(
                        "capitalize text-xs",
                        platformColors[platform as keyof typeof platformColors]
                      )}
                    >
                      {platform}
                    </Badge>
                  ))}
                </div>

                {/* Content Preview */}
                <div className="mb-3">
                  <p className="text-sm text-secondary-700 line-clamp-3">
                    {Object.values(post.content)[0]?.text || 'No content'}
                  </p>
                </div>

                {/* Media Preview */}
                {post.media && post.media.length > 0 && (
                  <div className="mb-3">
                    <div className="flex gap-2">
                      {post.media.slice(0, 3).map((media, index) => (
                        <div
                          key={media.id}
                          className="relative h-16 w-16 rounded overflow-hidden bg-secondary-100"
                        >
                          <img
                            src={media.url}
                            alt="Media"
                            className="h-full w-full object-cover"
                          />
                          {index === 2 && post.media!.length > 3 && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs text-white font-medium">
                              +{post.media!.length - 3}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Post Link (if published) */}
                {post.status === 'published' && post.external_post_id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-primary-600"
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-2" />
                    View on platform
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

