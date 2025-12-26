/**
 * Range-Based Post Sync API
 * POST /api/accounts/[id]/sync-range
 *
 * Fetches posts from a platform within a specific date range (lazy loading).
 * This enables on-demand syncing as the user navigates the calendar.
 *
 * Body: { from: ISO date, to: ISO date }
 */

import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  APIError,
} from '@/lib/api-middleware';
import { decryptToken, encryptToken } from '@/lib/encryption';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);

  // Extract account ID from URL path
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const accountId = pathParts[pathParts.indexOf('accounts') + 1];

  if (!accountId) {
    throw new APIError(400, 'Account ID is required', 'VALIDATION_ERROR');
  }

  const body = await request.json();
  const { from, to } = body;

  if (!from || !to) {
    throw new APIError(400, 'from and to dates are required', 'VALIDATION_ERROR');
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);

  // Limit range to 90 days max
  const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff > 90) {
    throw new APIError(400, 'Date range cannot exceed 90 days', 'VALIDATION_ERROR');
  }

  // Fetch account
  const { data: account, error: accountError } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('id', accountId)
    .single();

  if (accountError || !account) {
    throw new APIError(404, 'Social account not found', 'ACCOUNT_NOT_FOUND');
  }

  // Verify user has access to this workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('id, role')
    .eq('workspace_id', account.workspace_id)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    throw new APIError(403, 'You do not have access to this account', 'FORBIDDEN');
  }

  const platform = account.platform.toLowerCase();
  let syncedCount = 0;
  let syncedErrors = 0;
  const details: string[] = [];

  try {
    // Check if we've already synced this range
    const rangeKey = `${fromDate.toISOString().split('T')[0]}_${toDate.toISOString().split('T')[0]}`;
    const syncedRanges = (account.metadata?.synced_ranges as string[]) || [];

    if (syncedRanges.includes(rangeKey)) {
      return successResponse({
        message: 'Range already synced',
        count: 0,
        cached: true,
        range: { from: fromDate.toISOString(), to: toDate.toISOString() },
      });
    }

    // Platform-specific sync with date range
    if (platform === 'youtube') {
      const result = await syncYouTubeRange(account, supabase, fromDate, toDate);
      syncedCount = result.synced;
      syncedErrors = result.errors;
      details.push(...(result.details || []));
    } else if (platform === 'twitter') {
      const result = await syncTwitterRange(account, supabase, fromDate, toDate);
      syncedCount = result.synced;
      syncedErrors = result.errors;
      details.push(...(result.details || []));
    } else if (platform === 'instagram') {
      const result = await syncInstagramRange(account, supabase, fromDate, toDate);
      syncedCount = result.synced;
      syncedErrors = result.errors;
      details.push(...(result.details || []));
    } else if (platform === 'facebook') {
      const result = await syncFacebookRange(account, supabase, fromDate, toDate);
      syncedCount = result.synced;
      syncedErrors = result.errors;
      details.push(...(result.details || []));
    } else if (platform === 'linkedin') {
      const result = await syncLinkedInRange(account, supabase, fromDate, toDate);
      syncedCount = result.synced;
      syncedErrors = result.errors;
      details.push(...(result.details || []));
    } else if (platform === 'tiktok') {
      const result = await syncTikTokRange(account, supabase, fromDate, toDate);
      syncedCount = result.synced;
      syncedErrors = result.errors;
      details.push(...(result.details || []));
    } else {
      details.push(`Platform ${platform} does not support range-based sync`);
    }

    // Mark range as synced
    const newSyncedRanges = [...syncedRanges, rangeKey].slice(-12); // Keep last 12 ranges
    await supabase
      .from('social_accounts')
      .update({
        metadata: {
          ...account.metadata,
          synced_ranges: newSyncedRanges,
          last_range_sync: new Date().toISOString(),
        },
      })
      .eq('id', accountId);

    return successResponse({
      message: syncedErrors > 0
        ? `Synced ${syncedCount} posts with ${syncedErrors} errors`
        : `Successfully synced ${syncedCount} posts`,
      count: syncedCount,
      errors: syncedErrors,
      details,
      range: { from: fromDate.toISOString(), to: toDate.toISOString() },
    });
  } catch (error) {
    console.error('Range sync error:', error);
    const message = error instanceof Error ? error.message : String(error);
    throw new APIError(500, 'Failed to sync posts: ' + message);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Platform-specific range sync functions
// ─────────────────────────────────────────────────────────────────────────────

interface RangeSyncResult {
  synced: number;
  errors: number;
  details: string[];
}

async function syncYouTubeRange(
  account: any,
  supabase: any,
  fromDate: Date,
  toDate: Date
): Promise<RangeSyncResult> {
  const result: RangeSyncResult = { synced: 0, errors: 0, details: [] };

  try {
    const accessToken = decryptToken(account.access_token);
    const channelId = account.account_id;

    // YouTube Data API: search for videos in date range
    const publishedAfter = fromDate.toISOString();
    const publishedBefore = toDate.toISOString();

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?` +
      `part=snippet&channelId=${channelId}&type=video&order=date&maxResults=50` +
      `&publishedAfter=${publishedAfter}&publishedBefore=${publishedBefore}`;

    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!searchRes.ok) {
      const errorText = await searchRes.text();
      result.details.push(`[YouTube] Search failed: ${searchRes.status} - ${errorText}`);
      result.errors++;
      return result;
    }

    const searchData = await searchRes.json();
    const videoItems = searchData.items || [];

    result.details.push(`[YouTube] Found ${videoItems.length} videos in range`);

    for (const item of videoItems) {
      try {
        const videoId = item.id?.videoId;
        if (!videoId) continue;

        const snippet = item.snippet || {};
        const publishedAt = snippet.publishedAt;

        // Get video details for duration (to detect Shorts)
        const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?` +
          `part=contentDetails,statistics&id=${videoId}`;
        const detailsRes = await fetch(detailsUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        let duration = 0;
        let viewCount = 0;
        let likeCount = 0;
        let commentCount = 0;

        if (detailsRes.ok) {
          const detailsData = await detailsRes.json();
          const videoDetails = detailsData.items?.[0];
          if (videoDetails) {
            duration = parseYouTubeDuration(videoDetails.contentDetails?.duration || '');
            viewCount = parseInt(videoDetails.statistics?.viewCount || '0', 10);
            likeCount = parseInt(videoDetails.statistics?.likeCount || '0', 10);
            commentCount = parseInt(videoDetails.statistics?.commentCount || '0', 10);
          }
        }

        const isShort = duration > 0 && duration <= 60;
        const postType = isShort ? 'short' : 'video';

        // Upsert to external_posts
        const { error: upsertError } = await supabase
          .from('external_posts')
          .upsert(
            {
              workspace_id: account.workspace_id,
              social_account_id: account.id,
              platform: 'youtube',
              external_post_id: videoId,
              permalink: `https://www.youtube.com/watch?v=${videoId}`,
              content: {
                title: snippet.title,
                description: snippet.description,
                text: snippet.title,
              },
              media: [
                {
                  type: 'video',
                  url: `https://www.youtube.com/watch?v=${videoId}`,
                  thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
                  duration,
                },
              ],
              post_type: postType,
              published_at: publishedAt,
              metrics: {
                views: viewCount,
                likes: likeCount,
                comments: commentCount,
              },
              fetched_at: new Date().toISOString(),
            },
            { onConflict: 'social_account_id,platform,external_post_id' }
          );

        if (upsertError) {
          result.errors++;
          result.details.push(`[YouTube] Failed to upsert ${videoId}: ${upsertError.message}`);
        } else {
          result.synced++;
        }
      } catch (e) {
        result.errors++;
      }
    }
  } catch (e: any) {
    result.errors++;
    result.details.push(`[YouTube] Error: ${e.message}`);
  }

  return result;
}

