'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Youtube, 
  Eye, 
  ThumbsUp, 
  MessageSquare, 
  Users, 
  TrendingUp,
  ExternalLink,
  RefreshCcw
} from 'lucide-react';

interface YouTubeCardProps {
  accountId: string;
  workspaceId: string;
}

interface YouTubeData {
  channel: {
    id: string;
    name: string;
    description: string;
    thumbnail: string;
    customUrl?: string;
    subscribers: number;
    totalViews: number;
    videoCount: number;
  };
  recentPerformance: {
    views: number;
    likes: number;
    comments: number;
    videos: number;
  };
  recentVideos: Array<{
    id: string;
    title: string;
    publishedAt: string;
    thumbnail: string;
    views: number;
    likes: number;
    comments: number;
    permalink: string;
  }>;
}

export function YouTubeCard({ accountId, workspaceId }: YouTubeCardProps) {
  const [data, setData] = useState<YouTubeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [accountId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/analytics/youtube?accountId=${accountId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch YouTube analytics');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err: any) {
      console.error('Error fetching YouTube data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  if (loading && !data) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20">
            <Youtube className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20">
            <Youtube className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">YouTube Analytics</h3>
            <Badge variant="error">Error</Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCcw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20">
            <Youtube className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{data.channel.name}</h3>
            <p className="text-sm text-muted-foreground">
              {formatNumber(data.channel.subscribers)} subscribers
            </p>
          </div>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="ghost"
          size="icon"
          className="h-8 w-8"
        >
          <RefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Channel Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Eye className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">{formatNumber(data.channel.totalViews)}</p>
          <p className="text-xs text-muted-foreground">Total Views</p>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Users className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">{formatNumber(data.channel.subscribers)}</p>
          <p className="text-xs text-muted-foreground">Subscribers</p>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Youtube className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">{formatNumber(data.channel.videoCount)}</p>
          <p className="text-xs text-muted-foreground">Videos</p>
        </div>
      </div>

      {/* Recent Performance */}
      {data.recentPerformance.videos > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <h4 className="font-medium text-sm">Recent Performance</h4>
            <Badge variant="secondary" className="text-xs">
              Last {data.recentPerformance.videos} videos
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/10 rounded">
              <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm font-semibold">{formatNumber(data.recentPerformance.views)}</p>
                <p className="text-xs text-muted-foreground">Views</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/10 rounded">
              <ThumbsUp className="w-4 h-4 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm font-semibold">{formatNumber(data.recentPerformance.likes)}</p>
                <p className="text-xs text-muted-foreground">Likes</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-900/10 rounded">
              <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <div>
                <p className="text-sm font-semibold">{formatNumber(data.recentPerformance.comments)}</p>
                <p className="text-xs text-muted-foreground">Comments</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Videos */}
      {data.recentVideos.length > 0 && (
        <div>
          <h4 className="font-medium text-sm mb-3">Recent Videos</h4>
          <div className="space-y-2">
            {data.recentVideos.slice(0, 3).map((video) => (
              <div
                key={video.id}
                className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded-lg transition-colors group"
              >
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-20 h-14 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-2 mb-1">{video.title}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {formatNumber(video.views)}
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      {formatNumber(video.likes)}
                    </span>
                    <span>{formatDate(video.publishedAt)}</span>
                  </div>
                </div>
                <a
                  href={video.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View Channel Link */}
      <div className="mt-6 pt-4 border-t">
        <a
          href={`https://www.youtube.com/channel/${data.channel.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <Button variant="outline" className="w-full" size="sm">
            <Youtube className="w-4 h-4 mr-2" />
            View Channel on YouTube
            <ExternalLink className="w-3 h-3 ml-2" />
          </Button>
        </a>
      </div>
    </Card>
  );
}

