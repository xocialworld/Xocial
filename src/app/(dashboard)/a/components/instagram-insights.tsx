import { Card } from '@/components/ui/card';
import type { InstagramInsight } from '../hooks/useAnalytics';

interface InstagramInsightsProps {
  insights: InstagramInsight[];
}

const metricLabels: Record<string, string> = {
  impressions: 'Impressions',
  reach: 'Reach',
  follower_count: 'Followers',
  follower_count_new: 'New Followers',
  engagement: 'Engagement',
  saved: 'Saves',
  profile_views: 'Profile Views',
  website_clicks: 'Website Clicks',
};

export function InstagramInsights({ insights }: InstagramInsightsProps) {
  if (!insights.length) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Instagram Insights</h3>
        <p className="text-sm text-gray-500 mt-1">
          Key performance metrics fetched directly from the Instagram Graph API
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {insights.map((insight) => (
          <div key={insight.accountId} className="rounded-lg border border-gray-100 p-5 shadow-sm bg-gradient-to-br from-white to-gray-50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-base font-semibold text-gray-900">
                  {insight.name}
                </h4>
                {insight.handle && (
                  <p className="text-sm text-gray-500">@{insight.handle}</p>
                )}
              </div>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                Last {insight.period.replace('days_', '').replace('day', 'day')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <MetricTile label="Followers" value={insight.followers} />
              {Object.entries(insight.metrics)
                .filter(([key]) => metricLabels[key])
                .map(([key, value]) => (
                  <MetricTile key={key} label={metricLabels[key]} value={value} />
                ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function MetricTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-white border border-gray-100 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-semibold text-gray-900">{formatNumber(value)}</p>
    </div>
  );
}

function formatNumber(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}


