/**
 * Enhanced Day Cell Component
 * Based on Xocial SRS Section 3.2.1
 * Calendar day cell with platform dots, "+N more" badges, and hover states
 */

'use client';

import * as React from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getPlatformColor, Platform } from "@/lib/platform-colors";
import { Plus } from "lucide-react";
import type { Post } from "@/types";

interface DayCellProps {
  date: Date;
  posts: Post[];
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  onSelect: () => void;
  onPostClick?: (post: Post) => void;
  onDropPost?: (postId: string) => void;
  onPostDragStart?: (postId: string) => void;
  onPostDragEnd?: () => void;
  draggedPostId?: string | null;
}

export function DayCell({
  date,
  posts,
  isCurrentMonth,
  isSelected,
  isToday,
  onSelect,
  onPostClick,
  onDropPost,
  onPostDragStart,
  onPostDragEnd,
  draggedPostId,
}: DayCellProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const isDroppable = Boolean(onDropPost && draggedPostId);

  // Get unique platforms from posts (max 4 for display)
  const platforms = React.useMemo(() => {
    const platformSet = new Set<Platform>();
    posts.forEach((post) => {
      post.platforms?.forEach((platform: Platform) => {
        platformSet.add(platform);
      });
    });
    return Array.from(platformSet);
  }, [posts]);

  const visiblePlatforms = platforms.slice(0, 4);
  const hiddenPlatformsCount = platforms.length - 4;

  const handleDragOver = (event: React.DragEvent<HTMLButtonElement>) => {
    if (!isDroppable) return;
    event.preventDefault();
  };

  const handleDragEnter = (event: React.DragEvent<HTMLButtonElement>) => {
    if (!isDroppable) return;
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLButtonElement>) => {
    if (!isDroppable) return;
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLButtonElement>) => {
    if (!isDroppable) return;
    event.preventDefault();
    const postId = event.dataTransfer.getData('application/x-post-id');
    if (postId && onDropPost) {
      onDropPost(postId);
    }
    setIsDragOver(false);
    onPostDragEnd?.();
  };

  const startDrag = (event: React.DragEvent<HTMLDivElement>, postId: string) => {
    event.stopPropagation();
    event.dataTransfer.setData('application/x-post-id', postId);
    event.dataTransfer.effectAllowed = 'move';
    onPostDragStart?.(postId);
  };

  const endDrag = () => {
    onPostDragEnd?.();
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative min-h-[120px] border-b border-r border-gray-200 p-2 text-left transition-all",
        "hover:bg-gray-50 hover:shadow-soft",
        !isCurrentMonth && "bg-gray-50/50 text-gray-400",
        isSelected && "bg-primary-50 ring-2 ring-inset ring-primary-500",
        isToday && "bg-primary-50/30",
        isDragOver && "ring-2 ring-primary-500 bg-primary-50/40 shadow-medium"
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

        {/* Hover "+" icon */}
        {isHovered && isCurrentMonth && (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-primary-600">
            <Plus className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Platform Indicator Dots */}
      {platforms.length > 0 && (
        <div className="flex items-center gap-1 mb-2">
          {visiblePlatforms.map((platform, index) => (
            <div
              key={`${platform}-${index}`}
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: getPlatformColor(platform) }}
              title={platform}
            />
          ))}
          {hiddenPlatformsCount > 0 && (
            <span className="text-[10px] text-gray-500 font-medium">
              +{hiddenPlatformsCount}
            </span>
          )}
        </div>
      )}

      {/* Post Previews */}
      <div className="space-y-1">
        {posts.slice(0, 3).map((post) => (
          <div
            key={post.id}
            draggable
            onDragStart={(event) => startDrag(event, post.id)}
            onDragEnd={endDrag}
            onClick={(e) => {
              e.stopPropagation();
              onPostClick?.(post);
            }}
            className={cn(
              "group relative rounded px-2 py-1 text-xs cursor-grab active:cursor-grabbing",
              "hover:shadow-soft transition-all",
              post.status === 'scheduled' && "bg-green-100 text-green-800 hover:bg-green-200",
              post.status === 'published' && "bg-gray-100 text-gray-700 hover:bg-gray-200",
              post.status === 'draft' && "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
            )}
          >
            <div className="flex items-center gap-1.5">
              {post.scheduled_at && (
                <span className="font-medium">
                  {format(new Date(post.scheduled_at), 'HH:mm')}
                </span>
              )}
              <span className="truncate flex-1 text-[11px]">
                {typeof post.content === 'string'
                  ? post.content.slice(0, 20)
                  : (post.content as any)?.caption?.slice(0, 20) || 'Post'}
              </span>
            </div>
          </div>
        ))}

        {/* "+N more" badge */}
        {posts.length > 3 && (
          <div className="rounded px-2 py-1 text-[11px] bg-gray-100 text-gray-600 font-medium text-center">
            +{posts.length - 3} more
          </div>
        )}
      </div>
    </button>
  );
}
