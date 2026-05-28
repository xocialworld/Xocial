import type { SupabaseClient } from '@supabase/supabase-js';
import type { Platform } from '@/types';
import { decryptToken, encryptToken } from '@/lib/encryption';
import { getFacebookPostInsights } from '@/lib/oauth/facebook';
import {
  getInstagramGraphBaseUrl,
  getInstagramMediaInsights,
} from '@/lib/oauth/instagram';
import { getTikTokUserVideos } from '@/lib/oauth/tiktok';
import { getYouTubeVideoStats, refreshYouTubeToken } from '@/lib/oauth/youtube';
import { hasLinkedInScope } from '@/lib/oauth/linkedin';
import { createLinkedInClientFromToken } from '@/lib/platforms/linkedin';
import { getTwitterTweetMetrics } from '@/lib/platforms/twitter';
import { isTwitterNoSpendMode } from '@/lib/twitter-api-mode';
import { recordMetricSnapshotAndOutcome } from './metrics';

type SyncStatus = 'synced' | 'skipped' | 'failed';

export type PlatformMetricSyncInput = {
  workspaceId: string;
  postId: string;
  platform: Platform | string;
  platformPostId?: string | null;
  socialAccountId?: string | null;
  publishedAt?: string | null;
  syncSource?: string;
};

export type PlatformMetricSyncResult = {
  postId: string;
  platform: string;
  status: SyncStatus;
  reason?: string;
  error?: string;
  analyticsWritten?: boolean;
  snapshotWritten?: boolean;
  outcomeWritten?: boolean;
  score?: number;
  baseline?: number;
  baselineScope?: string;
  duration: number;
};

function toNumber(value: unknown) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function metricValue(insights: any[], name: string) {
  const value = insights.find((item) => item?.name === name)?.values?.[0]?.value;
  if (value && typeof value === 'object') {
    return Object.values(value).reduce((sum: number, item) => sum + toNumber(item), 0);
  }
  return toNumber(value);
}

function normalizeAnalyticsPayload(
  input: PlatformMetricSyncInput,
  metrics: Record<string, any>,
  raw?: Record<string, any>
) {
  const views = toNumber(metrics.views ?? metrics.video_views ?? metrics.videoViews ?? metrics.viewCount);
  const impressions = toNumber(metrics.impressions ?? views);
  const reach = toNumber(metrics.reach ?? views ?? impressions);
  const likes = toNumber(metrics.likes ?? metrics.likeCount ?? metrics.like_count);
  const comments = toNumber(
    metrics.comments ?? metrics.commentCount ?? metrics.comment_count ?? metrics.reply_count ?? metrics.replies
  );
  const shares = toNumber(
    metrics.shares ?? metrics.shareCount ?? metrics.share_count ?? metrics.retweet_count ?? metrics.retweets
  );
  const saves = toNumber(metrics.saves ?? metrics.favoriteCount ?? metrics.bookmark_count);
  const clicks = toNumber(metrics.clicks ?? metrics.url_link_clicks);
  const engagement = toNumber(metrics.engagement) || likes + comments + shares + saves + clicks;
  const exposure = reach || impressions || views;
  const now = new Date().toISOString();

  return {
    post_id: input.postId,
    platform: input.platform,
    external_post_id: input.platformPostId || null,
    social_account_id: input.socialAccountId || null,
    impressions,
    reach,
    views,
    video_views: toNumber(metrics.video_views ?? metrics.videoViews ?? views),
    engagement,
    engagement_rate: exposure > 0 ? Number(((engagement / exposure) * 100).toFixed(2)) : 0,
    likes,
    comments,
    shares,
    saves,
    clicks,
    followers_gain: toNumber(metrics.followers_gain ?? metrics.follower_delta),
    fetched_at: now,
    last_synced_at: now,
    synced_at: now,
    raw: raw || metrics,
  };
}

