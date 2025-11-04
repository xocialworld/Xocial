'use client';

import * as React from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Post } from "@/types";

interface DayCellProps {
  date: Date;
  posts: Post[];
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  onSelect: () => void;
  onPostClick?: (post: Post) => void;
}

const platformColors = {
  facebook: 'bg-[#1877F2]',
  instagram: 'bg-gradient-to-r from-[#F58529] to-[#DD2A7B]',
  twitter: 'bg-[#1DA1F2]',
  linkedin: 'bg-[#0A66C2]',
  tiktok: 'bg-black',
  youtube: 'bg-[#FF0000]',
};

export function DayCell({
  date,
  posts,
  isCurrentMonth,
  isSelected,
  isToday,
  onSelect,
  onPostClick,
}: DayCellProps) {
  const scheduledPosts = posts.filter((p) => p.status === 'scheduled');
  const publishedPosts = posts.filter((p) => p.status === 'published');
  const draftPosts = posts.filter((p) => p.status === 'draft');

  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative min-h-[120px] border-b border-r border-secondary-200 p-2 text-left transition-colors hover:bg-secondary-50",
        !isCurrentMonth && "bg-secondary-50/50 text-secondary-400",
        isSelected && "bg-primary-50 ring-2 ring-inset ring-primary-500",
        isToday && "bg-primary-50/30"
      )}
    >
      {/* Date Number */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            "text-sm font-medium",
            isToday && "flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-white"
          )}
        >
          {format(date, 'd')}
        </span>
        {posts.length > 0 && (
          <span className="text-xs text-secondary-500">{posts.length}</span>
        )}
      </div>

      {/* Post Indicators */}
      <div className="space-y-1">
        {/* Scheduled posts */}
        {scheduledPosts.slice(0, 2).map((post, index) => (
          <div
            key={post.id}
            onClick={(e) => {
              e.stopPropagation();
              onPostClick?.(post);
            }}
            className="group relative"
          >
            <div className="flex items-center gap-1 rounded px-2 py-1 text-xs bg-success-100 text-success-800 hover:bg-success-200 cursor-pointer">
              <div className="flex gap-0.5">
                {post.platforms.slice(0, 2).map((platform) => (
                  <div
                    key={platform}
                    className={cn(
                      "h-2 w-2 rounded-full",
                      platformColors[platform as keyof typeof platformColors]
                    )}
                  />
                ))}
                {post.platforms.length > 2 && (
                  <span className="text-[10px]">+{post.platforms.length - 2}</span>
                )}
              </div>
              <span className="truncate flex-1">
                {format(new Date(post.scheduled_at!), 'HH:mm')}
              </span>
            </div>
          </div>
        ))}

        {/* Published posts */}
        {publishedPosts.slice(0, 1).map((post) => (
          <div
            key={post.id}
            onClick={(e) => {
              e.stopPropagation();
              onPostClick?.(post);
            }}
            className="rounded px-2 py-1 text-xs bg-secondary-100 text-secondary-700 hover:bg-secondary-200 cursor-pointer truncate"
          >
            Published
          </div>
        ))}

        {/* Draft posts */}
        {draftPosts.slice(0, 1).map((post) => (
          <div
            key={post.id}
            onClick={(e) => {
              e.stopPropagation();
              onPostClick?.(post);
            }}
            className="rounded px-2 py-1 text-xs bg-warning-100 text-warning-800 hover:bg-warning-200 cursor-pointer truncate"
          >
            Draft
          </div>
        ))}

        {/* Show more indicator */}
        {posts.length > 3 && (
          <div className="text-xs text-secondary-500 px-2">
            +{posts.length - 3} more
          </div>
        )}
      </div>
    </button>
  );
}

