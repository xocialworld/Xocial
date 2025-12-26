'use client';

import { Card } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import type { EngagementDataPoint } from '../hooks/useAnalytics';

interface EngagementChartProps {
  data: EngagementDataPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border-0 bg-gray-900/95 backdrop-blur-md p-4 shadow-2xl">
        <p className="text-sm font-medium text-gray-300 mb-3">{label}</p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-400">{entry.name}</span>
              </div>
              <span className="font-semibold text-white">
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
  <div className="flex flex-wrap justify-center gap-6 pt-6">
    {payload?.map((entry: any, index: number) => (
      <div key={index} className="flex items-center gap-2 group cursor-pointer">
        <div
          className="w-3 h-3 rounded-full transition-transform group-hover:scale-125"
          style={{ backgroundColor: entry.color }}
        />
        <span className="text-sm text-secondary-600 group-hover:text-secondary-900 transition-colors">
          {entry.value}
        </span>
      </div>
    ))}
  </div>
);

export function EngagementChart({ data }: EngagementChartProps) {
  return (
    <Card
      className="relative overflow-hidden border-secondary-100 bg-white shadow-sm hover:shadow-md transition-all duration-200 p-6"
      role="region"
      aria-label="Engagement over time chart"
    >
      {/* Decorative gradient */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-primary-50 to-transparent rounded-full blur-3xl -z-10" />

      <div className="mb-6">
        <h3 className="text-xl font-bold text-secondary-900">
          Engagement Over Time
        </h3>
        <p className="text-sm text-secondary-500 mt-1">
          Track likes, comments, and shares across all platforms
        </p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="likesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ec4899" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#ec4899" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="commentsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="sharesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
          <XAxis
            dataKey="date"
            stroke="#9ca3af"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            stroke="#9ca3af"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickFormatter={(value) => {
              if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
              return value;
            }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#d1d5db', strokeDasharray: '5 5' }} />
          <Legend content={<CustomLegend />} />
          <Area
            type="monotone"
            dataKey="likes"
            stroke="#ec4899"
            fill="url(#likesGradient)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 6, fill: '#ec4899', stroke: '#fff', strokeWidth: 2 }}
            name="Likes"
          />
          <Area
            type="monotone"
            dataKey="comments"
            stroke="#3b82f6"
            fill="url(#commentsGradient)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
            name="Comments"
          />
          <Area
            type="monotone"
            dataKey="shares"
            stroke="#10b981"
            fill="url(#sharesGradient)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
            name="Shares"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
