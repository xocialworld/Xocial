'use client';

import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format } from 'date-fns';
import type { YoutubeDailyPoint, YoutubeMetrics } from '../hooks/useYoutubeAnalytics';
import type { TopPost } from '../hooks/useAnalytics';
import type { SocialAccountMetrics } from '@/types';

interface YoutubeAnalyticsSectionProps {
  accounts: {
    id: string;
    account_name: string;
    follower_count?: number;
    metrics?: SocialAccountMetrics;
  }[];
  selectedAccountId: string | null;
  onAccountChange: (value: string) => void;
  metrics: YoutubeMetrics | null;
  daily: YoutubeDailyPoint[];
  loading: boolean;
  error: string | null;
  topVideos: TopPost[];
}

export function YoutubeAnalyticsSection({
  accounts,
  selectedAccountId,
  onAccountChange,
  metrics,
  daily,
  loading,
  error,
  topVideos,
}: YoutubeAnalyticsSectionProps) {
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId);
  const snapshotMetrics = selectedAccount?.metrics;
  const derivedMetrics = metrics ?? {
    totalViews: snapshotMetrics?.totalVideoViews ?? 0,
    totalWatchTimeMinutes: 0,
    averageViewDurationSeconds: 0,
    subscribersGained: 0,
    subscribersLost: 0,
    netSubscribers: 0,
    likes: snapshotMetrics?.totalLikes ?? 0,
    comments: snapshotMetrics?.totalComments ?? 0,
    shares: snapshotMetrics?.totalShares ?? 0,
    engagementRate: snapshotMetrics?.avgEngagementRate ?? 0,
  };
  const showsFallback = !metrics && Boolean(snapshotMetrics);

  // If no YouTube accounts are connected, show a helpful message instead of errors
  const hasNoAccounts = accounts.length === 0;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">YouTube Deep Dive</h2>
          <p className="text-sm text-gray-500">
            Professional-grade insights for watch time, retention, and audience growth
          </p>
        </div>

        {!hasNoAccounts && (
          <div className="w-full md:w-80">
            <Select
              value={selectedAccountId || undefined}
              onValueChange={onAccountChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select YouTube channel" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Show connect prompt when no accounts */}
      {hasNoAccounts && !loading && (
        <Card className="p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Your YouTube Channel</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Link your YouTube channel to unlock detailed analytics including watch time, subscriber trends, and video performance metrics.
          </p>
        </Card>
      )}

      {/* Only show error if we have accounts but API failed with a real error (not just no data) */}
      {error && !hasNoAccounts && selectedAccountId && !error.includes('Failed to load YouTube analytics') && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load YouTube analytics</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {!loading && !hasNoAccounts && (
        <>
          {showsFallback && (
            <Alert>
              <AlertTitle>Detailed analytics coming soon</AlertTitle>
              <AlertDescription>
                Showing channel statistics. YouTube Analytics API data will be available shortly after connecting.
              </AlertDescription>
            </Alert>
          )}

          {selectedAccount && (
            <Card className="p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Channel snapshot</h3>
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <SnapshotStat
                  label="Followers"
                  value={selectedAccount.follower_count?.toLocaleString() ?? '—'}
                />
                <SnapshotStat
                  label="Posts (90d)"
                  value={
                    snapshotMetrics
                      ? snapshotMetrics.postsPublished.toLocaleString()
                      : '0'
                  }
                />
                <SnapshotStat
                  label="Total engagement"
                  value={
                    snapshotMetrics
                      ? snapshotMetrics.totalEngagement.toLocaleString()
                      : '0'
                  }
                />
                <SnapshotStat
                  label="Avg. engagement rate"
                  value={`${(snapshotMetrics?.avgEngagementRate ?? 0).toFixed(2)}%`}
                />
              </div>
            </Card>
          )}

          {metrics && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Total Views"
                value={derivedMetrics.totalViews}
                helper="Last period"
              />
              <MetricCard
                title="Watch Time"
                value={derivedMetrics.totalWatchTimeMinutes / 60}
                helper="Hours watched"
                formatter={(value) => `${value.toFixed(1)}h`}
              />
              <MetricCard
                title="Avg. View Duration"
                value={derivedMetrics.averageViewDurationSeconds}
                helper="Per view"
                formatter={(value) => formatDuration(value)}
              />
              <MetricCard
                title="Subscribers"
                value={derivedMetrics.netSubscribers}
                helper={`+${derivedMetrics.subscribersGained} / -${derivedMetrics.subscribersLost}`}
                formatter={(value) => (value > 0 ? `+${value}` : `${value}`)}
              />
            </div>
          )}

          {metrics && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="p-6 lg:col-span-2">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Performance Trends</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Track how views and watch time evolve throughout the period
                  </p>
                </div>
                <ResponsiveContainer width="100%" height={360}>
                  <AreaChart data={formatDailyForChart(daily)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="label"
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '12px',
                      }}
                      formatter={(value: number, name) => {
                        if (name === 'Watch Time (h)') {
                          return [`${value.toFixed(2)}h`, name];
                        }
                        return [value.toLocaleString(), name];
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="Views"
                      stroke="#ef4444"
                      fillOpacity={0.15}
                      fill="#ef4444"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="Watch Time (h)"
                      stroke="#2563eb"
                      fillOpacity={0.1}
                      fill="#2563eb"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Audience Movement</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Visualize subscribers gained vs lost per day
                  </p>
                </div>
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={formatDailyForChart(daily)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="label"
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '12px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Subs Gained" fill="#22c55e" barSize={16} />
                    <Bar dataKey="Subs Lost" fill="#f97316" barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}

          <Card className="p-6">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Top YouTube Videos</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Ranked by total engagement rate to spotlight standout videos
                </p>
              </div>
              {selectedAccount && (
                <Badge className="bg-red-100 text-red-700">
                  {selectedAccount.account_name}
                </Badge>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="py-3 pr-4 font-medium">Video</th>
                    <th className="py-3 pr-4 font-medium">Published</th>
                    <th className="py-3 pr-4 font-medium text-right">Likes</th>
                    <th className="py-3 pr-4 font-medium text-right">Comments</th>
                    <th className="py-3 pr-4 font-medium text-right">Shares</th>
                    <th className="py-3 pr-0 font-medium text-right">Engagement Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {topVideos.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-gray-500">
                        No YouTube posts for this period
                      </td>
                    </tr>
                  )}
                  {topVideos.slice(0, 5).map((video) => (
                    <tr key={video.id} className="border-b border-gray-100">
                      <td className="py-4 pr-4">
                        <p className="line-clamp-2 text-gray-900">{video.content}</p>
                      </td>
                      <td className="py-4 pr-4 text-gray-600">
                        {format(new Date(video.publishedAt), 'MMM d, yyyy')}
                      </td>
                      <td className="py-4 pr-4 text-right text-gray-900">
                        {video.likes.toLocaleString()}
                      </td>
                      <td className="py-4 pr-4 text-right text-gray-900">
                        {video.comments.toLocaleString()}
                      </td>
                      <td className="py-4 pr-4 text-right text-gray-900">
                        {video.shares.toLocaleString()}
                      </td>
                      <td className="py-4 pr-0 text-right font-semibold text-purple-600">
                        {video.engagementRate.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </section>
  );
}

interface MetricCardProps {
  title: string;
  value: number;
  helper?: string;
  formatter?: (value: number) => string;
}

function MetricCard({ title, value, helper, formatter }: MetricCardProps) {
  const displayValue = formatter ? formatter(value) : value.toLocaleString();
  return (
    <Card className="p-5">
      <p className="text-sm uppercase tracking-wide text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{displayValue}</p>
      {helper && <p className="mt-1 text-xs text-gray-500">{helper}</p>}
    </Card>
  );
}

function SnapshotStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function formatDuration(seconds: number) {
  if (!seconds) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

function formatDailyForChart(daily: YoutubeDailyPoint[]) {
  return daily.map((item) => ({
    ...item,
    label: format(new Date(item.date), 'MMM d'),
    'Watch Time (h)': item.watchTimeMinutes / 60,
    Views: item.views,
    'Subs Gained': item.subscribersGained,
    'Subs Lost': item.subscribersLost,
  }));
}


