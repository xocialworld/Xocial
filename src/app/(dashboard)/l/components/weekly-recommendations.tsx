'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, AlertCircle, CheckCircle2, Lightbulb } from 'lucide-react';
import { WeeklyRecommendation } from '../hooks/useStrategy';

interface WeeklyRecommendationsProps {
  recommendations: WeeklyRecommendation[];
  onRefresh: () => void;
  loading?: boolean;
}

const priorityConfig = {
  high: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: AlertCircle },
  medium: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: TrendingUp },
  low: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: Lightbulb },
};

export function WeeklyRecommendations({ recommendations, onRefresh, loading }: WeeklyRecommendationsProps) {
  if (recommendations.length === 0 && !loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Weekly Recommendations
          </CardTitle>
          <CardDescription>
            AI-powered suggestions to improve your social media strategy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No recommendations available yet.</p>
            <Button onClick={onRefresh} disabled={loading}>
              Generate Recommendations
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Weekly Recommendations
          </CardTitle>
          <CardDescription>
            AI-powered suggestions to improve your social media strategy
          </CardDescription>
        </div>
        <Button onClick={onRefresh} variant="secondary" size="sm" disabled={loading}>
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.map((rec, index) => {
          const config = priorityConfig[rec.priority];
          const Icon = config.icon;

          return (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <h4 className="font-semibold">{rec.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                  </div>
                </div>
                <Badge className={config.color}>
                  {rec.priority}
                </Badge>
              </div>

              {rec.actionItems.length > 0 && (
                <div className="ml-8 space-y-2">
                  <p className="text-sm font-medium">Action Items:</p>
                  <ul className="space-y-1">
                    {rec.actionItems.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {rec.expectedImpact && (
                <div className="ml-8 mt-3 p-3 bg-muted rounded-md">
                  <p className="text-sm">
                    <span className="font-medium">Expected Impact: </span>
                    {rec.expectedImpact}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

