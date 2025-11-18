"use client";

import { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { RefreshCcw } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OverviewMetrics } from "./components/overview-metrics";
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

  const {
    overview,
    engagementData,
    platformStats,
    topPosts,
    loading,
    error,
    refetch,
  } = useAnalytics(dateRange);
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

  if (loading || workspaceLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const showEmptyState = !loading && overview && overview.totalPosts === 0;

  return (
    <div className="space-y-8 p-6 md:p-8">
      <PageHeader
        title="A — Analyze"
        description="Multi-platform analytics with visual dashboards and AI summaries."
        breadcrumbs={[
          { label: "Dashboard", href: "/x" },
          { label: "Analytics" },
        ]}
      />

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCcw
                className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Refreshing" : "Refresh data"}
            </Button>
            <ExportButton dateRange={dateRange} />
          </div>
        </div>
      </div>

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
          {overview && (
            <div aria-live="polite" role="region" aria-label="Overview metrics">
              <OverviewMetrics metrics={overview} />
            </div>
          )}
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
          {topPosts.length > 0 ? (
            <TopPostsTable posts={topPosts} />
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
              We’ll highlight your top-performing posts once you start publishing.
            </div>
          )}
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
        <div className="rounded-xl bg-gray-50 py-12 text-center">
          <p className="text-lg font-medium text-gray-700">No analytics data available yet</p>
          <p className="mt-2 text-sm text-gray-500">Start publishing posts to unlock insights and recommendations.</p>
        </div>
      )}
    </div>
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

