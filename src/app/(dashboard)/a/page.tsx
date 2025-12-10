"use client";

import { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { RefreshCcw, MousePointerClick, Activity, Users, BarChart3 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader, PageContainer, ContentCard } from "@/components/shared/page-components";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OverviewMetrics } from "./components/overview-metrics";
import { OverviewCards } from "./components/overview-cards";
import { AdvancedAnalyticsTable } from "./components/advanced-analytics-table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DateRangeSelector } from "./components/date-range-selector";
import { ExportButton } from "./components/export-button";
import { useAnalytics } from "./hooks/useAnalytics";
import { useYoutubeAnalytics } from "./hooks/useYoutubeAnalytics";
import { useWorkspace } from "@/hooks/use-workspace";
import { getNavigationTiming } from "@/lib/performance-monitoring";

const EngagementChart = dynamic(
  () => import("./components/engagement-chart").then((m) => m.EngagementChart),
  { ssr: false, loading: () => <Skeleton className="h-[400px] rounded-xl" /> }
);

const PlatformComparison = dynamic(
  () => import("./components/platform-comparison").then((m) => m.PlatformComparison),
  { ssr: false, loading: () => <Skeleton className="h-[400px] rounded-xl" /> }
);

const ComparativeAnalytics = dynamic(
  () => import("./components/comparative-analytics").then((m) => m.ComparativeAnalytics),
  { ssr: false, loading: () => <Skeleton className="h-[400px] rounded-xl" /> }
);

const TopPostsTable = dynamic(
  () => import("./components/top-posts-table").then((m) => m.TopPostsTable),
  { ssr: false, loading: () => <Skeleton className="h-[300px] rounded-xl" /> }
);

const FacebookDemographics = dynamic(
  () => import("./components/facebook-demographics").then((m) => m.FacebookDemographics),
  { ssr: false, loading: () => <Skeleton className="h-[300px] rounded-xl" /> }
);

const YoutubeAnalyticsSection = dynamic(
  () => import("./components/youtube-analytics-section").then((m) => m.YoutubeAnalyticsSection),
  { ssr: false, loading: () => <Skeleton className="h-[300px] rounded-xl" /> }
);

