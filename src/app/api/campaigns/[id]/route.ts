/**
 * Campaign Detail API
 * GET /api/campaigns/[id] - Get campaign details
 * PATCH /api/campaigns/[id] - Update campaign
 * DELETE /api/campaigns/[id] - Delete campaign
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  withErrorHandler,
  successResponse,
  validateRequest,
  APIError,
} from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { logger } from '@/lib/logger';

/**
 * Update campaign schema
 */
const updateCampaignSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  goal: z.string().optional(),
  budget: z.number().positive().optional(),
  status: z.enum(['active', 'paused', 'completed', 'archived']).optional(),
});

/**
 * GET /api/campaigns/[id]
 * Get campaign details with analytics
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { userClient: supabase, workspace } = await requireWorkspaceContext(request);
  const { id } = await params;

  // Fetch campaign with related data
  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select(`
      *,
      created_by:profiles!campaigns_created_by_fkey(id, name, email, avatar_url),
      posts:posts(
        id,
        content,
        status,
        published_at,
        platforms,
        post_analytics(
          platform,
          impressions,
          engagement,
          likes,
          comments,
          shares
        )
      )
    `)
    .eq('id', id)
    .eq('workspace_id', workspace.id)
    .single();

  if (error || !campaign) {
    throw new APIError(404, 'Campaign not found', 'CAMPAIGN_NOT_FOUND');
  }

  // Calculate campaign analytics
  const posts = campaign.posts || [];
  const totalPosts = posts.length;
  const publishedPosts = posts.filter((p: any) => p.status === 'published').length;
  
  let totalImpressions = 0;
  let totalEngagement = 0;
  let totalLikes = 0;
  let totalComments = 0;
  let totalShares = 0;

  posts.forEach((post: any) => {
    post.post_analytics?.forEach((analytics: any) => {
      totalImpressions += analytics.impressions || 0;
      totalEngagement += analytics.engagement || 0;
      totalLikes += analytics.likes || 0;
      totalComments += analytics.comments || 0;
      totalShares += analytics.shares || 0;
    });
  });

  const analytics = {
    totalPosts,
    publishedPosts,
    draftPosts: totalPosts - publishedPosts,
    totalImpressions,
    totalEngagement,
    totalLikes,
    totalComments,
    totalShares,
    avgEngagement: publishedPosts > 0 ? totalEngagement / publishedPosts : 0,
  };

  return successResponse({
    campaign: {
      ...campaign,
      analytics,
    },
  });
});

/**
 * PATCH /api/campaigns/[id]
 * Update campaign
 */
export const PATCH = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { user, userClient: supabase, workspace } = await requireWorkspaceContext(request);
  const updates = await validateRequest(request, updateCampaignSchema);
  const { id } = await params;

  // Update campaign
  const { data: campaign, error } = await supabase
    .from('campaigns')
    .update(updates)
    .eq('id', id)
    .eq('workspace_id', workspace.id)
    .select()
    .single();

  if (error) {
    throw new APIError(500, error.message, 'UPDATE_FAILED');
  }

  if (!campaign) {
    throw new APIError(404, 'Campaign not found', 'CAMPAIGN_NOT_FOUND');
  }

  logger.info('Campaign updated', {
    userId: user.id,
    workspaceId: workspace.id,
    campaignId: id,
  });

  return successResponse({ campaign });
});

/**
 * DELETE /api/campaigns/[id]
 * Delete campaign
 */
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { user, userClient: supabase, workspace } = await requireWorkspaceContext(request);
  const { id } = await params;

  // Delete campaign (posts will have campaign_id set to NULL due to ON DELETE SET NULL)
  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspace.id);

  if (error) {
    throw new APIError(500, error.message, 'DELETE_FAILED');
  }

  logger.info('Campaign deleted', {
    userId: user.id,
    workspaceId: workspace.id,
    campaignId: id,
  });

  return successResponse({ message: 'Campaign deleted successfully' });
});

export const dynamic = 'force-dynamic';