async function writePostAnalytics(
  supabase: SupabaseClient,
  input: PlatformMetricSyncInput,
  metrics: Record<string, any>,
  raw?: Record<string, any>
) {
  const payload = normalizeAnalyticsPayload(input, metrics, raw);
  const { data: existing } = await supabase
    .from('post_analytics')
    .select('id')
    .eq('post_id', input.postId)
    .eq('platform', input.platform)
    .order('last_synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase.from('post_analytics').update(payload).eq('id', existing.id);
    return !error;
  }

  const { error } = await supabase.from('post_analytics').insert(payload);
  return !error;
}

export async function persistPlatformMetrics(
  supabase: SupabaseClient,
  input: PlatformMetricSyncInput & {
    metrics: Record<string, any>;
    raw?: Record<string, any>;
  }
): Promise<PlatformMetricSyncResult> {
  const startedAt = Date.now();
  try {
    const analyticsWritten = await writePostAnalytics(supabase, input, input.metrics, input.raw);
    const outcome = await recordMetricSnapshotAndOutcome(supabase, {
      workspaceId: input.workspaceId,
      postId: input.postId,
      platformPostId: input.platformPostId,
      socialAccountId: input.socialAccountId,
      platform: input.platform,
      publishedAt: input.publishedAt,
      metrics: input.metrics,
      raw: input.raw || input.metrics,
      syncSource: input.syncSource,
    });

    return {
      postId: input.postId,
      platform: String(input.platform),
      status: 'synced',
      analyticsWritten,
      snapshotWritten: outcome.snapshotWritten,
      outcomeWritten: outcome.outcomeWritten,
      score: outcome.score,
      baseline: outcome.baseline,
      baselineScope: outcome.baselineScope,
      duration: Date.now() - startedAt,
    };
  } catch (error: any) {
    return {
      postId: input.postId,
      platform: String(input.platform),
      status: 'failed',
      error: error?.message || String(error),
      duration: Date.now() - startedAt,
    };
  }
}

function hasLinkedInAnalyticsScope(account: any) {
  const scopes = account?.metadata?.scopes;
  const type = account?.metadata?.type === 'organization' ? 'organization' : 'personal';
  return type === 'organization'
    ? hasLinkedInScope(scopes, 'r_organization_social')
    : hasLinkedInScope(scopes, 'r_member_social') || hasLinkedInScope(scopes, 'r_member_postAnalytics');
}

function getConnectedVia(metadata: any): string | undefined {
  if (!metadata) return undefined;
  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata)?.connected_via;
    } catch {
      return undefined;
    }
  }
  return metadata.connected_via;
}