async function syncTwitterRange(
  account: any,
  supabase: any,
  fromDate: Date,
  toDate: Date
): Promise<RangeSyncResult> {
  const result: RangeSyncResult = { synced: 0, errors: 0, details: [] };

  try {
    const accessToken = decryptToken(account.access_token);
    const userId = account.account_id;

    // Twitter API v2: search tweets with date range
    // Note: User timeline endpoint doesn't support date filtering directly
    // We fetch recent tweets and filter by date
    const startTime = fromDate.toISOString();
    const endTime = toDate.toISOString();

    const tweetsUrl = `https://api.twitter.com/2/users/${userId}/tweets?` +
      `max_results=100&start_time=${startTime}&end_time=${endTime}` +
      `&tweet.fields=created_at,public_metrics,attachments` +
      `&expansions=attachments.media_keys&media.fields=url,preview_image_url,type,duration_ms`;

    const tweetsRes = await fetch(tweetsUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!tweetsRes.ok) {
      const errorData = await tweetsRes.json().catch(() => ({}));
      // Check for rate limit
      if (tweetsRes.status === 429) {
        result.details.push('[Twitter] Rate limited - try again later');
        result.errors++;
        return result;
      }
      result.details.push(`[Twitter] Fetch failed: ${tweetsRes.status}`);
      result.errors++;
      return result;
    }

    const tweetsData = await tweetsRes.json();
    const tweets = tweetsData.data || [];
    const mediaMap = new Map<string, any>();

    // Build media lookup
    if (tweetsData.includes?.media) {
      for (const media of tweetsData.includes.media) {
        mediaMap.set(media.media_key, media);
      }
    }

    result.details.push(`[Twitter] Found ${tweets.length} tweets in range`);

    for (const tweet of tweets) {
      try {
        const tweetId = tweet.id;
        const publishedAt = tweet.created_at;
        const metrics = tweet.public_metrics || {};

        // Get media
        const mediaItems: any[] = [];
        if (tweet.attachments?.media_keys) {
          for (const mediaKey of tweet.attachments.media_keys) {
            const media = mediaMap.get(mediaKey);
            if (media) {
              mediaItems.push({
                type: media.type,
                url: media.url || media.preview_image_url,
                duration: media.duration_ms ? media.duration_ms / 1000 : undefined,
              });
            }
          }
        }

        // Upsert to external_posts
        const { error: upsertError } = await supabase
          .from('external_posts')
          .upsert(
            {
              workspace_id: account.workspace_id,
              social_account_id: account.id,
              platform: 'twitter',
              external_post_id: tweetId,
              permalink: `https://twitter.com/i/status/${tweetId}`,
              content: {
                text: tweet.text,
                caption: tweet.text,
              },
              media: mediaItems,
              post_type: 'tweet',
              published_at: publishedAt,
              metrics: {
                likes: metrics.like_count || 0,
                retweets: metrics.retweet_count || 0,
                replies: metrics.reply_count || 0,
                impressions: metrics.impression_count || 0,
              },
              fetched_at: new Date().toISOString(),
            },
            { onConflict: 'social_account_id,platform,external_post_id' }
          );

        if (upsertError) {
          result.errors++;
        } else {
          result.synced++;
        }
      } catch (e) {
        result.errors++;
      }
    }
  } catch (e: any) {
    result.errors++;
    result.details.push(`[Twitter] Error: ${e.message}`);
  }

  return result;
}

