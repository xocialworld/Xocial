import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  getUserWorkspace,
  APIError,
} from '@/lib/api-middleware';
import { uploadYouTubeVideo, setYouTubeVideoThumbnail, updateYouTubeVideo } from '@/lib/oauth/youtube';
import { decryptToken } from '@/lib/encryption';
import { logger } from '@/lib/logger';
import { z } from 'zod';

/**
 * POST /api/youtube/publish
 * Publish a video to YouTube
 * 
 * Body:
 * - accountId: string (UUID of social_accounts record)
 * - videoUrl: string (URL of video file to upload)
 * - title: string
 * - description: string
 * - tags?: string[]
 * - categoryId?: string
 * - privacyStatus?: 'public' | 'unlisted' | 'private'
 * - thumbnailUrl?: string (optional custom thumbnail)
 * - publishAt?: string (ISO datetime for scheduled publishing)
 */

const publishSchema = z.object({
  accountId: z.string().uuid(),
  videoUrl: z.string().url(),
  title: z.string().min(1).max(100),
  description: z.string().max(5000),
  tags: z.array(z.string()).max(500).optional(),
  categoryId: z.string().optional(),
  privacyStatus: z.enum(['public', 'unlisted', 'private']).optional(),
  thumbnailUrl: z.string().url().optional(),
  publishAt: z.string().optional(),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);
  
  // Parse and validate request body
  const body = await request.json();
  const validation = publishSchema.safeParse(body);
  
  if (!validation.success) {
    throw new APIError(400, 'Invalid request data', 'VALIDATION_ERROR', {
      errors: validation.error.errors,
    });
  }
  
  const { accountId, videoUrl, title, description, tags, categoryId, privacyStatus, thumbnailUrl } = validation.data;
  
  // Get user's workspace
  const workspace = await getUserWorkspace(user.id);
  
  // Get YouTube account with access token
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
  
  // Check if token is expired
  if (account.token_expires_at && new Date(account.token_expires_at) < new Date()) {
    throw new APIError(401, 'YouTube access token has expired. Please reconnect your account.', 'TOKEN_EXPIRED');
  }
  
  try {
    // Decrypt access token
    const accessToken = decryptToken(account.access_token);
    
    logger.info(`Publishing video to YouTube channel: ${account.account_name}`, {
      userId: user.id,
      accountId,
      videoTitle: title,
    });
    
    // Fetch video file
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to fetch video file from ${videoUrl}`);
    }
    
    const videoBlob = await videoResponse.blob();
    
    // Validate video file
    if (videoBlob.size > 256 * 1024 * 1024 * 1024) { // 256 GB limit
      throw new APIError(400, 'Video file is too large. Maximum size is 256 GB.', 'FILE_TOO_LARGE');
    }
    
    if (!videoBlob.type.startsWith('video/')) {
      throw new APIError(400, 'Invalid file type. Must be a video file.', 'INVALID_FILE_TYPE');
    }
    
    // Upload video to YouTube
    const uploadResult = await uploadYouTubeVideo(
      accessToken,
      videoBlob,
      {
        title,
        description,
        tags,
        categoryId,
        privacyStatus: privacyStatus || 'public',
      }
    );
    
    // Optional: schedule the video if publishAt is provided
    if (validation.data.publishAt && uploadResult.id) {
      try {
        await updateYouTubeVideo(accessToken, uploadResult.id, {
          privacyStatus: privacyStatus || 'private',
          publishAt: validation.data.publishAt,
        });
        logger.info(`Scheduled video ${uploadResult.id} for ${validation.data.publishAt}`);
      } catch (error: any) {
        logger.warn(`Failed to set scheduled publish time: ${error.message}`);
      }
    }
    
    // Upload custom thumbnail if provided
    if (thumbnailUrl && uploadResult.id) {
      try {
        await setYouTubeVideoThumbnail(accessToken, uploadResult.id, thumbnailUrl);
        logger.info(`Custom thumbnail uploaded for video: ${uploadResult.id}`);
      } catch (error: any) {
        // Log but don't fail the whole operation
        logger.warn(`Failed to upload custom thumbnail: ${error.message}`);
      }
    }
    
    logger.info(`Video published successfully to YouTube: ${uploadResult.id}`, {
      videoId: uploadResult.id,
      channelId: account.account_id,
    });
    
    return NextResponse.json({
      success: true,
      data: {
        videoId: uploadResult.id,
        videoUrl: `https://www.youtube.com/watch?v=${uploadResult.id}`,
        channelName: account.account_name,
      },
    });
  } catch (error: any) {
    logger.error(`Failed to publish video to YouTube: ${error.message}`, error, {
      userId: user.id,
      accountId,
    });
    
    // Check if it's a quota error
    if (error.message && error.message.includes('quota')) {
      throw new APIError(429, 'YouTube API quota exceeded. Please try again later.', 'QUOTA_EXCEEDED');
    }
    
    // Check if it's an authentication error
    if (error.message && (error.message.includes('401') || error.message.includes('invalid credentials'))) {
      throw new APIError(401, 'YouTube authentication failed. Please reconnect your account.', 'AUTH_FAILED');
    }
    
    throw new APIError(500, `YouTube publish failed: ${error.message}`, 'PUBLISH_FAILED');
  }
});

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large video uploads

