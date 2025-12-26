'use client';

import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Users, Heart, BarChart3, FileText } from 'lucide-react';
import type { OverviewMetrics } from '../hooks/useAnalytics';

interface OverviewMetricsProps {
  metrics: OverviewMetrics;
}

export function OverviewMetrics({ metrics }: OverviewMetricsProps) {
  const cards = [
    {
      title: 'Total Followers',
      value: metrics.totalFollowers.toLocaleString(),
      change: metrics.followersChange,
      icon: Users,
      color: 'text-accent-indigo-500',
      bgColor: 'bg-accent-indigo-50',
    },
    {
      title: 'Total Engagement',
      value: metrics.totalEngagement.toLocaleString(),
      change: metrics.engagementChange,
      icon: Heart,
      color: 'text-accent-rose-500',
      bgColor: 'bg-accent-rose-50',
    },
    {
      title: 'Avg. Engagement Rate',
      value: `${metrics.avgEngagementRate.toFixed(2)}%`,
      change: metrics.engagementRateChange,
      icon: BarChart3,
      color: 'text-accent-violet-500',
      bgColor: 'bg-accent-violet-50',
    },
    {
      title: 'Total Posts',
      value: metrics.totalPosts.toLocaleString(),
      change: metrics.postsChange,
      icon: FileText,
      color: 'text-success-500',
      bgColor: 'bg-success-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const isPositive = card.change >= 0;
        const TrendIcon = isPositive ? TrendingUp : TrendingDown;

        return (
          <Card key={card.title} className="p-6 border-secondary-100 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-secondary-600 mb-1">
                  {card.title}
                </p>
                <p className="text-3xl font-bold text-secondary-900 mb-2">
                  {card.value}
                </p>
                <div className="flex items-center gap-1">
                  <TrendIcon
                    className={`w-4 h-4 ${isPositive ? 'text-success-500' : 'text-error-500'}`}
                  />
                  <span
                    className={`text-sm font-medium ${isPositive ? 'text-success-600' : 'text-error-600'}`}
                  >
                    {isPositive ? '+' : ''}{card.change.toFixed(1)}%
                  </span>
                  <span className="text-sm text-secondary-500 ml-1">vs last period</span>
                </div>
              </div>
              <div className={`p-3 rounded-lg ${card.bgColor}`}>
                <Icon className={`w-6 h-6 ${card.color}`} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