async function fetchPlatformMetrics(
  platform: string,
  platformPostId: string,
  accessToken: string,
  account: any
) {
  switch (platform) {
    case 'facebook': {
      const insights = await getFacebookPostInsights(platformPostId, accessToken);
      return {
        metrics: {
          impressions: metricValue(insights, 'post_impressions'),
          reach: metricValue(insights, 'post_reach'),
          engagement: metricValue(insights, 'post_engaged_users'),
          likes: metricValue(insights, 'post_reactions'),
          clicks: metricValue(insights, 'post_clicks'),
        },
        raw: { insights },
      };
    }
    case 'instagram': {
      const baseUrl = getInstagramGraphBaseUrl(getConnectedVia(account.metadata));
      const insights = await getInstagramMediaInsights(platformPostId, accessToken, baseUrl);
      return {
        metrics: {
          impressions: metricValue(insights, 'impressions') || metricValue(insights, 'views'),
          views: metricValue(insights, 'views'),
          reach: metricValue(insights, 'reach'),
          engagement: metricValue(insights, 'total_interactions') || metricValue(insights, 'engagement'),
          saves: metricValue(insights, 'saved') || metricValue(insights, 'saves'),
          shares: metricValue(insights, 'shares'),
          comments: metricValue(insights, 'comments'),
          likes: metricValue(insights, 'likes'),
        },
        raw: { insights },
      };
    }
    case 'twitter': {
      if (isTwitterNoSpendMode()) return { skipped: true, reason: 'twitter_no_spend_mode' };
      const tweet = await getTwitterTweetMetrics(accessToken, platformPostId);
      const metrics = tweet?.public_metrics || tweet?.data?.public_metrics || {};
      const nonPublic = tweet?.non_public_metrics || tweet?.data?.non_public_metrics || {};
      return {
        metrics: {
          impressions: metrics.impression_count || nonPublic.impression_count || 0,
          reach: metrics.impression_count || nonPublic.impression_count || 0,
          likes: metrics.like_count || 0,
          comments: metrics.reply_count || 0,
          shares: metrics.retweet_count || 0,
          saves: metrics.bookmark_count || metrics.quote_count || 0,
          clicks: nonPublic.url_link_clicks || 0,
        },
        raw: tweet || {},
      };
    }
    case 'linkedin': {
      if (!hasLinkedInAnalyticsScope(account)) {
        return { skipped: true, reason: 'linkedin_missing_analytics_scope' };
      }
      const stats = await createLinkedInClientFromToken(accessToken).getPostStats(platformPostId);
      return {
        metrics: {
          impressions: stats.impressions || stats.impressionCount || 0,
          reach: stats.reach || stats.impressions || stats.impressionCount || 0,
          engagement: stats.engagement || stats.engagementCount || 0,
          likes: stats.likes || stats.likeCount || 0,
          comments: stats.comments || stats.commentCount || 0,
          shares: stats.shares || stats.shareCount || 0,
          clicks: stats.clicks || 0,
        },
        raw: stats,
      };
    }
    case 'youtube': {
      const video = await getYouTubeVideoStats(accessToken, platformPostId);
      const stats = (video.statistics || {}) as Record<string, any>;
      const views = toNumber(stats.viewCount);
      const likes = toNumber(stats.likeCount);
      const comments = toNumber(stats.commentCount);
      return {
        metrics: {
          views,
          video_views: views,
          impressions: views,
          reach: views,
          engagement: likes + comments,
          likes,
          comments,
          saves: toNumber(stats.favoriteCount),
        },
        raw: video,
      };
    }
    case 'tiktok': {
      const response = await getTikTokUserVideos(accessToken, 50);
      const video = (response.videos || []).find((item: any) => String(item.id) === platformPostId);
      if (!video) return { skipped: true, reason: 'tiktok_video_not_found_in_recent_list' };
      return {
        metrics: {
          views: video.view_count || 0,
          video_views: video.view_count || 0,
          likes: video.like_count || 0,
          comments: video.comment_count || 0,
          shares: video.share_count || 0,
          engagement:
            (video.like_count || 0) + (video.comment_count || 0) + (video.share_count || 0),
        },
        raw: video,
      };
    }
    default:
      return { skipped: true, reason: 'unsupported_platform' };
  }
}

async function getAccount(supabase: SupabaseClient, input: PlatformMetricSyncInput) {
  let query = supabase
    .from('social_accounts')
    .select('id, workspace_id, platform, account_id, access_token, refresh_token, token_expires_at, metadata, is_active')
    .eq('is_active', true);

  if (input.socialAccountId) {
    query = query.eq('id', input.socialAccountId);
  } else {
    query = query.eq('workspace_id', input.workspaceId).eq('platform', input.platform);
  }

  const { data } = await query.limit(1).maybeSingle();
  return data;
}

