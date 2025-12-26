"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpRight, ArrowDownRight, TrendingUp, BarChart3, Calendar } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Spinner } from "@/components/ui/spinner";

interface Props {
  workspaceId: string;
}

const PLATFORMS = [
  { value: "all", label: "All Platforms" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "twitter", label: "Twitter" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
];

const TIME_PERIODS = [
  { value: "7", label: "Last 7 Days" },
  { value: "30", label: "Last 30 Days" },
  { value: "90", label: "Last 90 Days" },
];

async function fetchComparativeData(
  workspaceId: string,
  platform: string,
  periodDays: string
) {
  const now = new Date();
  const to = now.toISOString();
  const from = new Date(now.getTime() - parseInt(periodDays) * 24 * 60 * 60 * 1000).toISOString();

  const params = new URLSearchParams({ from, to });

  if (platform !== "all") {
    params.append("platform", platform);
  }

  const response = await fetch(`/api/analytics/platform-stats?${params}`);
  if (!response.ok) {
    console.warn("Comparative analytics fetch failed:", response.status);
    return { success: true, data: [] };
  }
  return response.json();
}

export function ComparativeAnalytics({ workspaceId }: Props) {
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [comparisonPeriod, setComparisonPeriod] = useState("30");

  const { data: currentData, isLoading: currentLoading } = useQuery({
    queryKey: ["comparative-analytics", workspaceId, selectedPlatform, selectedPeriod],
    queryFn: () => fetchComparativeData(workspaceId, selectedPlatform, selectedPeriod),
    staleTime: 5 * 60 * 1000,
  });

  const { data: previousData, isLoading: previousLoading } = useQuery({
    queryKey: ["comparative-analytics-previous", workspaceId, selectedPlatform, comparisonPeriod],
    queryFn: () => fetchComparativeData(workspaceId, selectedPlatform, comparisonPeriod),
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = currentLoading || previousLoading;

  const currentMetrics = currentData?.data?.platformStats || {};
  const previousMetrics = previousData?.data?.platformStats || {};

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const formatChange = (change: number) => {
    const sign = change > 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}%`;
  };

  const platformComparisonData = PLATFORMS.filter((p) => p.value !== "all").map((platform) => {
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-gray-100 bg-white/95 backdrop-blur-md p-4 shadow-xl dark:border-gray-800 dark:bg-gray-900/95">
          <p className="text-sm font-medium text-gray-500 mb-2">{label}</p>
          <div className="space-y-2">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-gray-600 dark:text-gray-300">{entry.name}:</span>
                </div>
                <span className="font-semibold">{entry.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <Card className="border-secondary-100 shadow-sm hover:shadow-md transition-all duration-200 bg-white">
        <CardHeader className="pb-4 border-b border-secondary-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Period Comparison</CardTitle>
                <CardDescription>Analyze performance shifts over time</CardDescription>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <SelectTrigger className="w-[140px] h-9 bg-white border-secondary-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((platform) => (
                    <SelectItem key={platform.value} value={platform.value}>{platform.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-[130px] h-9 bg-white border-secondary-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_PERIODS.map((period) => (
                      <SelectItem key={period.value} value={period.value}>{period.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>vs</span>
                <Select value={comparisonPeriod} onValueChange={setComparisonPeriod}>
                  <SelectTrigger className="w-[130px] h-9 bg-white border-secondary-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_PERIODS.map((period) => (
                      <SelectItem key={period.value} value={period.value}>Prev {period.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            {["engagement", "reach", "posts"].map((metric) => {
              const currentValue = Object.values(currentMetrics).reduce(
                (sum: number, p: any) => sum + (p[metric] || 0), 0
              );
              const previousValue = Object.values(previousMetrics).reduce(
                (sum: number, p: any) => sum + (p[metric] || 0), 0
              );
              const change = calculateChange(currentValue, previousValue);
              const isPositive = change > 0;

              return (
                <div key={metric} className="rounded-xl border border-secondary-100 bg-secondary-50/50 p-4 hover:bg-white transition-colors duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium uppercase tracking-wider text-gray-500">{metric}</span>
                    <Badge variant={isPositive ? "success" : "error"} className={`h-5 px-1.5 text-[10px] ${isPositive ? 'bg-success-100 text-success-700' : 'bg-error-100 text-error-700'} border-0 shadow-none`}>
                      {isPositive ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                      {Math.abs(change).toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-secondary-900">
                      {currentValue.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-500">
                      from {previousValue.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="h-[350px] w-full mt-4">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <Spinner />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformComparisonData} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" strokeOpacity={0.4} />
                  <XAxis
                    dataKey="platform"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                    dx={-10}
                    tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.02)" }} />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} />
                  <Bar
                    dataKey="currentEngagement"
                    name="Current Period"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                    barSize={32}
                  />
                  <Bar
                    dataKey="previousEngagement"
                    name="Previous Period"
                    fill="#e2e8f0"
                    radius={[4, 4, 0, 0]}
                    barSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ComparativeAnalytics;

