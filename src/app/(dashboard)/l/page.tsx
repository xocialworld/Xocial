'use client';

import { useStrategy } from './hooks/useStrategy';
import { WeeklyRecommendations } from './components/weekly-recommendations';
import { BestTimesChart } from './components/best-times-chart';
import { ContentIdeasGrid } from './components/content-ideas-grid';
import { PerformanceInsights } from './components/performance-insights';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function StrategyPage() {
  const {
    weeklyRecommendations,
    bestTimes,
    contentIdeas,
    performanceInsights,
    loading,
    error,
    refetch,
    generateNew,
  } = useStrategy();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading AI recommendations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Strategy & Learning</h1>
        <p className="text-muted-foreground mt-2">
          AI-powered insights and recommendations to optimize your social media strategy
        </p>
      </div>

      {/* Weekly Recommendations */}
      <WeeklyRecommendations 
        recommendations={weeklyRecommendations}
        onRefresh={generateNew}
        loading={loading}
      />

      {/* Best Times to Post */}
      <BestTimesChart bestTimes={bestTimes} />

      {/* Performance Insights */}
      <PerformanceInsights insights={performanceInsights} />

      {/* AI Content Ideas */}
      <ContentIdeasGrid ideas={contentIdeas} />
    </div>
  );
}