const RealtimeMetrics = dynamic(
  () => import("./components/real-time-metrics").then((m) => m.RealtimeMetrics),
  { ssr: false, loading: () => <Skeleton className="h-[300px] rounded-xl" /> }
);

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });
  const [isLive, setIsLive] = useState(false);

  const {
    overview,
    engagementData,
    platformStats,
    topPosts,
    loading,
    error,
    refetch,
  } = useAnalytics(dateRange, isLive ? 5000 : false);

  const {
    workspace,
    loading: workspaceLoading,
    error: workspaceError,
  } = useWorkspace();

  const youtubeAnalytics = useYoutubeAnalytics(dateRange);
  const youtubeTopVideos = useMemo(
    () =>
      topPosts.filter((post) => post.platform?.toLowerCase() === "youtube"),
    [topPosts]
  );

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await Promise.all([refetch(), youtubeAnalytics.refresh()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const overviewMetrics = useMemo(() => {
    if (!overview) return [];

    // Helper to get sparkline data for a specific metric
    const getSparkline = (key: 'impressions' | 'engagement' | 'followers' | 'engagementRate') => {
      return overview.sparklineData?.map(d => ({ value: d[key] })) || [];
    };

    return [
      {
        label: "Total Posts",
        value: overview.totalPosts,
        change: overview.postsChange,
        trend: overview.postsChange > 0 ? "up" : overview.postsChange < 0 ? "down" : "neutral",
        data: overview.sparklineData?.map(d => ({ value: d.posts })) || [],
        icon: MousePointerClick, // Placeholder icon
      },
      {
        label: "Total Engagement",
        value: overview.totalEngagement.toLocaleString(),
        change: overview.engagementChange,
        trend: overview.engagementChange > 0 ? "up" : overview.engagementChange < 0 ? "down" : "neutral",
        data: getSparkline('engagement'),
        icon: Activity,
      },
      {
        label: "Engagement Rate",
        value: `${overview.avgEngagementRate.toFixed(2)}%`,
        change: overview.engagementRateChange,
        trend: overview.engagementRateChange > 0 ? "up" : overview.engagementRateChange < 0 ? "down" : "neutral",
        data: getSparkline('engagementRate'),
        icon: Users,
      },
      {
        label: "Total Followers",
        value: overview.totalFollowers.toLocaleString(),
        change: overview.followersChange,
        trend: overview.followersChange > 0 ? "up" : overview.followersChange < 0 ? "down" : "neutral",
        data: getSparkline('followers'),
        icon: Users,
      },
    ] as any[]; // Cast to any to avoid strict icon type issues for now
  }, [overview]);

  if (loading || workspaceLoading) {
    return (
      <PageContainer>
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner size="lg" />
        </div>
      </PageContainer>
    );
  }

  const showEmptyState = !loading && overview && overview.totalPosts === 0;

  return (
    <PageContainer>
      <PageHeader
        shortCode="A"
        title="Analyze"
        description="Multi-platform analytics with visual dashboards and AI summaries."
        icon={BarChart3}
        iconColor="text-orange-500"
        badge={isLive ? { label: 'Live', variant: 'success' } : undefined}
        actions={
          <div className="flex items-center gap-3">
            <ExportButton dateRange={dateRange} />
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || isLive}
              className="gap-2"
            >
              <RefreshCcw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{isRefreshing ? "Refreshing" : "Refresh"}</span>
            </Button>
          </div>
        }
      />

      <ContentCard className="mb-6" padding="md">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
          <div className="flex items-center space-x-2">
            <Switch
              id="live-mode"
              checked={isLive}
              onCheckedChange={setIsLive}
            />
            <Label htmlFor="live-mode" className="flex items-center gap-2 cursor-pointer">
              Live Mode
              {isLive && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
              )}
            </Label>
          </div>
        </div>
      </ContentCard>

      {(error || workspaceError) && (
        <Alert variant="destructive">
          <AlertDescription>{workspaceError || error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-6" aria-label="Analytics sections">
        <TabsList aria-label="Analytics navigation">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="audience">Audience</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="space-y-6">
            <OverviewCards metrics={overviewMetrics} loading={loading} />

            <div className="grid gap-6 lg:grid-cols-2">
              {engagementData.length > 0 ? (
                <EngagementChart data={engagementData} />
              ) : (
                <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
                  Engagement trends will appear once you start publishing content in this range.
                </div>
              )}
              {workspace?.id && (
                <ComparativeAnalytics workspaceId={workspace.id} />
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="trends">
          <div className="grid gap-6 lg:grid-cols-2">
            {engagementData.length > 0 ? (
              <EngagementChart data={engagementData} />
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
                Engagement trends will appear once you start publishing content in this range.
              </div>
            )}
            {workspace?.id && (
              <ComparativeAnalytics workspaceId={workspace.id} />
            )}
          </div>
        </TabsContent>

        <TabsContent value="platforms">
          <div className="space-y-6">
            {platformStats.length > 0 ? (
              <PlatformComparison data={platformStats} />
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
                Connect or publish to platforms to compare performance.
              </div>
            )}

            {workspace?.id && <RealtimeMetrics workspaceId={workspace.id} />}

            {youtubeAnalytics.accounts.length > 0 && (
              <YoutubeAnalyticsSection
                accounts={youtubeAnalytics.accounts}
                selectedAccountId={youtubeAnalytics.selectedAccountId}
                onAccountChange={youtubeAnalytics.setSelectedAccountId}
                metrics={youtubeAnalytics.metrics}
                daily={youtubeAnalytics.daily}
                loading={youtubeAnalytics.loading}
                error={youtubeAnalytics.error}
                topVideos={youtubeTopVideos}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="content">
          <AdvancedAnalyticsTable data={topPosts} loading={loading} />
        </TabsContent>

        <TabsContent value="audience">
          <div className="space-y-6">
            <FacebookDemographics />
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <div className="grid gap-6 lg:grid-cols-2" role="region" aria-label="Performance metrics">
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Navigation Timing</h3>
              <p className="mt-1 text-sm text-gray-600">Client-side load metrics for this page</p>
              <PerformanceMetrics />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {showEmptyState && (
        <ContentCard className="text-center py-12">
          <p className="text-lg font-medium text-secondary-700">No analytics data available yet</p>
          <p className="mt-2 text-sm text-secondary-500">Start publishing posts to unlock insights and recommendations.</p>
        </ContentCard>
      )}
    </PageContainer>
  );
}

function PerformanceMetrics() {
  const [metrics, setMetrics] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setMetrics(getNavigationTiming());
    }
  }, []);

  if (!metrics) {
    return <div className="mt-4"><Skeleton className="h-24 w-full rounded-md" /></div>;
  }

  const items = [
    { key: "dnsLookup", label: "DNS Lookup" },
    { key: "tcpConnection", label: "TCP Connection" },
    { key: "serverResponse", label: "Server Response" },
    { key: "domProcessing", label: "DOM Processing" },
    { key: "pageLoad", label: "Page Load" },
    { key: "domInteractive", label: "DOM Interactive" },
    { key: "domComplete", label: "DOM Complete" },
  ] as const;

  return (
    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4" role="table" aria-label="Navigation timing table">
      {items.map((item) => (
        <div key={item.key} className="rounded-lg border border-secondary-200 p-4" role="row">
          <div className="flex items-center justify-between" role="cell">
            <span className="text-sm text-secondary-700">{item.label}</span>
            <span className="text-sm font-semibold text-secondary-900">{Math.round(metrics[item.key])} ms</span>
          </div>
        </div>
      ))}
    </div>
  );
}

