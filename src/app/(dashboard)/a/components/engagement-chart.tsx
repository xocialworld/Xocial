'use client';

import { Card } from '@/components/ui/card';
import { 
  LineChart, 
  Line, 
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

export function EngagementChart({ data }: EngagementChartProps) {
  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Engagement Over Time</h3>
        <p className="text-sm text-gray-500 mt-1">
          Track likes, comments, and shares across all platforms
        </p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
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
          />
          <Legend 
            wrapperStyle={{
              paddingTop: '20px',
            }}
          />
          <Line 
            type="monotone" 
            dataKey="likes" 
            stroke="#ec4899" 
            strokeWidth={2}
            dot={{ fill: '#ec4899', r: 4 }}
            activeDot={{ r: 6 }}
            name="Likes"
          />
          <Line 
            type="monotone" 
            dataKey="comments" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 4 }}
            activeDot={{ r: 6 }}
            name="Comments"
          />
          <Line 
            type="monotone" 
            dataKey="shares" 
            stroke="#10b981" 
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 4 }}
            activeDot={{ r: 6 }}
            name="Shares"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
