'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, ExternalLink } from 'lucide-react';
import type { TopPost } from '../hooks/useAnalytics';
import { format } from 'date-fns';

interface TopPostsTableProps {
  posts: TopPost[];
}

type SortKey = 'engagement' | 'likes' | 'comments' | 'shares' | 'engagementRate';
type SortDirection = 'asc' | 'desc';

export function TopPostsTable({ posts }: TopPostsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('engagement');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const sortedPosts = [...posts].sort((a, b) => {
    const aValue = a[sortKey];
    const bValue = b[sortKey];
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      facebook: 'bg-blue-100 text-blue-800',
      instagram: 'bg-pink-100 text-pink-800',
      twitter: 'bg-sky-100 text-sky-800',
      linkedin: 'bg-indigo-100 text-indigo-800',
      youtube: 'bg-red-100 text-red-800',
      tiktok: 'bg-gray-100 text-gray-800',
    };
    return colors[platform.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const SortButton = ({ label, sortKey: key }: { label: string; sortKey: SortKey }) => (
    <button
      onClick={() => handleSort(key)}
      className="flex items-center gap-1 hover:text-gray-900 transition-colors"
    >
      {label}
      <ArrowUpDown className="w-3 h-3" />
    </button>
  );

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Top Performing Posts</h3>
        <p className="text-sm text-gray-500 mt-1">
          Your best content ranked by engagement
        </p>
      </div>

      <div className="overflow-x-auto" role="region" aria-label="Top posts table">
        <table className="w-full" role="table" aria-label="Top performing posts">
          <thead>
            <tr className="border-b border-gray-200">
              <th scope="col" className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                Content
              </th>
              <th scope="col" className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                Platform
              </th>
              <th scope="col" className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                Date
              </th>
              <th scope="col" className="text-center py-3 px-4 text-sm font-medium text-gray-600">
                <SortButton label="Likes" sortKey="likes" />
              </th>
              <th scope="col" className="text-center py-3 px-4 text-sm font-medium text-gray-600">
                <SortButton label="Comments" sortKey="comments" />
              </th>
              <th scope="col" className="text-center py-3 px-4 text-sm font-medium text-gray-600">
                <SortButton label="Shares" sortKey="shares" />
              </th>
              <th scope="col" className="text-center py-3 px-4 text-sm font-medium text-gray-600">
                <SortButton label="Total" sortKey="engagement" />
              </th>
              <th scope="col" className="text-center py-3 px-4 text-sm font-medium text-gray-600">
                <SortButton label="Rate" sortKey="engagementRate" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedPosts.map((post, index) => {
              const contentPreview = post.content?.trim()
                ? post.content
                : 'Untitled post';
              return (
              <tr 
                key={post.id} 
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="py-4 px-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate max-w-md">
                        {contentPreview}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <Badge className={getPlatformColor(post.platform)}>
                    {post.platform}
                  </Badge>
                </td>
                <td className="py-4 px-4">
                  <span className="text-sm text-gray-600">
                    {format(new Date(post.publishedAt), 'MMM d, yyyy')}
                  </span>
                </td>
                <td className="py-4 px-4 text-center">
                  <span className="text-sm text-gray-900">
                    {post.likes.toLocaleString()}
                  </span>
                </td>
                <td className="py-4 px-4 text-center">
                  <span className="text-sm text-gray-900">
                    {post.comments.toLocaleString()}
                  </span>
                </td>
                <td className="py-4 px-4 text-center">
                  <span className="text-sm text-gray-900">
                    {post.shares.toLocaleString()}
                  </span>
                </td>
                <td className="py-4 px-4 text-center">
                  <span className="text-sm font-medium text-gray-900">
                    {post.engagement.toLocaleString()}
                  </span>
                </td>
                <td className="py-4 px-4 text-center">
                  <span className="text-sm font-medium text-purple-600">
                    {post.engagementRate.toFixed(2)}%
                  </span>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sortedPosts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No posts found for the selected period</p>
        </div>
      )}
    </Card>
  );
}

