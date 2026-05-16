import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandler,
  APIError,
} from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { getYouTubeVideoComments, replyToYouTubeComment } from '@/lib/oauth/youtube';
import { decryptToken } from '@/lib/encryption';
import { z } from 'zod';

/**
 * GET /api/youtube/comments?videoId=xxx&accountId=xxx
 * Fetch comments for a YouTube video
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { userClient: supabase, workspace } = await requireWorkspaceContext(request);
  
  const searchParams = request.nextUrl.searchParams;
  const videoId = searchParams.get('videoId');
  const accountId = searchParams.get('accountId');
  const maxResults = parseInt(searchParams.get('maxResults') || '100');
  
  if (!videoId) {
    throw new APIError(400, 'videoId parameter is required', 'MISSING_VIDEO_ID');
  }
  
  if (!accountId) {
    throw new APIError(400, 'accountId parameter is required', 'MISSING_ACCOUNT_ID');
  }
  
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
    // Fetch comments from YouTube
    const comments = await getYouTubeVideoComments(accessToken, videoId, maxResults);
    
    // Transform comments to our format
    const transformedComments = comments.map((item) => ({
      id: item.id,
      videoId: item.snippet.videoId,
      text: item.snippet.topLevelComment.snippet.textDisplay,
      author: {
        name: item.snippet.topLevelComment.snippet.authorDisplayName,
        avatar: item.snippet.topLevelComment.snippet.authorProfileImageUrl,
        channelId: item.snippet.topLevelComment.snippet.authorChannelId?.value,
      },
      likeCount: item.snippet.topLevelComment.snippet.likeCount,
      publishedAt: item.snippet.topLevelComment.snippet.publishedAt,
      updatedAt: item.snippet.topLevelComment.snippet.updatedAt,
      replyCount: item.snippet.totalReplyCount,
      canReply: item.snippet.canReply,
    }));
    
    return NextResponse.json({
      success: true,
      data: transformedComments,
      count: transformedComments.length,
    });
  } catch (error: any) {
    throw new APIError(500, `Failed to fetch YouTube comments: ${error.message}`, 'FETCH_FAILED');
  }
});

/**
 * POST /api/youtube/comments
 * Reply to a YouTube comment
 * 
 * Body:
 * - accountId: string
 * - commentId: string
 * - replyText: string
 */
const replySchema = z.object({
  accountId: z.string().uuid(),
  commentId: z.string(),
  replyText: z.string().min(1).max(10000),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { userClient: supabase, workspace } = await requireWorkspaceContext(request);
  
  // Parse and validate request body
  const body = await request.json();
  const validation = replySchema.safeParse(body);
  
  if (!validation.success) {
    throw new APIError(400, 'Invalid request data', 'VALIDATION_ERROR', {
      errors: validation.error.errors,
    });
  }
  
  const { accountId, commentId, replyText } = validation.data;
  
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
    // Reply to comment
    await replyToYouTubeComment(accessToken, commentId, replyText);
    
    return NextResponse.json({
      success: true,
      message: 'Reply posted successfully',
    });
  } catch (error: any) {
    throw new APIError(500, `Failed to reply to YouTube comment: ${error.message}`, 'REPLY_FAILED');
  }
});

export const runtime = 'nodejs';
