import { NextRequest } from 'next/server';
import { withErrorHandler, requireAuth, successResponse, APIError } from '@/lib/api-middleware';
import { createFacebookClient } from '@/lib/platforms/facebook';

export const dynamic = 'force-dynamic';

/**
 * GET /api/posts/[id]/comments - Fetch comments for a post
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const { user, supabase } = await requireAuth(request);
  const postId = params.id;
  
  // Get post and verify access
  const { data: post } = await supabase
    .from('posts')
    .select('*, workspace_id')
    .eq('id', postId)
    .single();
  
  if (!post) throw new APIError(404, 'Post not found');
  
  // Verify workspace access
  const { data: member } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', post.workspace_id)
    .eq('user_id', user.id)
    .single();
  
  if (!member) throw new APIError(403, 'Access denied');
  
  // Get Facebook account
  const { data: account } = await supabase
    .from('social_accounts')
    .select('id')
    .eq('workspace_id', post.workspace_id)
    .eq('platform', 'facebook')
    .single();
  
  if (!account) throw new APIError(404, 'Facebook account not connected');
  
  // Get external post ID
  const externalIds = typeof post.external_post_id === 'string'
    ? JSON.parse(post.external_post_id)
    : post.external_post_id || {};
  
  const fbPostId = externalIds.facebook;
  if (!fbPostId) throw new APIError(404, 'Post not published to Facebook');
  
  // Fetch comments
  const client = await createFacebookClient(account.id);
  const comments = await client.getComments(fbPostId);
  
  return successResponse({ comments });
});

/**
 * POST /api/posts/[id]/comments - Reply to/manage comments
 */
export const POST = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const { user, supabase } = await requireAuth(request);
  const body = await request.json();
  const { action, commentId, message } = body;
  
  // Verify access (same as GET)
  const postId = params.id;
  const { data: post } = await supabase
    .from('posts')
    .select('*, workspace_id')
    .eq('id', postId)
    .single();
  
  if (!post) throw new APIError(404, 'Post not found');
  
  const { data: member } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', post.workspace_id)
    .eq('user_id', user.id)
    .single();
  
  if (!member) throw new APIError(403, 'Access denied');
  
  const { data: account } = await supabase
    .from('social_accounts')
    .select('id')
    .eq('workspace_id', post.workspace_id)
    .eq('platform', 'facebook')
    .single();
  
  if (!account) throw new APIError(404, 'Facebook account not connected');
  
  const client = await createFacebookClient(account.id);
  
  let result;
  
  switch (action) {
    case 'reply':
      if (!message) throw new APIError(400, 'Message required for reply');
      result = await client.replyToComment(commentId, message);
      break;
      
    case 'hide':
      result = await client.hideComment(commentId);
      break;
      
    case 'delete':
      result = await client.deleteComment(commentId);
      break;
      
    default:
      throw new APIError(400, 'Invalid action');
  }
  
  return successResponse({ result });
});

