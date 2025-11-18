import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  getUserWorkspace,
  APIError,
} from '@/lib/api-middleware';
import { decryptToken } from '@/lib/encryption';
import { logger } from '@/lib/logger';
import { z } from 'zod';

/**
 * GET /api/youtube/playlists
 * Fetch YouTube playlists for a channel
 * 
 * Query params:
 * - accountId: string (UUID of social_accounts record)
 * - maxResults?: number (default: 25, max: 50)
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);
  
  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get('accountId');
  const maxResults = parseInt(searchParams.get('maxResults') || '25', 10);
  
  if (!accountId) {
    throw new APIError(400, 'accountId parameter is required', 'MISSING_ACCOUNT_ID');
  }
  
  if (maxResults > 50) {
    throw new APIError(400, 'maxResults cannot exceed 50', 'INVALID_MAX_RESULTS');
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
    const params = new URLSearchParams({
      part: 'snippet,contentDetails',
      channelId: account.account_id,
      maxResults: maxResults.toString(),
    });
    
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/playlists?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch playlists');
    }
    
    const data = await response.json();
    
    const playlists = data.items.map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnails: item.snippet.thumbnails,
      itemCount: item.contentDetails.itemCount,
      publishedAt: item.snippet.publishedAt,
    }));
    
    logger.info(`Fetched ${playlists.length} playlists for channel: ${account.account_name}`, {
      userId: user.id,
      accountId,
    });
    
    return NextResponse.json({
      success: true,
      data: playlists,
      count: playlists.length,
    });
  } catch (error: any) {
    logger.error(`Failed to fetch YouTube playlists: ${error.message}`, error, {
      userId: user.id,
      accountId,
    });
    
    throw new APIError(500, `Failed to fetch YouTube playlists: ${error.message}`, 'FETCH_FAILED');
  }
});

/**
 * POST /api/youtube/playlists
 * Create a new YouTube playlist
 * 
 * Body:
 * - accountId: string (UUID of social_accounts record)
 * - title: string
 * - description?: string
 * - privacyStatus?: 'public' | 'unlisted' | 'private'
 */
const createPlaylistSchema = z.object({
  accountId: z.string().uuid(),
  title: z.string().min(1).max(150),
  description: z.string().max(5000).optional(),
  privacyStatus: z.enum(['public', 'unlisted', 'private']).optional(),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);
  
  const body = await request.json();
  const validation = createPlaylistSchema.safeParse(body);
  
  if (!validation.success) {
    throw new APIError(400, 'Invalid request data', 'VALIDATION_ERROR', {
      errors: validation.error.errors,
    });
  }
  
  const { accountId, title, description, privacyStatus } = validation.data;
  
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
    const params = new URLSearchParams({
      part: 'snippet,status',
    });
    
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/playlists?${params.toString()}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snippet: {
            title,
            description: description || '',
          },
          status: {
            privacyStatus: privacyStatus || 'private',
          },
        }),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to create playlist');
    }
    
    const data = await response.json();
    
    logger.info(`Created YouTube playlist: ${title}`, {
      userId: user.id,
      accountId,
      playlistId: data.id,
    });
    
    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        title: data.snippet.title,
        description: data.snippet.description,
        privacyStatus: data.status.privacyStatus,
      },
      message: 'Playlist created successfully',
    });
  } catch (error: any) {
    logger.error(`Failed to create YouTube playlist: ${error.message}`, error, {
      userId: user.id,
      accountId,
    });
    
    throw new APIError(500, `Failed to create YouTube playlist: ${error.message}`, 'CREATE_FAILED');
  }
});

export const runtime = 'nodejs';

