'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface WeeklyRecommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionItems: string[];
  expectedImpact: string;
}

export interface BestTimeToPost {
  platform: string;
  dayOfWeek: string;
  hour: number;
  engagementScore: number;
  confidence: number;
}

export interface ContentIdea {
  id: string;
  title: string;
  description: string;
  platforms: string[];
  topic: string;
  trending: boolean;
  estimatedEngagement: string;
}

export interface PerformanceInsight {
  metric: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  insight: string;
  recommendation: string;
}

export function useStrategy() {
  const [weeklyRecommendations, setWeeklyRecommendations] = useState<WeeklyRecommendation[]>([]);
  const [bestTimes, setBestTimes] = useState<BestTimeToPost[]>([]);
  const [contentIdeas, setContentIdeas] = useState<ContentIdea[]>([]);
  const [performanceInsights, setPerformanceInsights] = useState<PerformanceInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStrategy();
  }, []);

  async function fetchStrategy() {
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Fetch all strategy data in parallel
      const [
        weeklyRes,
        bestTimesRes,
        contentIdeasRes,
        insightsRes
      ] = await Promise.all([
        fetch('/api/strategy/weekly'),
        fetch('/api/strategy/best-times'),
        fetch('/api/strategy/content-ideas'),
        fetch('/api/strategy/insights')
      ]);

      if (weeklyRes.ok) {
        const weeklyData = await weeklyRes.json();
        setWeeklyRecommendations(weeklyData.data || []);
      }

      if (bestTimesRes.ok) {
        const bestTimesData = await bestTimesRes.json();
        setBestTimes(bestTimesData.data || []);
      }

      if (contentIdeasRes.ok) {
        const contentIdeasData = await contentIdeasRes.json();
        setContentIdeas(contentIdeasData.data || []);
      }

      if (insightsRes.ok) {
        const insightsData = await insightsRes.json();
        setPerformanceInsights(insightsData.data || []);
      }

    } catch (err) {
      console.error('Strategy fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch strategy');
    } finally {
      setLoading(false);
    }
  }

  async function generateNewRecommendations() {
    try {
      setLoading(true);
      const response = await fetch('/api/strategy/generate', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to generate recommendations');
      }

      await fetchStrategy();
    } catch (err) {
      console.error('Generate recommendations error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate recommendations');
    } finally {
      setLoading(false);
    }
  }

  return {
    weeklyRecommendations,
    bestTimes,
    contentIdeas,
    performanceInsights,
    loading,
    error,
    refetch: fetchStrategy,
    generateNew: generateNewRecommendations,
  };
}

