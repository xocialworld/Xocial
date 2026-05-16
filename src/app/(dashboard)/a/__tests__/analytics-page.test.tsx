import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnalyticsPage from '../page';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../hooks/useAnalytics', () => ({
  useAnalytics: () => ({
    overview: {
      totalFollowers: 1200,
      followersChange: 5.2,
      totalEngagement: 3400,
      engagementChange: 3.1,
      avgEngagementRate: 2.45,
      engagementRateChange: 0.8,
      totalPosts: 25,
      postsChange: 2.0,
    },
    engagementData: [
      { date: '2025-11-01', likes: 10, comments: 5, shares: 3, total: 18 },
    ],
    platformStats: [
      { platform: 'facebook', followers: 800, engagement: 1200, posts: 10, engagementRate: 1.5 },
    ],
    topPosts: [
      {
        id: '1',
        content: 'Test post',
        platform: 'facebook',
        publishedAt: new Date().toISOString(),
        likes: 10,
        comments: 2,
        shares: 1,
        engagement: 13,
        engagementRate: 1.3,
      },
    ],
    loading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock('../hooks/useYoutubeAnalytics', () => ({
  useYoutubeAnalytics: () => ({
    accounts: [],
    selectedAccountId: null,
    setSelectedAccountId: jest.fn(),
    metrics: null,
    daily: [],
    loading: false,
    error: null,
    refresh: jest.fn(),
  }),
}));

jest.mock('@/hooks/use-workspace', () => ({
  useWorkspace: () => ({ workspace: { id: 'ws_1' }, loading: false, error: null }),
}));

describe('AnalyticsPage', () => {
  it('renders tabs and overview metrics', async () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <AnalyticsPage />
      </QueryClientProvider>
    );

    expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /performance/i })).toBeInTheDocument();

    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
  });

  it('switches to Performance tab and shows navigation timing heading', async () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <AnalyticsPage />
      </QueryClientProvider>
    );
    await userEvent.click(screen.getByRole('tab', { name: /performance/i }));
    expect(await screen.findByText(/navigation timing/i)).toBeInTheDocument();
  });
});
