'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, Facebook, Instagram, Twitter, Linkedin, Youtube, Music2, Eye, Users, BarChart3 } from 'lucide-react';
import type { TopPost } from '../hooks/useAnalytics';
import { format } from 'date-fns';

interface TopPostsTableProps {
  posts: TopPost[];
}

type SortKey = 'engagement' | 'likes' | 'comments' | 'shares' | 'engagementRate';
type SortDirection = 'asc' | 'desc';

// Platform icon mapping
const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
  tiktok: Music2,
};

// Platform color mapping for badges
const platformColors: Record<string, { bg: string; text: string; border: string }> = {
  facebook: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  instagram: { bg: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-700 dark:text-pink-400', border: 'border-pink-200 dark:border-pink-800' },
  twitter: { bg: 'bg-sky-50 dark:bg-sky-900/20', text: 'text-sky-700 dark:text-sky-400', border: 'border-sky-200 dark:border-sky-800' },
  linkedin: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800' },
  youtube: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
  tiktok: { bg: 'bg-gray-50 dark:bg-gray-800/50', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700' },
};

// Platform-specific primary metric labels
const platformPrimaryMetric: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  youtube: { label: 'Views', icon: Eye },
  tiktok: { label: 'Views', icon: Eye },
  instagram: { label: 'Reach', icon: Users },
  facebook: { label: 'Reach', icon: Users },
  twitter: { label: 'Impressions', icon: BarChart3 },
  linkedin: { label: 'Impressions', icon: BarChart3 },
};

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

  const getPlatformBadge = (platform: string) => {
    const colors = platformColors[platform.toLowerCase()] || platformColors.facebook;
    const Icon = platformIcons[platform.toLowerCase()] || Facebook;
    return (
      <Badge className={`${colors.bg} ${colors.text} ${colors.border} border gap-1.5 font-medium`}>
        <Icon className="h-3 w-3" />
        <span className="capitalize">{platform}</span>
      </Badge>
    );
  };

  const SortButton = ({ label, sortKey: key }: { label: string; sortKey: SortKey }) => (
    <button
      onClick={() => handleSort(key)}
      className={`flex items-center gap-1 transition-colors ${sortKey === key
        ? 'text-blue-600 dark:text-blue-400 font-semibold'
        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
        }`}
    >
      {label}
      <ArrowUpDown className={`w-3 h-3 ${sortKey === key ? 'opacity-100' : 'opacity-50'}`} />
    </button>
  );

  const getRankGradient = (index: number) => {
    if (index === 0) return 'from-warning-400 to-warning-500'; // Gold (using warning scale which is amber-based)
    if (index === 1) return 'from-slate-300 to-slate-400'; // Silver
    if (index === 2) return 'from-orange-600 to-orange-700'; // Bronze
    return 'from-primary-500 to-accent-indigo';
  };

  return (
    <Card className="relative overflow-hidden border-secondary-100 shadow-lg bg-white">
      {/* Decorative gradient */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary-50/50 to-transparent rounded-full blur-3xl -z-10" />

      <div className="p-6">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-secondary-900">
            Top Performing Posts
          </h3>
          <p className="text-sm text-secondary-500 mt-1">
            Your best content ranked by engagement
          </p>
        </div>

        <div className="overflow-x-auto -mx-6 px-6" role="region" aria-label="Top posts table">
          <table className="w-full" role="table" aria-label="Top performing posts">
            <thead>
              <tr className="border-b border-secondary-100">
                <th scope="col" className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-secondary-500">
                  Content
                </th>
                <th scope="col" className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Platform
                </th>
                <th scope="col" className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Date
                </th>
                <th scope="col" className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <SortButton label="Likes" sortKey="likes" />
                </th>
                <th scope="col" className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <SortButton label="Comments" sortKey="comments" />
                </th>
                <th scope="col" className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <SortButton label="Shares" sortKey="shares" />
                </th>
                <th scope="col" className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <SortButton label="Total" sortKey="engagement" />
                </th>
                <th scope="col" className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <SortButton label="Rate" sortKey="engagementRate" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {sortedPosts.map((post, index) => {
                const contentPreview = post.content?.trim()
                  ? post.content
                  : 'Untitled post';
                return (
                  <tr
                    key={post.id}
                    className="group hover:bg-secondary-50/50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br ${getRankGradient(index)} flex items-center justify-center text-white text-sm font-bold shadow-md`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-secondary-900 truncate max-w-md group-hover:text-primary-600 transition-colors">
                            {contentPreview}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {getPlatformBadge(post.platform)}
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-secondary-500">
                        {format(new Date(post.publishedAt), 'MMM d, yyyy')}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-sm font-medium text-secondary-900">
                        {post.likes.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-sm font-medium text-secondary-900">
                        {post.comments.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-sm font-medium text-secondary-900">
                        {post.shares.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-sm font-bold text-secondary-900">
                        {post.engagement.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent-violet-100 text-accent-violet-700">
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
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400">No posts found for the selected period</p>
          </div>
        )}
      </div>
    </Card>
  );
}


