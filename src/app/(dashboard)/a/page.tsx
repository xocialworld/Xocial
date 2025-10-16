"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricCard } from "./components/metric-card";
import { EngagementChart } from "./components/engagement-chart";
import { PlatformComparison } from "./components/platform-comparison";
import { TopPosts } from "./components/top-posts";
import { Download, Calendar } from "lucide-react";

export default function APage() {
  const [dateRange, setDateRange] = useState("30");

  // Mock data
  const metrics = {
    impressions: {
      value: 125000,
      change: 12.5,
      trend: "up" as const,
    },
    engagement: {
      value: 8420,
      change: 8.3,
      trend: "up" as const,
    },
    followers: {
      value: 15234,
      change: 5.2,
      trend: "up" as const,
    },
    engagementRate: {
      value: 4.2,
      change: -0.3,
      trend: "down" as const,
    },
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-secondary-900">
              Analytics & Insights
            </h1>
            <p className="mt-2 text-secondary-600">
              Track your social media performance and insights
            </p>
          </div>
          <div className="flex gap-2">
            <select
              className="px-4 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="custom">Custom Range</option>
            </select>
            <Button variant="secondary">
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Impressions"
          value={metrics.impressions.value}
          change={metrics.impressions.change}
          trend={metrics.impressions.trend}
        />
        <MetricCard
          title="Total Engagement"
          value={metrics.engagement.value}
          change={metrics.engagement.change}
          trend={metrics.engagement.trend}
        />
        <MetricCard
          title="Total Followers"
          value={metrics.followers.value}
          change={metrics.followers.change}
          trend={metrics.followers.trend}
        />
        <MetricCard
          title="Engagement Rate"
          value={metrics.engagementRate.value}
          change={metrics.engagementRate.change}
          trend={metrics.engagementRate.trend}
          suffix="%"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <EngagementChart />
        <PlatformComparison />
      </div>

      {/* Top Posts */}
      <TopPosts />
    </div>
  );
}

