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
  ResponsiveContainer 
} from 'recharts';
import type { PlatformStat } from '../hooks/useAnalytics';

interface PlatformComparisonProps {
  data: PlatformStat[];
}

export function PlatformComparison({ data }: PlatformComparisonProps) {
  const platformColors: Record<string, string> = {
    facebook: '#1877f2',
    instagram: '#e4405f',
    twitter: '#1da1f2',
    linkedin: '#0a66c2',
    youtube: '#ff0000',
    tiktok: '#000000',
  };

  const chartData = data.map(stat => ({
    ...stat,
    fill: platformColors[stat.platform.toLowerCase()] || '#6b7280',
  }));

  return (
    <Card className="p-6" role="region" aria-label="Platform comparison chart">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Platform Comparison</h3>
        <p className="text-sm text-gray-500 mt-1">
          Compare performance across different social media platforms
        </p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="platform" 
            stroke="#6b7280"
            style={{ fontSize: '12px', textTransform: 'capitalize' }}
          />
          <YAxis 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px',
            }}
            formatter={(value: number) => value.toLocaleString()}
          />
          <Legend 
            wrapperStyle={{
              paddingTop: '20px',
            }}
          />
          <Bar 
            dataKey="followers" 
            name="Followers"
            radius={[8, 8, 0, 0]}
          />
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
