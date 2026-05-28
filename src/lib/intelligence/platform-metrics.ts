import type { Platform } from '@/types';

export type StandardizedPlatformMetrics = {
  views: number;
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  clicks: number;
  watch_time_seconds: number;
  follower_delta: number;
  engagement: number;
  engagement_rate: number;
  platformWeights: Record<string, number>;
};

function toNumber(value: unknown) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

const PLATFORM_WEIGHTS: Record<string, Record<string, number>> = {
  youtube: {
    views: 0.34,
    watch_time_seconds: 0.2,
    comments: 0.16,
    likes: 0.12,
    shares: 0.1,
    clicks: 0.08,
  },
  instagram: {
    reach: 0.24,
    saves: 0.22,
    shares: 0.2,
    comments: 0.14,
    likes: 0.12,
    clicks: 0.08,
  },
  facebook: {
    reach: 0.28,
    shares: 0.2,
    comments: 0.18,
    likes: 0.14,
    clicks: 0.12,
    views: 0.08,
  },
  tiktok: {
    views: 0.36,
    watch_time_seconds: 0.18,
    shares: 0.18,
    comments: 0.14,
    likes: 0.1,
    follower_delta: 0.04,
  },
  linkedin: {
    impressions: 0.28,
    clicks: 0.22,
    comments: 0.2,
    shares: 0.14,
    likes: 0.12,
    follower_delta: 0.04,
  },
  twitter: {
    impressions: 0.32,
    comments: 0.18,
    shares: 0.18,
    likes: 0.12,
    clicks: 0.14,
    saves: 0.06,
  },
  x: {
    impressions: 0.32,
    comments: 0.18,
    shares: 0.18,
    likes: 0.12,
    clicks: 0.14,
    saves: 0.06,
  },
  default: {
    views: 0.22,
    reach: 0.18,
    impressions: 0.16,
    likes: 0.12,
    comments: 0.12,
    saves: 0.08,
    shares: 0.08,
    clicks: 0.04,
  },
};

function platformKey(platform: Platform | string) {
  const normalized = String(platform || '').toLowerCase();
  return normalized === 'x' ? 'twitter' : normalized;
}

export function standardizePlatformMetrics(
  platform: Platform | string,
  metrics: Record<string, any>
): StandardizedPlatformMetrics {
  const source = metrics.statistics && typeof metrics.statistics === 'object' ? metrics.statistics : metrics;
  const views = toNumber(
    source.views ??
      source.viewCount ??
      source.video_views ??
      source.videoViews ??
      source.video_view_count ??
      source.playCount
  );
  const impressions = toNumber(
    source.impressions ??
      source.impression_count ??
      source.organic_impressions ??
      source.total_impressions ??
      views
  );
  const reach = toNumber(source.reach ?? source.accounts_reached ?? source.unique_views ?? views ?? impressions);
  const likes = toNumber(source.likes ?? source.likeCount ?? source.like_count ?? source.favorite_count);
  const comments = toNumber(
    source.comments ?? source.commentCount ?? source.comment_count ?? source.reply_count ?? source.replies
  );
  const saves = toNumber(
    source.saves ?? source.saved ?? source.favoriteCount ?? source.bookmark_count ?? source.bookmarks
  );
  const shares = toNumber(
    source.shares ??
      source.shareCount ??
      source.share_count ??
      source.retweet_count ??
      source.retweets ??
      source.reposts
  );
  const clicks = toNumber(
    source.clicks ?? source.url_link_clicks ?? source.link_clicks ?? source.website_clicks
  );
  const watchTimeSeconds = toNumber(
    source.watch_time_seconds ??
      source.watchTimeSeconds ??
      source.watch_time ??
      source.total_watch_time_seconds ??
      source.estimatedMinutesWatched * 60
  );
  const followerDelta = toNumber(
    source.follower_delta ?? source.followers_gain ?? source.follower_count_delta ?? source.new_followers
  );
  const engagement =
    toNumber(source.engagement) || likes + comments * 2 + shares * 3 + saves * 2 + clicks;
  const exposure = Math.max(views, reach, impressions);
  const engagementRate = exposure > 0 ? Number(((engagement / exposure) * 100).toFixed(3)) : 0;

  return {
    views: views || impressions || reach,
    reach,
    impressions,
    likes,
    comments,
    saves,
    shares,
    clicks,
    watch_time_seconds: watchTimeSeconds,
    follower_delta: followerDelta,
    engagement,
    engagement_rate: engagementRate,
    platformWeights: PLATFORM_WEIGHTS[platformKey(platform)] || PLATFORM_WEIGHTS.default,
  };
}

export function scorePlatformMetrics(
  platform: Platform | string,
  metrics: StandardizedPlatformMetrics
) {
  const weights = PLATFORM_WEIGHTS[platformKey(platform)] || PLATFORM_WEIGHTS.default;
  const exposure = Math.max(metrics.views, metrics.reach, metrics.impressions);
  const scaleScore = exposure > 0 ? Math.log10(exposure + 1) * 13 : 0;
  const weightedInteractionScore = Object.entries(weights).reduce((sum, [metric, weight]) => {
    const value = Number((metrics as any)[metric] || 0);
    if (['views', 'reach', 'impressions', 'watch_time_seconds'].includes(metric)) {
      return sum + Math.log10(value + 1) * 12 * weight;
    }
    return sum + value * weight;
  }, 0);
  const engagementRateScore = metrics.engagement_rate * 8;
  const conversationBonus = Math.min(14, metrics.comments * 1.4);
  const retentionBonus = Math.min(14, Math.log10(metrics.watch_time_seconds + 1) * 4);

  return clamp(Math.round(scaleScore + weightedInteractionScore + engagementRateScore + conversationBonus + retentionBonus));
}

export function explainPlatformOutcome(
  platform: Platform | string,
  score: number,
  baseline: number,
  metrics: StandardizedPlatformMetrics
) {
  const platformName = String(platform || 'platform');
  const exposure = Math.max(metrics.views, metrics.reach, metrics.impressions);
  const strongest = Object.entries(metrics.platformWeights)
    .map(([metric, weight]) => ({
      metric,
      value: Number((metrics as any)[metric] || 0),
      weightedValue: Number((metrics as any)[metric] || 0) * weight,
    }))
    .sort((a, b) => b.weightedValue - a.weightedValue)
    .slice(0, 2)
    .filter((item) => item.value > 0)
    .map((item) => `${item.metric.replace(/_/g, ' ')} ${item.value}`);
  const driver = strongest.length ? ` Main driver: ${strongest.join(', ')}.` : '';

  if (baseline > 0 && score >= baseline + 12) {
    return `${platformName} is outperforming baseline by ${score - baseline} points on ${exposure} exposure.${driver}`;
  }
  if (baseline > 0 && score <= baseline - 12) {
    return `${platformName} is under baseline by ${baseline - score} points; review hook, CTA, media fit, timing, or platform format.${driver}`;
  }
  if (score >= 70) {
    return `Strong ${platformName} result with ${metrics.engagement} weighted engagements on ${exposure} exposure.${driver}`;
  }
  if (score <= 35) {
    return `Weak ${platformName} signal; use this as negative learning for hook, creative, timing, or platform fit.${driver}`;
  }
  return `Average ${platformName} result with ${metrics.engagement} weighted engagements on ${exposure} exposure.${driver}`;
}
