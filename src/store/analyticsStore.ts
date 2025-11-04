import { create } from 'zustand';
import { DashboardMetrics, PostAnalytics } from '@/types';

interface TimeRange {
  start: Date;
  end: Date;
  label: string;
}

interface AnalyticsState {
  metrics: DashboardMetrics | null;
  postAnalytics: PostAnalytics[];
  timeRange: TimeRange;
  selectedPlatforms: string[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // Actions
  setMetrics: (metrics: DashboardMetrics) => void;
  setPostAnalytics: (analytics: PostAnalytics[]) => void;
  setTimeRange: (timeRange: TimeRange) => void;
  setSelectedPlatforms: (platforms: string[]) => void;
  togglePlatform: (platform: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastUpdated: (date: Date) => void;
  getMetricChange: (metricKey: keyof DashboardMetrics) => number;
  getTotalEngagement: () => number;
  getAverageEngagementRate: () => number;
  reset: () => void;
}

const initialState = {
  metrics: null,
  postAnalytics: [],
  timeRange: {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end: new Date(),
    label: 'Last 30 days',
  },
  selectedPlatforms: [],
  isLoading: false,
  error: null,
  lastUpdated: null,
};

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  ...initialState,

  setMetrics: (metrics) =>
    set({ metrics, lastUpdated: new Date() }),

  setPostAnalytics: (analytics) =>
    set({ postAnalytics: analytics }),

  setTimeRange: (timeRange) =>
    set({ timeRange }),

  setSelectedPlatforms: (platforms) =>
    set({ selectedPlatforms: platforms }),

  togglePlatform: (platform) =>
    set((state) => {
      const platforms = state.selectedPlatforms.includes(platform)
        ? state.selectedPlatforms.filter((p) => p !== platform)
        : [...state.selectedPlatforms, platform];
      return { selectedPlatforms: platforms };
    }),

  setLoading: (loading) =>
    set({ isLoading: loading }),

  setError: (error) =>
    set({ error }),

  setLastUpdated: (date) =>
    set({ lastUpdated: date }),

  getMetricChange: (metricKey) => {
    const state = get();
    return state.metrics?.[metricKey]?.change || 0;
  },

  getTotalEngagement: () => {
    const state = get();
    return state.postAnalytics.reduce(
      (total, analytics) => total + analytics.engagement,
      0
    );
  },

  getAverageEngagementRate: () => {
    const state = get();
    if (state.postAnalytics.length === 0) return 0;

    const totalRate = state.postAnalytics.reduce(
      (total, analytics) => total + analytics.engagement_rate,
      0
    );

    return totalRate / state.postAnalytics.length;
  },

  reset: () =>
    set(initialState),
}));

