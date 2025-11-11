"use client";

import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
import { OverviewMetrics } from "./components/overview-metrics";
import { EngagementChart } from "./components/engagement-chart";
import { PlatformComparison } from "./components/platform-comparison";
import { TopPostsTable } from "./components/top-posts-table";
import { DateRangeSelector } from "./components/date-range-selector";
import { ExportButton } from "./components/export-button";
import { InstagramInsights } from "./components/instagram-insights";
import { YouTubeCard } from "./components/youtube-card";
import { useAnalytics } from "./hooks/useAnalytics";
import { createClient } from "@/lib/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export default function APage() {
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date(),
  });
  
  const [youtubeAccounts, setYoutubeAccounts] = useState<any[]>([]);
  const { workspace } = useWorkspace();
  const { overview, engagementData, platformStats, topPosts, instagramInsights, loading, error } = useAnalytics(dateRange);

  useEffect(() => {
    if (workspace) {
      fetchYouTubeAccounts();
    }
  }, [workspace]);

  const fetchYouTubeAccounts = async () => {
    if (!workspace) return;
    
    const supabase = createClient();
    const { data, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('workspace_id', workspace.id)
      .eq('platform', 'youtube')
      .eq('is_active', true);

    if (!error && data) {
      setYoutubeAccounts(data);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <p className="font-semibold">Failed to load analytics</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Analytics & Insights
            </h1>
            <p className="mt-2 text-gray-600">
              Track your social media performance and insights
            </p>
          </div>
          <ExportButton dateRange={dateRange} />
        </div>

        <DateRangeSelector 
          value={dateRange} 
          onChange={setDateRange} 
        />
      </div>

      {/* Overview KPI Cards */}
      {overview && <OverviewMetrics metrics={overview} />}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {engagementData.length > 0 && (
          <EngagementChart data={engagementData} />
        )}
        {platformStats.length > 0 && (
          <PlatformComparison data={platformStats} />
        )}
      </div>

      {/* Instagram Insights */}
      {instagramInsights.length > 0 && (
        <InstagramInsights insights={instagramInsights} />
      )}

      {/* YouTube Analytics Cards */}
      {youtubeAccounts.length > 0 && workspace && (
        <div>
          <h2 className="text-2xl font-bold mb-4">YouTube Analytics</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {youtubeAccounts.map((account) => (
              <YouTubeCard
                key={account.id}
                accountId={account.id}
                workspaceId={workspace.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Top Posts Table */}
      {topPosts.length > 0 && (
        <TopPostsTable posts={topPosts} />
      )}

      {/* Empty State */}
      {!loading && overview && overview.totalPosts === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 text-lg">No analytics data available yet</p>
          <p className="text-gray-500 text-sm mt-2">
            Start posting content to see your analytics here
          </p>
        </div>
      )}
    </div>
  );
}

