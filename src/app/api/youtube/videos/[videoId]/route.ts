import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  getUserWorkspace,
  APIError,
} from '@/lib/api-middleware';
import { 
  updateYouTubeVideo, 
  getYouTubeVideoStats,
  deleteYouTubeVideo,
  setYouTubeVideoThumbnail,
} from '@/lib/oauth/youtube';
import { decryptToken } from '@/lib/encryption';
import { logger } from '@/lib/logger';
import { z } from 'zod';

/**
 * GET /api/youtube/videos/[videoId]
 * Fetch detailed information about a YouTube video
 * 
 * Query params:
 * - accountId: string (UUID of social_accounts record)
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) => {
  const { videoId } = await params;
  const { user, supabase } = await requireAuth(request);
  
  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get('accountId');
  
  if (!accountId) {
    throw new APIError(400, 'accountId parameter is required', 'MISSING_ACCOUNT_ID');
  }
  
  // Get user's workspace
  const workspace = await getUserWorkspace(user.id);
  
  // Get YouTube account
  const { data: account, error: accountError } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('id', accountId)
    .eq('workspace_id', workspace.id)
    .eq('platform', 'youtube')
    .eq('is_active', true)
    .single();
  
  if (accountError || !account) {
    throw new APIError(404, 'YouTube account not found', 'ACCOUNT_NOT_FOUND');
  }
  
  // Decrypt access token
  const accessToken = decryptToken(account.access_token);
  
  try {
    // Fetch video details from YouTube
    const video = await getYouTubeVideoStats(accessToken, videoId);
    
    logger.info(`Fetched YouTube video details: ${videoId}`, {
      userId: user.id,
      accountId,
    });
    
    return NextResponse.json({
      success: true,
      data: {
        id: video.id,
        title: video.snippet.title,
        description: video.snippet.description,
        publishedAt: video.snippet.publishedAt,
        thumbnails: video.snippet.thumbnails,
        statistics: {
          views: parseInt(video.statistics?.viewCount || '0'),
          likes: parseInt(video.statistics?.likeCount || '0'),
          comments: parseInt(video.statistics?.commentCount || '0'),
        },
      },
    });
  } catch (error: any) {
    logger.error(`Failed to fetch YouTube video: ${error.message}`, error, {
      userId: user.id,
      accountId,
      videoId,
    });
    
    throw new APIError(500, `Failed to fetch YouTube video: ${error.message}`, 'FETCH_FAILED');
  }
});

/**
 * PATCH /api/youtube/videos/[videoId]
 * Update YouTube video metadata (real-time editing)
 * 
 * Body:
 * - accountId: string (UUID of social_accounts record)
 * - title?: string
 * - description?: string
 * - tags?: string[]
 * - privacyStatus?: 'public' | 'unlisted' | 'private'
 * - publishAt?: string (ISO datetime for scheduling)
 * - thumbnailUrl?: string (URL for custom thumbnail)
 */
const updateSchema = z.object({
  accountId: z.string().uuid(),
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(5000).optional(),
  tags: z.array(z.string()).max(500).optional(),
  privacyStatus: z.enum(['public', 'unlisted', 'private']).optional(),
  publishAt: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
  categoryId: z.string().optional(),
});

