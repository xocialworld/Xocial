"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
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
} from "recharts";
import { format } from "date-fns";
import { Youtube, MonitorPlay, Users, Clock, Eye, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import type { YoutubeDailyPoint, YoutubeMetrics } from "../hooks/useYoutubeAnalytics";
import type { TopPost } from "../hooks/useAnalytics";
import type { SocialAccountMetrics } from "@/types";

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
  const hasNoAccounts = accounts.length === 0;

  return (
    <section className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <Youtube className="h-5 w-5 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-secondary-900">
              YouTube Deep Dive
            </h2>
          </div>
          <p className="text-sm text-secondary-500 max-w-2xl">
            Professional-grade insights for watch time, retention, and audience growth
          </p>
        </div>

        {!hasNoAccounts && (
          <div className="w-full md:w-80">
            <Select
              value={selectedAccountId || undefined}
              onValueChange={onAccountChange}
            >
              <SelectTrigger className="bg-white border-secondary-100">
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

      {hasNoAccounts && !loading && (
        <Card className="p-8 text-center border-dashed border-2 bg-secondary-50/50">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
            <Youtube className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-secondary-900 mb-2">Connect Your YouTube Channel</h3>
          <p className="text-sm text-secondary-500 max-w-md mx-auto">
            Link your YouTube channel to unlock detailed analytics including watch time, subscriber trends, and video performance metrics.
          </p>
        </Card>
      )}

      {error && !hasNoAccounts && selectedAccountId && !error.includes("Failed to load YouTube analytics") && (
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
            <Alert className="bg-blue-50 border-blue-200 text-blue-800">
              <AlertTitle className="flex items-center gap-2">
                <MonitorPlay className="h-4 w-4" /> Detailed analytics coming soon
              </AlertTitle>
              <AlertDescription>
                Showing channel statistics. YouTube Analytics API data will be available shortly after connecting.
              </AlertDescription>
            </Alert>
          )}

          {selectedAccount && (
            <Card className="border-secondary-100 shadow-sm bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-secondary-900">Channel Snapshot</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                  <SnapshotStat
                    label="Followers"
                    value={selectedAccount.follower_count?.toLocaleString() ?? "—"}
                  />
                  <SnapshotStat
                    label="Posts (90d)"
                    value={
                      snapshotMetrics
                        ? snapshotMetrics.postsPublished.toLocaleString()
                        : "0"
                    }
                  />
                  <SnapshotStat
                    label="Total engagement"
                    value={
                      snapshotMetrics
                        ? snapshotMetrics.totalEngagement.toLocaleString()
                        : "0"
                    }
                  />
                  <SnapshotStat
                    label="Avg. engagement rate"
                    value={`${(snapshotMetrics?.avgEngagementRate ?? 0).toFixed(2)}%`}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {metrics && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Total Views"
                value={derivedMetrics.totalViews}
                helper="Last period"
                icon={Eye}
                color="text-info-500"
                bg="bg-info-500/10"
              />
              <MetricCard
                title="Watch Time"
                value={derivedMetrics.totalWatchTimeMinutes / 60}
                helper="Hours watched"
                formatter={(value) => `${value.toFixed(1)}h`}
                icon={Clock}
                color="text-accent-violet"
                bg="bg-accent-violet/10"
              />
              <MetricCard
                title="Avg. View Duration"
                value={derivedMetrics.averageViewDurationSeconds}
                helper="Per view"
                formatter={(value) => formatDuration(value)}
                icon={MonitorPlay}
                color="text-accent-indigo"
                bg="bg-accent-indigo/10"
              />
              <MetricCard
                title="Subscribers"
                value={derivedMetrics.netSubscribers}
                helper={`+${derivedMetrics.subscribersGained} / -${derivedMetrics.subscribersLost}`}
                formatter={(value) => (value > 0 ? `+${value}` : `${value}`)}
                icon={Users}
                color="text-success-500"
                bg="bg-success-500/10"
              />
            </div>
          )}

          {metrics && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2 border-secondary-100 shadow-lg bg-white">
                <CardHeader>
                  <CardTitle>Performance Trends</CardTitle>
                  <CardDescription>Track views and watch time evolution</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[360px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={formatDailyForChart(daily)}>
                        <defs>
                          <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorWatchTime" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(262, 83%, 65%)" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="hsl(262, 83%, 65%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} strokeOpacity={0.5} />
                        <XAxis
                          dataKey="label"
                          stroke="#6b7280"
                          style={{ fontSize: "12px" }}
                          axisLine={false}
                          tickLine={false}
                          dy={10}
                        />
                        <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} axisLine={false} tickLine={false} dx={-10} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--tooltip-bg, #fff)',
                            border: '1px solid var(--tooltip-border, #e5e7eb)',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          }}
                          formatter={(value: number, name) => {
                            if (name === "Watch Time (h)") {
                              return [`${value.toFixed(2)}h`, name];
                            }
                            return [value.toLocaleString(), name];
                          }}
                        />
                        <Legend wrapperStyle={{ paddingTop: "20px" }} />
                        <Area
                          type="monotone"
                          dataKey="Views"
                          stroke="hsl(199, 89%, 48%)"
                          fillOpacity={1}
                          fill="url(#colorViews)"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="Watch Time (h)"
                          stroke="hsl(262, 83%, 65%)"
                          fillOpacity={1}
                          fill="url(#colorWatchTime)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-secondary-100 shadow-lg bg-white">
                <CardHeader>
                  <CardTitle>Audience Movement</CardTitle>
                  <CardDescription>Subscribers gained vs lost</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[360px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={formatDailyForChart(daily)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} strokeOpacity={0.5} />
                        <XAxis
                          dataKey="label"
                          stroke="#6b7280"
                          style={{ fontSize: "12px" }}
                          axisLine={false}
                          tickLine={false}
                          dy={10}
                        />
                        <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} axisLine={false} tickLine={false} dx={-10} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--tooltip-bg, #fff)',
                            border: '1px solid var(--tooltip-border, #e5e7eb)',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          }}
                        />
                        <Legend wrapperStyle={{ paddingTop: "20px" }} />
                        <Bar dataKey="Subs Gained" fill="hsl(160, 84%, 42%)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Subs Lost" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card className="border-secondary-100 shadow-lg bg-white">
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between pb-4">
              <div>
                <CardTitle>Top YouTube Videos</CardTitle>
                <CardDescription>
                  Ranked by total engagement rate to spotlight standout videos
                </CardDescription>
              </div>
              {selectedAccount && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  <Youtube className="w-3 h-3 mr-1" />
                  {selectedAccount.account_name}
                </Badge>
              )}
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-secondary-100 text-left text-secondary-500 bg-secondary-50/50">
                    <th className="py-3 px-4 font-medium first:rounded-tl-lg">Video</th>
                    <th className="py-3 px-4 font-medium">Published</th>
                    <th className="py-3 px-4 font-medium text-right">Likes</th>
                    <th className="py-3 px-4 font-medium text-right">Comments</th>
                    <th className="py-3 px-4 font-medium text-right">Shares</th>
                    <th className="py-3 px-4 font-medium text-right last:rounded-tr-lg">Engagement Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {topVideos.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        No YouTube posts for this period
                      </td>
                    </tr>
                  )}
                  {topVideos.slice(0, 5).map((video) => (
                    <tr key={video.id} className="border-b border-secondary-100 hover:bg-secondary-50/50 transition-colors">
                      <td className="py-4 px-4">
                        <p className="line-clamp-2 text-secondary-900 font-medium">{video.content}</p>
                      </td>
                      <td className="py-4 px-4 text-secondary-600">
                        {format(new Date(video.publishedAt), "MMM d, yyyy")}
                      </td>
                      <td className="py-4 px-4 text-right text-secondary-900">
                        {video.likes.toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-right text-secondary-900">
                        {video.comments.toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-right text-secondary-900">
                        {video.shares.toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-right font-semibold text-accent-violet-600">
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
  icon?: any;
  color?: string;
  bg?: string;
}

function MetricCard({ title, value, helper, formatter, icon: Icon, color, bg }: MetricCardProps) {
  const displayValue = formatter ? formatter(value) : value.toLocaleString();
  return (
    <Card className="border-secondary-100 shadow-sm bg-white hover:shadow-md transition-all duration-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-secondary-500 uppercase tracking-wide">{title}</p>
            <p className="mt-2 text-3xl font-bold text-secondary-900">{displayValue}</p>
            {helper && <p className="mt-1 text-xs text-secondary-500">{helper}</p>}
          </div>
          {Icon && (
            <div className={`p-2 rounded-lg ${bg || 'bg-secondary-100'}`}>
              <Icon className={`h-5 w-5 ${color || 'text-secondary-500'}`} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SnapshotStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-secondary-50 rounded-lg">
      <p className="text-xs uppercase tracking-wide text-secondary-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-secondary-900">{value}</p>
    </div>
  );
}

function formatDuration(seconds: number) {
  if (!seconds) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

function formatDailyForChart(daily: YoutubeDailyPoint[]) {
  return daily.map((item) => ({
    ...item,
    label: format(new Date(item.date), "MMM d"),
    "Watch Time (h)": item.watchTimeMinutes / 60,
    Views: item.views,
    "Subs Gained": item.subscribersGained,
    "Subs Lost": item.subscribersLost,
  }));
}


