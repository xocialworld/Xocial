'use client';

import { Card } from '@/components/ui/card';
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
} from 'recharts';
import type { PlatformStat } from '../hooks/useAnalytics';
import { Facebook, Instagram, Twitter, Linkedin, Youtube, Music2, LucideIcon } from 'lucide-react';

interface PlatformComparisonProps {
  data: PlatformStat[];
}

// Enhanced platform colors with gradients
const platformConfig: Record<string, { color: string; gradient: { start: string; end: string } }> = {
  facebook: { color: '#1877f2', gradient: { start: '#1877f2', end: '#0d5dc9' } },
  instagram: { color: '#e4405f', gradient: { start: '#f77737', end: '#e4405f' } },
  twitter: { color: '#1da1f2', gradient: { start: '#1da1f2', end: '#0c85d0' } },
  linkedin: { color: '#0a66c2', gradient: { start: '#0a66c2', end: '#074a8c' } },
  youtube: { color: '#ff0000', gradient: { start: '#ff0000', end: '#cc0000' } },
  tiktok: { color: '#000000', gradient: { start: '#00f2ea', end: '#ff0050' } },
};

const platformIcons: Record<string, LucideIcon> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
  tiktok: Music2,
};

export function PlatformComparison({ data }: PlatformComparisonProps) {
  const chartData = data.map(stat => ({
    ...stat,
    fill: platformConfig[stat.platform.toLowerCase()]?.color || '#6b7280',
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const platform = label?.toLowerCase();
      const config = platformConfig[platform];
      const Icon = platformIcons[platform];

      return (
        <div className="rounded-xl border-0 bg-white/95 backdrop-blur-md p-4 shadow-2xl">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
            {Icon && <Icon className={`h-5 w-5`} color={config?.color} />}
            <span className="font-semibold text-gray-900 capitalize">{label}</span>
          </div>
          <div className="space-y-2">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <span className="text-sm text-gray-600">{entry.name}</span>
                <span className="font-semibold text-gray-900">
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
    <div className="flex flex-wrap justify-center gap-4 pt-4">
      {payload?.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">{entry.value}</span>
        </div>
      ))}
    </div>
  );

  return (
    <Card className="relative overflow-hidden border-0 shadow-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-6" role="region" aria-label="Platform comparison chart">
      {/* Decorative gradient */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-purple-100/50 dark:from-purple-900/30 to-transparent rounded-full blur-3xl -z-10" />

      <div className="mb-6">
        <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
          Platform Comparison
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Compare performance across different social media platforms
        </p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} barGap={8}>
          <defs>
            {Object.entries(platformConfig).map(([platform, config]) => (
              <linearGradient key={platform} id={`bar-gradient-${platform}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={config.gradient.start} stopOpacity={0.9} />
                <stop offset="100%" stopColor={config.gradient.end} stopOpacity={0.7} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
          <XAxis
            dataKey="platform"
            stroke="#9ca3af"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            stroke="#9ca3af"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickFormatter={(value) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
              if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
              return value;
            }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Legend content={<CustomLegend />} />
          <Bar
            dataKey="followers"
            name="Followers"
            radius={[8, 8, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`followers-${index}`}
                fill={`url(#bar-gradient-${entry.platform.toLowerCase()})`}
              />
            ))}
          </Bar>
          <Bar
            dataKey="engagement"
            fill="#10b981"
            name="Engagement"
            radius={[8, 8, 0, 0]}
          />
          <Bar
            dataKey="posts"
            fill="#f59e0b"
            name="Posts"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
