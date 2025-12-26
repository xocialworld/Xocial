"use client";

import { useMemo, useState, useEffect, Component, ReactNode } from "react";
import dynamic from "next/dynamic";
import { RefreshCcw, Activity, Users, BarChart3, AlertTriangle, Zap, LayoutDashboard, FileText, PieChart, Timer } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader, PageContainer, ContentCard } from "@/components/shared/page-components";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Components
import { OverviewMetrics } from "./components/overview-metrics";
import { OverviewCards } from "./components/overview-cards";
import { AdvancedAnalyticsTable } from "./components/advanced-analytics-table";
import { DateRangeSelector } from "./components/date-range-selector";
import { ExportButton } from "./components/export-button";
import { AIInsights } from "./components/ai-insights";

// Hooks
import { useAnalytics } from "./hooks/useAnalytics";
import { useYoutubeAnalytics } from "./hooks/useYoutubeAnalytics";
import { useWorkspace } from "@/hooks/use-workspace";
import { getNavigationTiming } from "@/lib/performance-monitoring";

import "./analytics-styles.css";

// --- Dynamic Imports ---

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

const AudienceDemographics = dynamic(
  () => import("./components/audience-demographics").then((m) => m.AudienceDemographics),
  { ssr: false, loading: () => <Skeleton className="h-[300px] rounded-xl" /> }
);

const AudienceActivity = dynamic(
  () => import("./components/audience-activity").then((m) => m.AudienceActivity),
  { ssr: false, loading: () => <Skeleton className="h-[300px] rounded-xl" /> }
);

const YoutubeAnalyticsSection = dynamic(
  () => import("./components/youtube-analytics-section").then((m) => m.YoutubeAnalyticsSection),
  { ssr: false, loading: () => <Skeleton className="h-[300px] rounded-xl" /> }
);

const RealtimeMetrics = dynamic(
  () => import("./components/real-time-metrics").then((m) => m.RealtimeMetrics),
  { ssr: false, loading: () => <Skeleton className="h-[400px] rounded-xl" /> }
);

const PerformanceMetrics = dynamic(
  () => import("./components/performance-metrics").then((m) => m.PerformanceMetrics),
  { ssr: false, loading: () => <Skeleton className="h-[300px] rounded-xl" /> }
);


// --- Error Boundary ---

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ChartErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center h-[300px] bg-secondary-50 rounded-xl border border-secondary-200">
          <AlertTriangle className="h-10 w-10 text-warning-500 mb-3" />
          <p className="text-sm text-secondary-600">Failed to load component</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => this.setState({ hasError: false })}
          >
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Main Page Component ---

