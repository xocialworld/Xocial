import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  getUserWorkspace,
  getPagination,
  validateRequest,
  APIError,
} from '@/lib/api-middleware';
import { z } from 'zod';

/**
 * Validation schemas
 */
const createPostSchema = z.object({
  content: z.record(z.object({
    text: z.string(),
    hashtags: z.array(z.string()).optional(),
    mentions: z.array(z.string()).optional(),
  })),
  platforms: z.array(z.enum(['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube'])),
  status: z.enum(['draft', 'pending_approval', 'approved', 'scheduled', 'published', 'failed']).default('draft'),
  scheduled_at: z.string().optional(),
  campaign_id: z.string().optional(),
  media: z.array(z.object({
    id: z.string(),
    url: z.string(),
    type: z.enum(['image', 'video']),
    thumbnail: z.string().optional(),
    filename: z.string(),
    size: z.number(),
  })).optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * GET /api/posts - List posts
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);
  const { page, limit, offset } = getPagination(request);

  // Get user's workspace
  const workspace = await getUserWorkspace(user.id);

  // Get query parameters for filtering
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');
  const accountId = searchParams.get('account_id');
  const campaignId = searchParams.get('campaign_id');

  // Build query
  let query = supabase
    .from('posts')
    .select(`
      *,
      post_analytics(*)
    `, { count: 'exact' })
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: false });

  // Apply filters
  if (status) {
    query = query.eq('status', status);
  }
  if (accountId) {
    query = query.eq('social_account_id', accountId);
  }
  if (campaignId) {
    query = query.eq('campaign_id', campaignId);
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data: posts, error, count } = await query;

  if (error) {
    throw new APIError(500, error.message, 'DATABASE_ERROR');
  }

  return successResponse(
    {
      posts: posts || [],
    },
    {
      page,
      limit,
      total: count || 0,
    }
  );
});

/**
 * POST /api/posts - Create a new post
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);

  // Validate request body
  const validatedData = await validateRequest(request, createPostSchema);

  // Get user's workspace
  const workspace = await getUserWorkspace(user.id);

  // Create post
  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      workspace_id: workspace.id,
      content: validatedData.content,
      platforms: validatedData.platforms,
      status: validatedData.status,
      scheduled_at: validatedData.scheduled_at,
      campaign_id: validatedData.campaign_id,
      media: validatedData.media || [],
      tags: validatedData.tags || [],
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    throw new APIError(500, error.message, 'DATABASE_ERROR');
  }

  return successResponse({ post });
});

/**
 * PATCH /api/posts/:id - Update a post
 */
export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);

  const url = new URL(request.url);
  const postId = url.pathname.split('/').pop();

  if (!postId) {
    throw new APIError(400, 'Post ID is required', 'VALIDATION_ERROR');
  }

  const body = await request.json();

  // Get user's workspace
  const workspace = await getUserWorkspace(user.id);

  // Update post
  const { data: post, error } = await supabase
    .from('posts')
    .update(body)
    .eq('id', postId)
    .eq('workspace_id', workspace.id)
    .select()
    .single();

  if (error) {
    throw new APIError(500, error.message, 'DATABASE_ERROR');
  }

  if (!post) {
    throw new APIError(404, 'Post not found', 'POST_NOT_FOUND');
  }

  return successResponse({ post });
});

/**
 * DELETE /api/posts/:id - Delete a post
 */
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);

  const url = new URL(request.url);
  const postId = url.pathname.split('/').pop();

  if (!postId) {
    throw new APIError(400, 'Post ID is required', 'VALIDATION_ERROR');
  }

  // Get user's workspace
  const workspace = await getUserWorkspace(user.id);

  // Delete post
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('workspace_id', workspace.id);

  if (error) {
    throw new APIError(500, error.message, 'DATABASE_ERROR');
  }

  return successResponse({ message: 'Post deleted successfully' });
});
