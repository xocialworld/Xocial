"use client";

import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { OverviewMetrics } from "./components/overview-metrics";
import { EngagementChart } from "./components/engagement-chart";
import { PlatformComparison } from "./components/platform-comparison";
import { TopPostsTable } from "./components/top-posts-table";
import { DateRangeSelector } from "./components/date-range-selector";
import { ExportButton } from "./components/export-button";
import { useAnalytics } from "./hooks/useAnalytics";

export default function APage() {
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date(),
  });

  const { overview, engagementData, platformStats, topPosts, loading, error } = useAnalytics(dateRange);

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