async function syncInstagramRange(
  account: any,
  supabase: any,
  fromDate: Date,
  toDate: Date
): Promise<RangeSyncResult> {
  const result: RangeSyncResult = { synced: 0, errors: 0, details: [] };

  try {
    const accessToken = decryptToken(account.access_token);
    const igUserId = account.account_id;

    // Instagram Graph API: fetch media with timestamp
    const mediaUrl = `https://graph.instagram.com/${igUserId}/media?` +
      `fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count` +
      `&limit=50&access_token=${accessToken}`;

    const mediaRes = await fetch(mediaUrl);

    if (!mediaRes.ok) {
      result.details.push(`[Instagram] Fetch failed: ${mediaRes.status}`);
      result.errors++;
      return result;
    }

    const mediaData = await mediaRes.json();
    const posts = mediaData.data || [];

    // Filter by date range
    const filteredPosts = posts.filter((post: any) => {
      const postDate = new Date(post.timestamp);
      return postDate >= fromDate && postDate <= toDate;
    });

    result.details.push(`[Instagram] Found ${filteredPosts.length} posts in range`);

    for (const post of filteredPosts) {
      try {
        const postType = post.media_type?.toLowerCase() || 'image';

        const { error: upsertError } = await supabase
          .from('external_posts')
          .upsert(
            {
              workspace_id: account.workspace_id,
              social_account_id: account.id,
              platform: 'instagram',
              external_post_id: post.id,
              permalink: post.permalink,
              content: {
                caption: post.caption || '',
                text: post.caption || '',
              },
              media: [
                {
                  type: postType === 'video' ? 'video' : 'image',
                  url: post.media_url,
                  thumbnail: post.thumbnail_url,
                },
              ],
              post_type: postType,
              published_at: post.timestamp,
              metrics: {
                likes: post.like_count || 0,
                comments: post.comments_count || 0,
              },
              fetched_at: new Date().toISOString(),
            },
            { onConflict: 'social_account_id,platform,external_post_id' }
          );

        if (upsertError) {
          result.errors++;
        } else {
          result.synced++;
        }
      } catch (e) {
        result.errors++;
      }
    }
  } catch (e: any) {
    result.errors++;
    result.details.push(`[Instagram] Error: ${e.message}`);
  }

  return result;
}