async function refreshYouTubeAccountToken(supabase: SupabaseClient, account: any) {
  if (account.platform !== 'youtube' || !account.refresh_token) return null;

  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const tokenResponse = await refreshYouTubeToken(
    {
      clientId,
      clientSecret,
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/youtube/callback`,
    },
    decryptToken(account.refresh_token)
  );

  const refreshedAt = new Date().toISOString();
  const { error } = await supabase
    .from('social_accounts')
    .update({
      access_token: encryptToken(tokenResponse.access_token),
      refresh_token: tokenResponse.refresh_token
        ? encryptToken(tokenResponse.refresh_token)
        : account.refresh_token,
      token_expires_at: new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString(),
      updated_at: refreshedAt,
      metadata: {
        ...(account.metadata || {}),
        token_refreshed_by: 'analytics_sync',
        token_refreshed_at: refreshedAt,
      },
    })
    .eq('id', account.id);

  if (error) throw new Error(error.message);
  return tokenResponse.access_token;
}

export async function syncPlatformPostMetrics(
  supabase: SupabaseClient,
  input: PlatformMetricSyncInput
): Promise<PlatformMetricSyncResult> {
  const startedAt = Date.now();
  if (!input.platformPostId) {
    return {
      postId: input.postId,
      platform: String(input.platform),
      status: 'skipped',
      reason: 'missing_platform_post_id',
      duration: Date.now() - startedAt,
    };
  }

  const account = await getAccount(supabase, input);
  if (!account) {
    return {
      postId: input.postId,
      platform: String(input.platform),
      status: 'skipped',
      reason: 'missing_active_account',
      duration: Date.now() - startedAt,
    };
  }

  let accessToken = '';
  try {
    if (account.token_expires_at && new Date(account.token_expires_at) <= new Date()) {
      accessToken = (await refreshYouTubeAccountToken(supabase, account)) || '';
      if (!accessToken) {
        return {
          postId: input.postId,
          platform: String(input.platform),
          status: 'skipped',
          reason: 'expired_token',
          duration: Date.now() - startedAt,
        };
      }
    } else {
      accessToken = decryptToken(account.access_token);
    }
  } catch {
    return {
      postId: input.postId,
      platform: String(input.platform),
      status: 'skipped',
      reason: 'token_decrypt_failed',
      duration: Date.now() - startedAt,
    };
  }

  try {
    let fetched;
    try {
      fetched = await fetchPlatformMetrics(
        String(input.platform),
        input.platformPostId,
        accessToken,
        account
      );
    } catch (error) {
      if (String(input.platform) !== 'youtube' || !account.refresh_token) {
        throw error;
      }

      const refreshedAccessToken = await refreshYouTubeAccountToken(supabase, account);
      if (!refreshedAccessToken) throw error;

      fetched = await fetchPlatformMetrics(
        String(input.platform),
        input.platformPostId,
        refreshedAccessToken,
        account
      );
    }

    if ((fetched as any)?.skipped) {
      return {
        postId: input.postId,
        platform: String(input.platform),
        status: 'skipped',
        reason: (fetched as any).reason,
        duration: Date.now() - startedAt,
      };
    }

    return persistPlatformMetrics(supabase, {
      ...input,
      socialAccountId: account.id || input.socialAccountId,
      metrics: (fetched as any).metrics || {},
      raw: (fetched as any).raw || (fetched as any).metrics || {},
      syncSource: input.syncSource || 'cron_sync_metrics',
    });
  } catch (error: any) {
    return {
      postId: input.postId,
      platform: String(input.platform),
      status: 'failed',
      error: error?.message || String(error),
      duration: Date.now() - startedAt,
    };
  }
}

export function summarizeMetricSyncResults(results: PlatformMetricSyncResult[]) {
  const byPlatform = results.reduce((acc: Record<string, any>, result) => {
    const current = acc[result.platform] || { processed: 0, synced: 0, skipped: 0, failed: 0 };
    current.processed += 1;
    current[result.status] += 1;
    acc[result.platform] = current;
    return acc;
  }, {});

  return {
    processed: results.length,
    synced: results.filter((result) => result.status === 'synced').length,
    skipped: results.filter((result) => result.status === 'skipped').length,
    failed: results.filter((result) => result.status === 'failed').length,
    snapshotsWritten: results.filter((result) => result.snapshotWritten).length,
    outcomesWritten: results.filter((result) => result.outcomeWritten).length,
    analyticsWritten: results.filter((result) => result.analyticsWritten).length,
    byPlatform,
  };
}
