"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Share2, Eye } from "lucide-react";

const topPosts = [
  {
    id: 1,
    platform: "Instagram",
    content: "Summer vibes 🌞 Check out our new collection!",
    impressions: 15420,
    engagement: 1234,
    likes: 892,
    comments: 234,
    shares: 108,
  },
  {
    id: 2,
    platform: "Facebook",
    content: "Exciting news! We're launching something special...",
    impressions: 12840,
    engagement: 987,
    likes: 654,
    comments: 198,
    shares: 135,
  },
  {
    id: 3,
    platform: "Twitter",
    content: "Just shipped our latest feature! 🚀",
    impressions: 9650,
    engagement: 765,
    likes: 543,
    comments: 123,
    shares: 99,
  },
];

export function TopPosts() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Performing Posts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topPosts.map((post, index) => (
            <div
              key={post.id}
              className="flex items-start gap-4 p-4 border border-secondary-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-primary-100 text-primary-700 rounded-full font-bold">
                #{index + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <Badge className="mb-2">{post.platform}</Badge>
                    <p className="text-sm text-secondary-700">{post.content}</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 mt-3">
                  <div className="flex items-center gap-2 text-sm text-secondary-600">
                    <Eye className="h-4 w-4" />
                    <span>{post.impressions.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-secondary-600">
                    <Heart className="h-4 w-4" />
                    <span>{post.likes.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-secondary-600">
                    <MessageCircle className="h-4 w-4" />
                    <span>{post.comments.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-secondary-600">
                    <Share2 className="h-4 w-4" />
                    <span>{post.shares.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

