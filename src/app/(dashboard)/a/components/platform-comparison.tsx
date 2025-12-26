"use client";

import { Card } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from "recharts";
import type { PlatformStat } from "../hooks/useAnalytics";
import { Facebook, Instagram, Twitter, Linkedin, Youtube, Music2, LucideIcon, BarChart3 } from "lucide-react";

interface PlatformComparisonProps {
  data: PlatformStat[];
}

const platformIcons: Record<string, LucideIcon> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
  tiktok: Music2,
};

export function PlatformComparison({ data }: PlatformComparisonProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const platform = label?.toLowerCase();
      const Icon = platformIcons[platform] || BarChart3;

      return (
        <div className="rounded-xl border border-secondary-100 bg-white/95 backdrop-blur-md p-4 shadow-xl">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-secondary-100">
            <Icon className="h-4 w-4 text-secondary-500" />
            <span className="font-semibold text-secondary-900 capitalize">{label}</span>
          </div>
          <div className="space-y-2">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-sm text-secondary-600 capitalize">{entry.name}</span>
                </div>
                <span className="font-mono font-medium text-secondary-900">
                  {entry.value?.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => (
    <div className="flex flex-wrap justify-center gap-6 pt-4">
      {payload?.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm font-medium text-secondary-600">{entry.value}</span>
        </div>
      ))}
    </div>
  );

  return (
    <Card className="relative overflow-hidden border-secondary-100 shadow-lg bg-white p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-secondary-900">
            Platform Comparison
          </h3>
          <p className="text-sm text-secondary-500 mt-1">
            Performance metrics across connected channels
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} barGap={4}>
          <defs>
            <linearGradient id="followersGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#6d28d9" stopOpacity={0.6} />
            </linearGradient>
            <linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#059669" stopOpacity={0.6} />
            </linearGradient>
            <linearGradient id="postsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#d97706" stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.3} vertical={false} />
          <XAxis
            dataKey="platform"
            stroke="#9ca3af"
            tick={{ fill: "#6b7280", fontSize: 12 }}
            tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
            axisLine={false}
            tickLine={false}
            dy={10}
          />
          <YAxis
            stroke="#9ca3af"
            tick={{ fill: "#6b7280", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
              if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
              return value;
            }}
            dx={-10}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.02)" }} />
          <Legend content={<CustomLegend />} />
          <Bar
            dataKey="followers"
            name="Followers"
            fill="url(#followersGradient)"
            radius={[4, 4, 0, 0]}
            maxBarSize={50}
          />
          <Bar
            dataKey="engagement"
            name="Engagement"
            fill="url(#engagementGradient)"
            radius={[4, 4, 0, 0]}
            maxBarSize={50}
          />
          <Bar
            dataKey="posts"
            name="Posts"
            fill="url(#postsGradient)"
            radius={[4, 4, 0, 0]}
            maxBarSize={50}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