export const PATCH = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) => {
  const { videoId } = await params;
  const { user, supabase } = await requireAuth(request);
  
  // Parse and validate request body
  const body = await request.json();
  const validation = updateSchema.safeParse(body);
  
  if (!validation.success) {
    throw new APIError(400, 'Invalid request data', 'VALIDATION_ERROR', {
      errors: validation.error.errors,
    });
  }
  
  const { accountId, title, description, tags, privacyStatus, publishAt, thumbnailUrl, categoryId } = validation.data;
  
  // Get user's workspace
  const workspace = await getUserWorkspace(user.id);
  
  // Get YouTube account
  const { data: account, error: accountError } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('id', accountId)
    .eq('workspace_id', workspace.id)
    .eq('platform', 'youtube')
    .eq('is_active', true)
    .single();
  
  if (accountError || !account) {
    throw new APIError(404, 'YouTube account not found', 'ACCOUNT_NOT_FOUND');
  }
  
  // Decrypt access token
  const accessToken = decryptToken(account.access_token);
  
  try {
    logger.info(`Updating YouTube video: ${videoId}`, {
      userId: user.id,
      accountId,
      updates: Object.keys(validation.data).filter(k => k !== 'accountId'),
    });
    
    // First, get the current video data
    const currentVideo = await getYouTubeVideoStats(accessToken, videoId);
    
    // Build the update payload
    const updatePayload: any = {
      id: videoId,
      snippet: {
        title: title || currentVideo.snippet.title,
        description: description || currentVideo.snippet.description,
        tags: tags || currentVideo.snippet.tags || [],
        categoryId: categoryId || currentVideo.snippet.categoryId || '22',
      },
    };
    
    // Add status updates if provided
    if (privacyStatus || publishAt) {
      updatePayload.status = {
        privacyStatus: privacyStatus,
        publishAt: publishAt,
      };
    }
    
    // Update video metadata
    const params = new URLSearchParams({
      part: 'snippet' + (privacyStatus || publishAt ? ',status' : ''),
    });
    
    const updateResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${params.toString()}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      }
    );
    
    if (!updateResponse.ok) {
      const error = await updateResponse.json();
      throw new Error(error.error?.message || 'Failed to update video');
    }
    
    const updatedVideo = await updateResponse.json();
    
    // Update thumbnail if provided
    if (thumbnailUrl) {
      try {
        await setYouTubeVideoThumbnail(accessToken, videoId, thumbnailUrl);
        logger.info(`Updated thumbnail for video: ${videoId}`);
      } catch (error: any) {
        logger.warn(`Failed to update thumbnail: ${error.message}`);
      }
    }
    
    // Update the post in our database if it exists
    const { data: existingPost } = await supabase
      .from('posts')
      .select('id, external_ids')
      .eq('workspace_id', workspace.id)
      .contains('platforms', ['youtube'])
      .single();
    
    if (existingPost && existingPost.external_ids?.youtube === videoId) {
      await supabase
        .from('posts')
        .update({
          content: title || currentVideo.snippet.title,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingPost.id);
    }
    
    logger.info(`Successfully updated YouTube video: ${videoId}`, {
      userId: user.id,
      accountId,
    });
    
    return NextResponse.json({
      success: true,
      data: {
        id: updatedVideo.id,
        title: updatedVideo.snippet.title,
        description: updatedVideo.snippet.description,
        tags: updatedVideo.snippet.tags,
        privacyStatus: updatedVideo.status?.privacyStatus,
        publishAt: updatedVideo.status?.publishAt,
      },
      message: 'Video updated successfully',
    });
  } catch (error: any) {
    logger.error(`Failed to update YouTube video: ${error.message}`, error, {
      userId: user.id,
      accountId,
      videoId,
    });
    
    throw new APIError(500, `Failed to update YouTube video: ${error.message}`, 'UPDATE_FAILED');
  }
});

/**
 * DELETE /api/youtube/videos/[videoId]
 * Delete a YouTube video
 * 
 * Query params:
 * - accountId: string (UUID of social_accounts record)
 */
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) => {
  const { videoId } = await params;
  const { user, supabase } = await requireAuth(request);
  
  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get('accountId');
  
  if (!accountId) {
    throw new APIError(400, 'accountId parameter is required', 'MISSING_ACCOUNT_ID');
  }
  
  // Get user's workspace
  const workspace = await getUserWorkspace(user.id);
  
  // Get YouTube account
  const { data: account, error: accountError } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('id', accountId)
    .eq('workspace_id', workspace.id)
    .eq('platform', 'youtube')
    .eq('is_active', true)
    .single();
  
  if (accountError || !account) {
    throw new APIError(404, 'YouTube account not found', 'ACCOUNT_NOT_FOUND');
  }
  
  // Decrypt access token
  const accessToken = decryptToken(account.access_token);
  
  try {
    logger.info(`Deleting YouTube video: ${videoId}`, {
      userId: user.id,
      accountId,
    });
    
    // Delete video from YouTube
    await deleteYouTubeVideo(accessToken, videoId);
    
    // Delete associated post from our database if it exists
    const { data: existingPost } = await supabase
      .from('posts')
      .select('id')
      .eq('workspace_id', workspace.id)
      .contains('platforms', ['youtube'])
      .single();
    
    if (existingPost) {
      await supabase
        .from('posts')
        .delete()
        .eq('id', existingPost.id);
    }
    
    logger.info(`Successfully deleted YouTube video: ${videoId}`, {
      userId: user.id,
      accountId,
    });
    
    return NextResponse.json({
      success: true,
      message: 'Video deleted successfully',
    });
  } catch (error: any) {
    logger.error(`Failed to delete YouTube video: ${error.message}`, error, {
      userId: user.id,
      accountId,
      videoId,
    });
    
    throw new APIError(500, `Failed to delete YouTube video: ${error.message}`, 'DELETE_FAILED');
  }
});

export const runtime = 'nodejs';

