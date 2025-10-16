"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Post } from "@/types";
import { formatDate, getPlatformColor } from "@/lib/utils";
import { Heart, MessageCircle, Share2, Eye } from "lucide-react";
import Image from "next/image";

interface RecentPostsProps {
  posts: any[];
}

export function RecentPosts({ posts }: RecentPostsProps) {
  if (posts.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-secondary-300 p-12 text-center">
        <p className="text-secondary-600">No posts yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {posts.map((post) => (
        <Card key={post.id} className="overflow-hidden hover:shadow-md transition-shadow">
          <div className="relative h-48 bg-secondary-100">
            {post.media && post.media.length > 0 && (
              <Image
                src={post.media[0].url || "/placeholder.jpg"}
                alt="Post media"
                fill
                className="object-cover"
              />
            )}
            <div className="absolute top-2 left-2">
              {post.platforms.map((platform: string) => (
                <Badge
                  key={platform}
                  className="mr-1"
                  style={{
                    backgroundColor: getPlatformColor(platform),
                    color: "white",
                  }}
                >
                  {platform}
                </Badge>
              ))}
            </div>
          </div>
          <CardContent className="p-4">
            <p className="line-clamp-3 text-sm text-secondary-700 mb-3">
              {post.content?.text || "No caption"}
            </p>
            <div className="grid grid-cols-4 gap-2 text-xs text-secondary-600 mb-3">
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                <span>0</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                <span>0</span>
              </div>
              <div className="flex items-center gap-1">
                <Share2 className="h-3 w-3" />
                <span>0</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>0</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-secondary-500">
                {formatDate(post.created_at)}
              </p>
              <Badge variant={
                post.status === "published" ? "success" :
                post.status === "scheduled" ? "info" :
                post.status === "failed" ? "error" :
                "default"
              }>
                {post.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

