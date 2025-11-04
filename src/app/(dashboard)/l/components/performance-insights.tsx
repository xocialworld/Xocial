'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Lightbulb } from 'lucide-react';
import { PerformanceInsight } from '../hooks/useStrategy';

interface PerformanceInsightsProps {
  insights: PerformanceInsight[];
}

export function PerformanceInsights({ insights }: PerformanceInsightsProps) {
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'text-green-600 dark:text-green-400';
      case 'down':
        return 'text-red-600 dark:text-red-400';
      case 'stable':
        return 'text-yellow-600 dark:text-yellow-400';
    }
  };

  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Performance Insights
          </CardTitle>
          <CardDescription>
            AI-analyzed insights into your content performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No insights available yet. Post more content to see performance analysis.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Performance Insights
        </CardTitle>
        <CardDescription>
          AI-analyzed insights into your content performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.map((insight, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="font-semibold">{insight.metric}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold">{insight.value.toLocaleString()}</span>
                  <div className={`flex items-center gap-1 text-sm font-medium ${getTrendColor(insight.trend)}`}>
                    {getTrendIcon(insight.trend)}
                    <span>{Math.abs(insight.change)}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm">
                  <span className="font-medium">Insight: </span>
                  {insight.insight}
                </p>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                <p className="text-sm">
                  <span className="font-medium">💡 Recommendation: </span>
                  {insight.recommendation}
                </p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

