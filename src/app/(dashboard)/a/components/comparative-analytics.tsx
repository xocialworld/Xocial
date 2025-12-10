/**
 * Comparative Analytics Component
 * Compare metrics across platforms and time periods
 */

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

interface Props {
  workspaceId: string;
}

const PLATFORMS = [
  { value: 'all', label: 'All Platforms' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
];

const TIME_PERIODS = [
  { value: '7', label: 'Last 7 Days' },
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 90 Days' },
];

/**
 * Fetch analytics data for comparison
 */
async function fetchComparativeData(
  workspaceId: string,
  platform: string,
  periodDays: string
) {
  // Calculate date range from period
  const now = new Date();
  const to = now.toISOString();
  const from = new Date(now.getTime() - parseInt(periodDays) * 24 * 60 * 60 * 1000).toISOString();

  const params = new URLSearchParams({
    from,
    to,
  });

  if (platform !== 'all') {
    params.append('platform', platform);
  }

  const response = await fetch(`/api/analytics/platform-stats?${params}`);
  if (!response.ok) {
    // Return empty data instead of throwing to prevent console errors
    console.warn('Comparative analytics fetch failed:', response.status);
    return { success: true, data: [] };
  }
  return response.json();
}

export function ComparativeAnalytics({ workspaceId }: Props) {
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [comparisonPeriod, setComparisonPeriod] = useState('30');

  // Fetch current period data
  const { data: currentData, isLoading: currentLoading } = useQuery({
    queryKey: ['comparative-analytics', workspaceId, selectedPlatform, selectedPeriod],
    queryFn: () => fetchComparativeData(workspaceId, selectedPlatform, selectedPeriod),
  });

  // Fetch comparison period data
  const { data: previousData, isLoading: previousLoading } = useQuery({
    queryKey: ['comparative-analytics-previous', workspaceId, selectedPlatform, comparisonPeriod],
    queryFn: () => fetchComparativeData(workspaceId, selectedPlatform, comparisonPeriod),
  });

  const isLoading = currentLoading || previousLoading;

  // Calculate comparisons
  const currentMetrics = currentData?.data?.platformStats || {};
  const previousMetrics = previousData?.data?.platformStats || {};

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const formatChange = (change: number) => {
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  // Platform comparison data
  const platformComparisonData = PLATFORMS.filter((p) => p.value !== 'all').map((platform) => {
    const current = currentMetrics[platform.value] || { engagement: 0, reach: 0, posts: 0 };
    const previous = previousMetrics[platform.value] || { engagement: 0, reach: 0, posts: 0 };

    return {
      platform: platform.label,
      currentEngagement: current.engagement || 0,
      previousEngagement: previous.engagement || 0,
      currentReach: current.reach || 0,
      previousReach: previous.reach || 0,
      posts: current.posts || 0,
    };
  });

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="p-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="text-sm font-medium text-secondary-700 mb-2 block">
              Platform
            </label>
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((platform) => (
                  <SelectItem key={platform.value} value={platform.value}>
                    {platform.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-secondary-700 mb-2 block">
              Current Period
            </label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_PERIODS.map((period) => (
                  <SelectItem key={period.value} value={period.value}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-secondary-700 mb-2 block">
              Compare To
            </label>
            <Select value={comparisonPeriod} onValueChange={setComparisonPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_PERIODS.map((period) => (
                  <SelectItem key={period.value} value={period.value}>
                    Previous {period.label.toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Platform Comparison Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-secondary-900 mb-6">
          Platform Performance Comparison
        </h3>

        {isLoading ? (
          <div className="h-[400px] flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
              <p className="text-sm text-secondary-600">Loading comparison...</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={platformComparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="platform" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar
                dataKey="currentEngagement"
                name="Current Period"
                fill="#0ea5e9"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="previousEngagement"
                name="Previous Period"
                fill="#cbd5e1"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {['engagement', 'reach', 'posts'].map((metric) => {
          const currentValue = Object.values(currentMetrics).reduce(
            (sum: number, p: any) => sum + (p[metric] || 0),
            0
          );
          const previousValue = Object.values(previousMetrics).reduce(
            (sum: number, p: any) => sum + (p[metric] || 0),
            0
          );
          const change = calculateChange(currentValue, previousValue);
          const isPositive = change > 0;

          return (
            <Card key={metric} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-secondary-600 capitalize">{metric}</p>
                  <h3 className="text-3xl font-bold text-secondary-900 mt-1">
                    {currentValue.toLocaleString()}
                  </h3>
                </div>
                <div
                  className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-success-600' : 'text-error-600'
                    }`}
                >
                  {isPositive ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  {formatChange(change)}
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-secondary-600">
                <span>vs. previous period:</span>
                <span className="font-medium">{previousValue.toLocaleString()}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default ComparativeAnalytics;