async function syncFacebookRange(
  account: any,
  supabase: any,
  fromDate: Date,
  toDate: Date
): Promise<RangeSyncResult> {
  const result: RangeSyncResult = { synced: 0, errors: 0, details: [] };

  try {
    const accessToken = decryptToken(account.access_token);
    const pageId = account.account_id;

    // Facebook Graph API with since/until
    const since = Math.floor(fromDate.getTime() / 1000);
    const until = Math.floor(toDate.getTime() / 1000);

    const postsUrl = `https://graph.facebook.com/v18.0/${pageId}/posts?` +
      `fields=id,message,created_time,permalink_url,full_picture,type,shares,reactions.summary(true),comments.summary(true)` +
      `&since=${since}&until=${until}&limit=50&access_token=${accessToken}`;

    const postsRes = await fetch(postsUrl);

    if (!postsRes.ok) {
      result.details.push(`[Facebook] Fetch failed: ${postsRes.status}`);
      result.errors++;
      return result;
    }

    const postsData = await postsRes.json();
    const posts = postsData.data || [];

    result.details.push(`[Facebook] Found ${posts.length} posts in range`);

    for (const post of posts) {
      try {
        const { error: upsertError } = await supabase
          .from('external_posts')
          .upsert(
            {
              workspace_id: account.workspace_id,
              social_account_id: account.id,
              platform: 'facebook',
              external_post_id: post.id,
              permalink: post.permalink_url,
              content: {
                message: post.message || '',
                text: post.message || '',
              },
              media: post.full_picture
                ? [{ type: 'image', url: post.full_picture }]
                : [],
              post_type: post.type || 'status',
              published_at: post.created_time,
              metrics: {
                reactions: post.reactions?.summary?.total_count || 0,
                comments: post.comments?.summary?.total_count || 0,
                shares: post.shares?.count || 0,
              },
              fetched_at: new Date().toISOString(),
            },
            { onConflict: 'social_account_id,platform,external_post_id' }
          );

        if (upsertError) {
          result.errors++;
        } else {
          result.synced++;
        }
      } catch (e) {
        result.errors++;
      }
    }
  } catch (e: any) {
    result.errors++;
    result.details.push(`[Facebook] Error: ${e.message}`);
  }

  return result;
}

async function syncLinkedInRange(
  account: any,
  supabase: any,
  fromDate: Date,
  toDate: Date
): Promise<RangeSyncResult> {
  const result: RangeSyncResult = { synced: 0, errors: 0, details: [] };
  // LinkedIn API is more complex - implement when needed
  result.details.push('[LinkedIn] Range sync not yet implemented');
  return result;
}

async function syncTikTokRange(
  account: any,
  supabase: any,
  fromDate: Date,
  toDate: Date
): Promise<RangeSyncResult> {
  const result: RangeSyncResult = { synced: 0, errors: 0, details: [] };
  // TikTok API requires specific permissions - implement when needed
  result.details.push('[TikTok] Range sync not yet implemented');
  return result;
}

// Helper function
function parseYouTubeDuration(duration: string): number {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;

  const hours = parseInt((match[1] || '').replace('H', '')) || 0;
  const minutes = parseInt((match[2] || '').replace('M', '')) || 0;
  const seconds = parseInt((match[3] || '').replace('S', '')) || 0;

  return hours * 3600 + minutes * 60 + seconds;
}

