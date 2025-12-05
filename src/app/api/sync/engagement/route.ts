import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleAPIError, APIError } from '@/lib/api-middleware';
import { createFacebookClient } from '@/lib/platforms/facebook';
import { createInstagramClient } from '@/lib/platforms/instagram';
import { createTwitterClient } from '@/lib/platforms/twitter';
import { createLinkedInClient } from '@/lib/platforms/linkedin';
import { createYouTubeClient } from '@/lib/platforms/youtube';

export const dynamic = 'force-dynamic';

/**
 * Sync engagement metrics from all platforms
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new APIError(401, 'Unauthorized');
    }

    // Get user's workspace
    const { data: workspaceMember } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single();

    if (!workspaceMember) {
      throw new APIError(404, 'No workspace found');
    }

    // Get all platform posts that need syncing (published in last 30 days)
    const { data: platformPosts, error: postsError } = await supabase
      .from('platform_posts')
      .select('*, posts!inner(workspace_id)')
      .eq('posts.workspace_id', workspaceMember.workspace_id)
      .eq('status', 'published')
      .gte('published_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('published_at', { ascending: false })
      .limit(100);

    if (postsError) {
      throw new APIError(500, 'Failed to fetch platform posts');
    }

    if (!platformPosts || platformPosts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No posts to sync',
        synced: 0,
      });
    }

    // Sync each platform post
    let syncedCount = 0;
    const errors: any[] = [];

    for (const platformPost of platformPosts) {
      try {
        await syncPlatformPost(platformPost);
        syncedCount++;
      } catch (error: any) {
        errors.push({
          platform: platformPost.platform,
          postId: platformPost.platform_post_id,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      total: platformPosts.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * Sync a single platform post's engagement metrics
 */
async function syncPlatformPost(platformPost: any) {
  const supabase = await createClient();

  let metrics: any = {};

  switch (platformPost.platform) {
    case 'facebook':
      metrics = await syncFacebookPost(platformPost);
      break;
    case 'instagram':
      metrics = await syncInstagramPost(platformPost);
      break;
    case 'twitter':
      metrics = await syncTwitterPost(platformPost);
      break;
    case 'linkedin':
      metrics = await syncLinkedInPost(platformPost);
      break;
    case 'youtube':
      metrics = await syncYouTubePost(platformPost);
      break;
    default:
      throw new Error(`Unsupported platform: ${platformPost.platform}`);
  }

  // Insert engagement history
  await supabase.from('engagement_history').insert({
    platform_post_id: platformPost.id,
    likes: metrics.likes || 0,
    comments: metrics.comments || 0,
    shares: metrics.shares || 0,
    views: metrics.views || 0,
    saves: metrics.saves || 0,
  });
}

async function syncFacebookPost(platformPost: any) {
  // Get account ID from post
  const supabase = await createClient();
  const { data: post } = await supabase
    .from('posts')
    .select('workspace_id')
    .eq('id', platformPost.post_id)
    .single();

  if (!post) throw new Error('Post not found');

  const { data: account } = await supabase
    .from('social_accounts')
    .select('id')
    .eq('workspace_id', post.workspace_id)
    .eq('platform', 'facebook')
    .single();

  if (!account) throw new Error('Facebook account not found');

  const client = await createFacebookClient(account.id);
  
  // Get basic metrics
  const basicMetrics = await client.getPostMetrics(platformPost.platform_post_id);
  
  // Get insights (including views)
  const insights = await client.getPostInsights(platformPost.platform_post_id);
  
  return {
    ...basicMetrics,
    views: insights.views || 0,
    impressions: insights.impressions || 0,
    engagement: insights.engagement || 0,
    clicks: insights.clicks || 0,
  };
}

async function syncInstagramPost(platformPost: any) {
  const supabase = await createClient();
  const { data: post } = await supabase
    .from('posts')
    .select('workspace_id')
    .eq('id', platformPost.post_id)
    .single();

  if (!post) throw new Error('Post not found');

  const { data: account } = await supabase
    .from('social_accounts')
    .select('id')
    .eq('workspace_id', post.workspace_id)
    .eq('platform', 'instagram')
    .single();

  if (!account) throw new Error('Instagram account not found');

  const client = await createInstagramClient(account.id);
  return await client.getMediaInsights(platformPost.platform_post_id);
}

async function syncTwitterPost(platformPost: any) {
  const supabase = await createClient();
  const { data: post } = await supabase
    .from('posts')
    .select('workspace_id')
    .eq('id', platformPost.post_id)
    .single();

  if (!post) throw new Error('Post not found');

  const { data: account } = await supabase
    .from('social_accounts')
    .select('id')
    .eq('workspace_id', post.workspace_id)
    .eq('platform', 'twitter')
    .single();

  if (!account) throw new Error('Twitter account not found');

  const client = await createTwitterClient(account.id);
  return await client.getTweet(platformPost.platform_post_id);
}

async function syncLinkedInPost(platformPost: any) {
  const supabase = await createClient();
  const { data: post } = await supabase
    .from('posts')
    .select('workspace_id')
    .eq('id', platformPost.post_id)
    .single();

  if (!post) throw new Error('Post not found');

  const { data: account } = await supabase
    .from('social_accounts')
    .select('id')
    .eq('workspace_id', post.workspace_id)
    .eq('platform', 'linkedin')
    .single();

  if (!account) throw new Error('LinkedIn account not found');

  const client = await createLinkedInClient(account.id);
  return await client.getPostStats(platformPost.platform_post_id);
}

async function syncYouTubePost(platformPost: any) {
  const supabase = await createClient();
  const { data: post } = await supabase
    .from('posts')
    .select('workspace_id')
    .eq('id', platformPost.post_id)
    .single();

  if (!post) throw new Error('Post not found');

  const { data: account } = await supabase
    .from('social_accounts')
    .select('id')
    .eq('workspace_id', post.workspace_id)
    .eq('platform', 'youtube')
    .single();

  if (!account) throw new Error('YouTube account not found');

  const client = await createYouTubeClient(account.id);
  return await client.getVideoStats(platformPost.platform_post_id);
}
