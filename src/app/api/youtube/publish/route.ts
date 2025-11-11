import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  getUserWorkspace,
  APIError,
} from '@/lib/api-middleware';
import { createYouTubeClient } from '@/lib/platforms/youtube';

/**
 * POST /api/youtube/publish
 * Publish a video to YouTube
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);

  const body = await request.json();
  const { 
    accountId, 
    title, 
    description, 
    videoUrl, 
    thumbnailUrl,
    tags = [],
    categoryId = '22', // People & Blogs default
    privacyStatus = 'public',
    publishAt,
    postId, // Optional: link to existing post in database
  } = body;

  // Validation
  if (!accountId || !title || !videoUrl) {
    throw new APIError(400, 'Account ID, title, and video URL are required', 'MISSING_FIELDS');
  }

  // Get user's workspace
  const workspace = await getUserWorkspace(user.id);

  // Verify account access
  const { data: account, error: accountError } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('id', accountId)
    .eq('workspace_id', workspace.id)
    .eq('platform', 'youtube')
    .single();

  if (accountError || !account) {
    throw new APIError(404, 'YouTube account not found', 'ACCOUNT_NOT_FOUND');
  }

  if (!account.is_active) {
    throw new APIError(400, 'YouTube account is not active', 'ACCOUNT_INACTIVE');
  }

  try {
    // Create YouTube client
    const client = await createYouTubeClient(accountId);

    // Upload video
    const result = await client.uploadVideo({
      title,
      description: description || '',
      videoUrl,
      thumbnailUrl,
      tags,
      categoryId,
      privacyStatus,
      publishAt,
    });

    // If postId is provided, create platform_post record
    if (postId) {
      // Verify post belongs to workspace
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('id, workspace_id')
        .eq('id', postId)
        .eq('workspace_id', workspace.id)
        .single();

      if (postError || !post) {
        console.warn('[YouTube Publish] Post not found or unauthorized:', postId);
      } else {
        // Create platform_post record
        const { error: platformPostError } = await supabase
          .from('platform_posts')
          .insert({
            post_id: postId,
            platform: 'youtube',
            platform_post_id: result.id,
            permalink: `https://www.youtube.com/watch?v=${result.id}`,
            published_at: publishAt || new Date().toISOString(),
            status: privacyStatus === 'private' ? 'scheduled' : 'published',
          });

        if (platformPostError) {
          console.error('[YouTube Publish] Error creating platform_post:', platformPostError);
        }

        // Update post status
        await supabase
          .from('posts')
          .update({
            status: privacyStatus === 'private' ? 'scheduled' : 'published',
            published_at: privacyStatus === 'private' ? null : new Date().toISOString(),
          })
          .eq('id', postId);
      }
    }

    return successResponse({
      videoId: result.id,
      url: `https://www.youtube.com/watch?v=${result.id}`,
      message: privacyStatus === 'private' 
        ? 'Video uploaded privately to YouTube' 
        : 'Video published to YouTube successfully',
    });

  } catch (error: any) {
    console.error('[YouTube Publish] Error:', error);
    throw new APIError(
      500,
      error.message || 'Failed to publish video to YouTube',
      'YOUTUBE_PUBLISH_ERROR'
    );
  }
});

export const dynamic = 'force-dynamic';

