'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { BestTimeToPost } from '../hooks/useStrategy';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BestTimesChartProps {
  bestTimes: BestTimeToPost[];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function BestTimesChart({ bestTimes }: BestTimesChartProps) {
  // Group by platform
  const platforms = Array.from(new Set(bestTimes.map(t => t.platform)));

  const getTimesByPlatform = (platform: string) => {
    return bestTimes.filter(t => t.platform === platform);
  };

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  const getEngagementColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  if (bestTimes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Best Times to Post
          </CardTitle>
          <CardDescription>
            Optimal posting times based on your audience engagement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No data available. Post more content to see recommendations.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Best Times to Post
        </CardTitle>
        <CardDescription>
          Optimal posting times based on your audience engagement
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={platforms[0]} className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${platforms.length}, 1fr)` }}>
            {platforms.map(platform => (
              <TabsTrigger key={platform} value={platform} className="capitalize">
                {platform}
              </TabsTrigger>
            ))}
          </TabsList>
          {platforms.map(platform => {
            const times = getTimesByPlatform(platform);
            
            return (
              <TabsContent key={platform} value={platform} className="space-y-4 mt-4">
                <div className="grid gap-3">
                  {times.slice(0, 5).map((time, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{time.dayOfWeek}</span>
                          <span className="text-muted-foreground">at</span>
                          <span className="font-medium">{formatHour(time.hour)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${getEngagementColor(time.engagementScore)}`}
                              style={{ width: `${time.engagementScore}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {time.engagementScore}%
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Confidence</div>
                        <div className="text-lg font-semibold">{time.confidence}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}

