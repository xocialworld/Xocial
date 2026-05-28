import { createClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/encryption';
import {
  getInstagramGraphBaseUrl,
  getInstagramMedia,
  getInstagramMediaInsights,
  getInstagramAccountInsights,
  getInstagramComments,
} from '@/lib/oauth/instagram';
import { logger } from '@/lib/logger';
import { persistPlatformMetrics } from '@/lib/intelligence/analytics-sync';
import { upsertPostByExternalId } from '@/lib/sync/upsert-post';
import { upsertSocialComment } from '@/lib/sync/social-comments';

/**
 * Instagram Data Synchronization Library
 * Handles syncing posts, analytics, and comments from Instagram
 */

interface SyncResult {
  synced: number;
  errors: number;
  details?: string[];
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

function inferInstagramPostType(item: any): string {
  const mediaType = String(item?.media_type || '').toUpperCase();
  const permalink = String(item?.permalink || '').toLowerCase();

  if (permalink.includes('/reel/') || mediaType === 'REELS') {
    return 'reel';
  }

  if (mediaType === 'CAROUSEL_ALBUM') {
    return 'carousel';
  }

  if (mediaType === 'VIDEO') {
    return 'reel';
  }

  return 'feed';
}

function normalizeInstagramMedia(item: any) {
  if (!item?.media_url && !item?.thumbnail_url) {
    return [];
  }

  const mediaType = String(item?.media_type || '').toUpperCase();
  const isVideo = mediaType === 'VIDEO' || mediaType === 'REELS';
  const url = item.media_url || item.thumbnail_url;

  return [
    {
      id: item.id,
      type: isVideo ? 'video' : 'image',
      url,
      thumbnail: item.thumbnail_url || item.media_url || url,
      filename: `instagram-${item.id}`,
      size: 0,
    },
  ];
}

/**
 * Sync Instagram media (posts) to the database
 */
export async function syncInstagramPosts(
  accountId: string,
  options = { maxPosts: 50 }
): Promise<SyncResult> {
  const supabase = await createClient();
  const result: SyncResult = { synced: 0, errors: 0, details: [] };

  try {
    // Get account details
    const { data: account, error: accountError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('platform', 'instagram')
      .single();

    if (accountError || !account) {
      throw new Error('Instagram account not found');
    }

    const accessToken = decryptToken(account.access_token);
    const instagramAccountId = account.account_id;
    const baseUrl = getInstagramGraphBaseUrl(getConnectedVia(account.metadata));

    // Fetch media from Instagram
    const media = await getInstagramMedia(
      accessToken,
      instagramAccountId,
      options.maxPosts,
      baseUrl
    );

    logger.info(`[Instagram Sync] Fetched ${media.length} posts for account ${accountId}`);

    // Sync each post
    for (const item of media) {
      try {
        const postType = inferInstagramPostType(item);
        const normalizedMedia = normalizeInstagramMedia(item);
        const postData = {
          workspace_id: account.workspace_id,
          social_account_id: accountId,
          platforms: ['instagram'],
          external_post_id: item.id,
          content: {
            caption: item.caption || '',
            text: item.caption || '',
            media_type: item.media_type,
            media_url: item.media_url,
            permalink: item.permalink,
            thumbnail_url: item.thumbnail_url,
          },
          media: normalizedMedia,
          metadata: {
            post_type: postType,
            instagram: {
              media_type: item.media_type,
              permalink: item.permalink,
            },
          },
          status: 'published' as const,
          published_at: item.timestamp
            ? new Date(item.timestamp).toISOString()
            : new Date().toISOString(),
        };

        const { id: postId } = await upsertPostByExternalId(supabase as any, {
          workspace_id: postData.workspace_id,
          social_account_id: postData.social_account_id,
          external_post_id: postData.external_post_id,
          platforms: postData.platforms,
          content: postData.content,
          status: postData.status,
          published_at: postData.published_at,
          media: postData.media,
          metadata: postData.metadata,
        });

        // Fetch and store insights
        if (item.media_type !== 'CAROUSEL_ALBUM') {
          try {
            const insights = await getInstagramMediaInsights(item.id, accessToken, baseUrl);
            if (postId) {
              const analyticsData = {
                post_id: postId,
                platform: 'instagram',
                impressions:
                  insights.find((i: any) => i.name === 'impressions')?.values?.[0]?.value || 0,
                reach: insights.find((i: any) => i.name === 'reach')?.values?.[0]?.value || 0,
                engagement:
                  insights.find((i: any) => i.name === 'engagement')?.values?.[0]?.value || 0,
                likes: item.like_count || 0,
                comments: item.comments_count || 0,
                saves: insights.find((i: any) => i.name === 'saved')?.values?.[0]?.value || 0,
                shares: insights.find((i: any) => i.name === 'shares')?.values?.[0]?.value || 0,
                fetched_at: new Date().toISOString(),
              };

              await persistPlatformMetrics(supabase as any, {
                workspaceId: account.workspace_id,
                postId,
                platformPostId: item.id,
                socialAccountId: accountId,
                platform: 'instagram',
                publishedAt: postData.published_at,
                metrics: analyticsData,
                raw: { insights, media: item },
                syncSource: 'instagram_posts_sync',
              });
            }
          } catch (insightsError: any) {
            logger.warn(`Failed to fetch insights for post ${item.id}`, { error: insightsError });
          }
        }

        result.synced++;
      } catch (error: any) {
        result.errors++;
        result.details?.push(`Failed to sync post ${item.id}: ${error.message}`);
        logger.error(`Failed to sync Instagram post ${item.id}`, error, {} as any);
      }
    }

    // Update last_synced_at
    await supabase
      .from('social_accounts')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', accountId);

    logger.info(`[Instagram Sync] Completed: ${result.synced} synced, ${result.errors} errors`);
    return result;
  } catch (error: any) {
    logger.error('[Instagram Sync] Fatal error:', error);
    throw error;
  }
}

/**
 * Sync Instagram analytics for existing posts
 */
export async function syncInstagramAnalytics(accountId: string): Promise<SyncResult> {
  const supabase = await createClient();
  const result: SyncResult = { synced: 0, errors: 0 };

  try {
    const { data: account, error: accountError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('platform', 'instagram')
      .single();

    if (accountError || !account) {
      throw new Error('Instagram account not found');
    }

    const accessToken = decryptToken(account.access_token);
    const baseUrl = getInstagramGraphBaseUrl(getConnectedVia(account.metadata));

    // Get all Instagram posts
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .eq('social_account_id', accountId)
      .eq('status', 'published')
      .not('external_post_id', 'is', null);

    if (postsError || !posts) {
      throw new Error('Failed to fetch posts');
    }

    for (const post of posts) {
      try {
        const insights = await getInstagramMediaInsights(
          post.external_post_id,
          accessToken,
          baseUrl
        );

        const analyticsData = {
          post_id: post.id,
          platform: 'instagram',
          impressions: insights.find((i: any) => i.name === 'impressions')?.values?.[0]?.value || 0,
          reach: insights.find((i: any) => i.name === 'reach')?.values?.[0]?.value || 0,
          engagement: insights.find((i: any) => i.name === 'engagement')?.values?.[0]?.value || 0,
          saves: insights.find((i: any) => i.name === 'saved')?.values?.[0]?.value || 0,
          shares: insights.find((i: any) => i.name === 'shares')?.values?.[0]?.value || 0,
          fetched_at: new Date().toISOString(),
        };

        await persistPlatformMetrics(supabase as any, {
          workspaceId: account.workspace_id,
          postId: post.id,
          platformPostId: post.external_post_id,
          socialAccountId: accountId,
          platform: 'instagram',
          publishedAt: post.published_at,
          metrics: analyticsData,
          raw: { insights },
          syncSource: 'instagram_analytics_sync',
        });

        result.synced++;
      } catch (error: any) {
        result.errors++;
        logger.error(`Failed to sync analytics for post ${post.id}`, error);
      }
    }

    await supabase
      .from('social_accounts')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', accountId);

    return result;
  } catch (error: any) {
    logger.error('[Instagram Analytics Sync] Fatal error:', error);
    throw error;
  }
}

/**
 * Sync Instagram comments for a specific post
 */
export async function syncInstagramComments(postId: string): Promise<SyncResult> {
  const supabase = await createClient();
  const result: SyncResult = { synced: 0, errors: 0 };

  try {
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('*, social_accounts!inner(*)')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      throw new Error('Post not found');
    }

    const account = (post as any).social_accounts;
    const accessToken = decryptToken(account.access_token);
    const baseUrl = getInstagramGraphBaseUrl(getConnectedVia(account.metadata));

    const comments = await getInstagramComments(post.external_post_id, accessToken, baseUrl);

    for (const comment of comments) {
      try {
        const commentData = {
          workspace_id: post.workspace_id,
          post_id: postId,
          social_account_id: account.id,
          platform: 'instagram' as const,
          external_post_id: post.external_post_id,
          external_comment_id: comment.id,
          author_name: comment.username || comment.from?.username || 'Unknown',
          author_handle: comment.username || null,
          author_avatar: null,
          content: comment.text,
          like_count: comment.like_count || 0,
          reply_count: comment.replies?.data?.length || 0,
          raw: comment,
          created_time: comment.timestamp ? new Date(comment.timestamp).toISOString() : null,
          fetched_at: new Date().toISOString(),
        };

        await upsertSocialComment(supabase as any, commentData);

        result.synced++;
      } catch (error: any) {
        result.errors++;
        logger.error(`Failed to sync comment ${comment.id}`, error);
      }
    }

    return result;
  } catch (error: any) {
    logger.error('[Instagram Comments Sync] Fatal error:', error);
    throw error;
  }
}

/**
 * Update Instagram account stats
 */
export async function syncInstagramAccount(accountId: string): Promise<any> {
  const supabase = await createClient();

  try {
    const { data: account, error: accountError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('platform', 'instagram')
      .single();

    if (accountError || !account) {
      throw new Error('Instagram account not found');
    }

    const accessToken = decryptToken(account.access_token);
    const instagramAccountId = account.account_id;
    const baseUrl = getInstagramGraphBaseUrl(getConnectedVia(account.metadata));

    const insights = await getInstagramAccountInsights(
      instagramAccountId,
      accessToken,
      'day',
      baseUrl
    );

    const followerCount =
      insights.find((i: any) => i.name === 'follower_count')?.values?.[0]?.value ||
      account.follower_count;

    await supabase
      .from('social_accounts')
      .update({
        follower_count: followerCount,
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', accountId);

    return { followerCount };
  } catch (error: any) {
    logger.error('[Instagram Account Sync] Fatal error:', error);
    throw error;
  }
}

/**
 * Perform full Instagram sync (account + posts + analytics)
 */
export async function performFullInstagramSync(accountId: string): Promise<any> {
  logger.info(`[Instagram Full Sync] Starting for account ${accountId}`);

  try {
    const [accountStats, postsResult] = await Promise.all([
      syncInstagramAccount(accountId),
      syncInstagramPosts(accountId),
    ]);

    const analyticsResult = await syncInstagramAnalytics(accountId);

    logger.info(`[Instagram Full Sync] Completed for account ${accountId}`);

    return {
      accountStats,
      posts: postsResult,
      analytics: analyticsResult,
    };
  } catch (error: any) {
    logger.error('[Instagram Full Sync] Fatal error:', error);
    throw error;
  }
}
