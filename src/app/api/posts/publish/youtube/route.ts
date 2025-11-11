import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  getUserWorkspace,
  APIError,
} from '@/lib/api-middleware';
import { uploadYouTubeVideo, updateYouTubeVideo } from '@/lib/oauth/youtube';

/**
 * POST /api/posts/publish/youtube
 * Publish a video to YouTube
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);

  const body = await request.json();
  const {
    postId,
    accountId,
    title,
    description,
    videoUrl,
    tags = [],
    categoryId = '22', // People & Blogs default
    privacyStatus = 'public',
    publishAt, // For scheduling
  } = body;

  // Validation
  if (!postId || !accountId || !title || !videoUrl) {
    throw new APIError(
      400,
      'Post ID, Account ID, title, and video URL are required',
      'MISSING_FIELDS'
    );
  }

  // Get user's workspace
  const workspace = await getUserWorkspace(user.id);

  // Verify post access
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .eq('workspace_id', workspace.id)
    .single();

  if (postError || !post) {
    throw new APIError(404, 'Post not found', 'POST_NOT_FOUND');
  }

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

  if (!account.access_token) {
    throw new APIError(400, 'YouTube account not authenticated', 'NOT_AUTHENTICATED');
  }

  try {
    console.log('[YouTube Publish] Uploading video:', title);

    // Fetch video file from URL
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to fetch video from URL: ${videoResponse.statusText}`);
    }

    const videoBlob = await videoResponse.blob();
    console.log('[YouTube Publish] Video blob size:', videoBlob.size);

    // Upload video to YouTube
    const videoData = await uploadYouTubeVideo(
      account.access_token,
      videoBlob,
      {
        title,
        description: description || '',
        tags,
        categoryId,
        privacyStatus: publishAt ? 'private' : privacyStatus,
      }
    );

    console.log('[YouTube Publish] Video uploaded:', videoData.id);

    // If scheduled, update the video with publish time
    if (publishAt) {
      await updateYouTubeVideo(account.access_token, videoData.id, {
        publishAt,
        privacyStatus: 'public',
      });
      console.log('[YouTube Publish] Video scheduled for:', publishAt);
    }

    // Create platform_post record
    const { error: platformPostError } = await supabase
      .from('platform_posts')
      .insert({
        post_id: postId,
        platform: 'youtube',
        platform_post_id: videoData.id,
        permalink: `https://www.youtube.com/watch?v=${videoData.id}`,
        published_at: publishAt || new Date().toISOString(),
        status: publishAt ? 'scheduled' : 'published',
        metadata: {
          title,
          description,
          tags,
          categoryId,
          privacyStatus,
        },
      });

    if (platformPostError) {
      console.error('[YouTube Publish] Error creating platform_post:', platformPostError);
      throw new Error('Failed to save post record');
    }

    // Update post status
    await supabase
      .from('posts')
      .update({
        status: publishAt ? 'scheduled' : 'published',
        published_at: publishAt ? null : new Date().toISOString(),
      })
      .eq('id', postId);

    console.log('[YouTube Publish] Success!');

    return successResponse({
      videoId: videoData.id,
      url: `https://www.youtube.com/watch?v=${videoData.id}`,
      message: publishAt
        ? `Video scheduled to publish on ${new Date(publishAt).toLocaleString()}`
        : 'Video published to YouTube successfully',
      scheduled: !!publishAt,
    });
  } catch (error: any) {
    console.error('[YouTube Publish] Error:', error);
    
    // If there's an issue, mark the post as failed
    await supabase
      .from('posts')
      .update({
        status: 'failed',
      })
      .eq('id', postId);

    throw new APIError(
      500,
      error.message || 'Failed to publish video to YouTube',
      'YOUTUBE_PUBLISH_ERROR'
    );
  }
});

export const dynamic = 'force-dynamic';