export default function AnalyticsPage() {
  // State
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    to: new Date(),
  });
  const [isLive, setIsLive] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Hooks
  const { workspace, loading: workspaceLoading, error: workspaceError } = useWorkspace();

  const {
    overview,
    engagementData,
    platformStats,
    topPosts,
    loading: analyticsLoading,
    error: analyticsError,
    refetch,
  } = useAnalytics(dateRange, false);

  const youtubeAnalytics = useYoutubeAnalytics(dateRange);

  // Derived Data
  const youtubeTopVideos = useMemo(
    () => topPosts.filter((post) => post.platform?.toLowerCase() === "youtube"),
    [topPosts]
  );

  const loading = workspaceLoading || analyticsLoading;
  const error = workspaceError || analyticsError;

  const overviewMetrics = useMemo(() => {
    if (!overview) return [];
    const getSparkline = (key: 'impressions' | 'engagement' | 'followers' | 'engagementRate') => {
      return overview.sparklineData?.map(d => ({ value: d[key] })) || [];
    };

    return [
      {
        label: "Total Posts",
        value: overview.totalPosts,
        change: overview.postsChange,
        trend: (overview.postsChange > 0 ? "up" : overview.postsChange < 0 ? "down" : "neutral") as "up" | "down" | "neutral",
        data: overview.sparklineData?.map(d => ({ value: d.posts })) || [],
        icon: FileText,
      },
      {
        label: "Total Engagement",
        value: overview.totalEngagement.toLocaleString(),
        change: overview.engagementChange,
        trend: (overview.engagementChange > 0 ? "up" : overview.engagementChange < 0 ? "down" : "neutral") as "up" | "down" | "neutral",
        data: getSparkline('engagement'),
        icon: Activity,
      },
      {
        label: "Engagement Rate",
        value: `${overview.avgEngagementRate.toFixed(2)}%`,
        change: overview.engagementRateChange,
        trend: (overview.engagementRateChange > 0 ? "up" : overview.engagementRateChange < 0 ? "down" : "neutral") as "up" | "down" | "neutral",
        data: getSparkline('engagementRate'),
        icon: Zap,
      },
      {
        label: "Total Followers",
        value: overview.totalFollowers.toLocaleString(),
        change: overview.followersChange,
        trend: (overview.followersChange > 0 ? "up" : overview.followersChange < 0 ? "down" : "neutral") as "up" | "down" | "neutral",
        data: getSparkline('followers'),
        icon: Users,
      },
    ];
  }, [overview]);

  // Handlers
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await Promise.all([refetch(), youtubeAnalytics.refresh()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Loading State
  if (loading && !overview) {
    return (
      <PageContainer>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <Spinner size="lg" />
          <p className="text-secondary-500 animate-pulse">Gathering analytics data...</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* 1. Header & Controls */}
      <div className="flex flex-col gap-6 mb-8">
        <PageHeader
          shortCode="A"
          title="Analytics"
          description="Comprehensive performance insights across all your channels."
          icon={BarChart3}
          iconColor="text-primary-500"
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing || isLive}
                className="gap-2 bg-white"
              >
                <RefreshCcw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">{isRefreshing ? "Refreshing" : "Refresh"}</span>
              </Button>
              <ExportButton dateRange={dateRange} />
            </div>
          }
        />

        {/* Global Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-secondary-100 bg-white p-4 shadow-sm">
          <DateRangeSelector value={dateRange} onChange={setDateRange} />

          <div className="flex items-center gap-6">
            <div className="hidden h-8 w-px bg-secondary-200 md:block" />

            <div className="flex items-center space-x-3">
              <Switch
                id="live-mode"
                checked={isLive}
                onCheckedChange={setIsLive}
              />
              <Label htmlFor="live-mode" className="flex items-center gap-2 cursor-pointer font-medium text-sm">
                Real-time Mode
                {isLive && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success-500"></span>
                  </span>
                )}
              </Label>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 2. Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="w-full justify-start overflow-x-auto no-scrollbar h-auto py-1.5 px-1 bg-transparent border-b border-secondary-200 rounded-none gap-6">
          <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary-500 rounded-none px-2 pb-3 pt-2 font-medium text-secondary-500 data-[state=active]:text-primary-600 gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="realtime" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary-500 rounded-none px-2 pb-3 pt-2 font-medium text-secondary-500 data-[state=active]:text-primary-600 gap-2">
            <Activity className="h-4 w-4" />
            Real-time
          </TabsTrigger>
          <TabsTrigger value="content" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary-500 rounded-none px-2 pb-3 pt-2 font-medium text-secondary-500 data-[state=active]:text-primary-600 gap-2">
            <FileText className="h-4 w-4" />
            Content
          </TabsTrigger>
          <TabsTrigger value="platforms" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary-500 rounded-none px-2 pb-3 pt-2 font-medium text-secondary-500 data-[state=active]:text-primary-600 gap-2">
            <PieChart className="h-4 w-4" />
            Platforms
          </TabsTrigger>
          <TabsTrigger value="audience" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary-500 rounded-none px-2 pb-3 pt-2 font-medium text-secondary-500 data-[state=active]:text-primary-600 gap-2">
            <Users className="h-4 w-4" />
            Audience
          </TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary-500 rounded-none px-2 pb-3 pt-2 font-medium text-secondary-500 data-[state=active]:text-primary-600 gap-2">
            <Timer className="h-4 w-4" />
            System
          </TabsTrigger>
        </TabsList>

        {/* Tab: Overview */}
        <TabsContent value="overview" className="space-y-8 animate-in fade-in-50 duration-500">
          <AIInsights />

          <OverviewCards metrics={overviewMetrics} loading={loading} />

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartErrorBoundary>
              {engagementData.length > 0 ? (
                <EngagementChart data={engagementData} />
              ) : (
                <EmptyChartState message="Engagement trends will appear here once you start publishing." />
              )}
            </ChartErrorBoundary>

            <ChartErrorBoundary>
              {workspace?.id && <ComparativeAnalytics workspaceId={workspace.id} />}
            </ChartErrorBoundary>
          </div>
        </TabsContent>

        {/* Tab: Real-time */}
        <TabsContent value="realtime" className="animate-in fade-in-50 duration-500">
          <div className="max-w-6xl mx-auto">
            {!isLive && (
              <Alert className="mb-6 border-blue-200 bg-blue-50 text-blue-800">
                <Zap className="h-4 w-4" />
                <AlertDescription>
                  Real-time mode is currently <strong>off</strong>. Enable it in the toolbar to see live updates.
                </AlertDescription>
                <Button variant="link" size="sm" onClick={() => setIsLive(true)} className="ml-2 h-auto p-0 text-blue-700 underline">
                  Turn On
                </Button>
              </Alert>
            )}
            {workspace?.id && <RealtimeMetrics workspaceId={workspace.id} isLive={isLive} />}
          </div>
        </TabsContent>

        {/* Tab: Content */}
        <TabsContent value="content" className="animate-in fade-in-50 duration-500">
          <AdvancedAnalyticsTable data={topPosts} loading={loading} />
        </TabsContent>

        {/* Tab: Platforms */}
        <TabsContent value="platforms" className="space-y-8 animate-in fade-in-50 duration-500">
          <ChartErrorBoundary>
            {platformStats.length > 0 ? (
              <PlatformComparison data={platformStats} />
            ) : (
              <EmptyChartState message="Connect platforms to see comparative performance." />
            )}
          </ChartErrorBoundary>

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
        </TabsContent>

        {/* Tab: Audience */}
        <TabsContent value="audience" className="space-y-6 animate-in fade-in-50 duration-500">
          <AudienceDemographics />
          <AudienceActivity />
        </TabsContent>

        {/* Tab: Performance (System) */}
        <TabsContent value="performance" className="animate-in fade-in-50 duration-500">
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-secondary-900">
                System Health & Performance
              </h3>
              <p className="text-sm text-secondary-500 mt-1">
                Real-time monitoring of application performance and responsiveness
              </p>
            </div>
            <PerformanceMetrics />
          </div>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

// --- Sub-components ---

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-[400px] items-center justify-center rounded-xl border border-dashed border-secondary-200 bg-secondary-50/50 p-6 text-sm text-secondary-500">
      <div className="text-center">
        <BarChart3 className="mx-auto h-10 w-10 text-secondary-300 mb-3" />
        <p>{message}</p>
      </div>
    </div>
  );
}
