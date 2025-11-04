'use client';

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Share2, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Post, PostAnalytics } from "@/types";

interface PostCardProps {
  post: Post & { post_analytics?: PostAnalytics[] };
  onCommentsClick?: (post: Post) => void;
  className?: string;
}

const platformColors = {
  facebook: 'bg-[#1877F2]',
  instagram: 'bg-gradient-to-r from-[#F58529] to-[#DD2A7B]',
  twitter: 'bg-[#1DA1F2]',
  linkedin: 'bg-[#0A66C2]',
  tiktok: 'bg-black',
  youtube: 'bg-[#FF0000]',
};

export function PostCard({ post, onCommentsClick, className }: PostCardProps) {
  const analytics = post.post_analytics?.[0];
  const firstPlatform = post.platforms[0];
  const content = post.content[firstPlatform];

  return (
    <Card className={cn("overflow-hidden hover:shadow-lg transition-shadow", className)}>
      {/* Media */}
      {post.media && post.media.length > 0 && (
        <div className="relative aspect-square bg-secondary-100">
          <img
            src={post.media[0].url}
            alt="Post media"
            className="w-full h-full object-cover"
          />
          {post.media.length > 1 && (
            <div className="absolute top-2 right-2 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
              +{post.media.length - 1}
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {post.platforms.map((platform) => (
              <Badge
                key={platform}
                className={cn(
                  "capitalize text-white",
                  platformColors[platform as keyof typeof platformColors]
                )}
              >
                {platform}
              </Badge>
            ))}
          </div>
          <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
            {post.status}
          </Badge>
        </div>

        {/* Content */}
        <p className="text-sm text-secondary-700 line-clamp-3 mb-3">
          {content?.text}
        </p>

        {/* Hashtags */}
        {content?.hashtags && content.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {content.hashtags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs text-primary-600">
                #{tag}
              </span>
            ))}
            {content.hashtags.length > 3 && (
              <span className="text-xs text-secondary-500">
                +{content.hashtags.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Analytics */}
        {analytics && (
          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-secondary-200">
            <button className="flex flex-col items-center p-2 rounded-lg hover:bg-secondary-50 transition-colors">
              <div className="flex items-center gap-1 text-secondary-600">
                <Heart className="h-4 w-4" />
                <span className="text-xs font-medium">
                  {analytics.likes?.toLocaleString() || 0}
                </span>
              </div>
              <span className="text-xs text-secondary-500 mt-1">Likes</span>
            </button>

            <button
              onClick={() => onCommentsClick?.(post)}
              className="flex flex-col items-center p-2 rounded-lg hover:bg-secondary-50 transition-colors"
            >
              <div className="flex items-center gap-1 text-secondary-600">
                <MessageCircle className="h-4 w-4" />
                <span className="text-xs font-medium">
                  {analytics.comments?.toLocaleString() || 0}
                </span>
              </div>
              <span className="text-xs text-secondary-500 mt-1">Comments</span>
            </button>

            <button className="flex flex-col items-center p-2 rounded-lg hover:bg-secondary-50 transition-colors">
              <div className="flex items-center gap-1 text-secondary-600">
                <Share2 className="h-4 w-4" />
                <span className="text-xs font-medium">
                  {analytics.shares?.toLocaleString() || 0}
                </span>
              </div>
              <span className="text-xs text-secondary-500 mt-1">Shares</span>
            </button>

            <button className="flex flex-col items-center p-2 rounded-lg hover:bg-secondary-50 transition-colors">
              <div className="flex items-center gap-1 text-secondary-600">
                <BarChart3 className="h-4 w-4" />
                <span className="text-xs font-medium">
                  {analytics.impressions?.toLocaleString() || 0}
                </span>
              </div>
              <span className="text-xs text-secondary-500 mt-1">Reach</span>
            </button>
          </div>
        )}

        {/* Date */}
        <p className="mt-3 text-xs text-center text-secondary-500">
          {post.published_at
            ? `Published ${new Date(post.published_at).toLocaleDateString()}`
            : post.scheduled_at
            ? `Scheduled for ${new Date(post.scheduled_at).toLocaleDateString()}`
            : `Created ${new Date(post.created_at).toLocaleDateString()}`}
        </p>
      </div>
    </Card>
  );
}

