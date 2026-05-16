/**
 * Campaigns API
 * CRUD operations for marketing campaigns
 * GET /api/campaigns - List campaigns
 * POST /api/campaigns - Create campaign
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  withErrorHandler,
  successResponse,
  getPagination,
  validateRequest,
  APIError,
} from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { logger } from '@/lib/logger';

/**
 * Validation schema for creating campaigns
 */
const createCampaignSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).default('#3B82F6'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  goal: z.string().optional(),
  budget: z.number().positive().optional(),
  status: z.enum(['active', 'paused', 'completed', 'archived']).default('active'),
});

/**
 * GET /api/campaigns
 * List all campaigns for workspace
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { userClient: supabase, workspace } = await requireWorkspaceContext(request);
  const { page, limit, offset } = getPagination(request);

  // Get query parameters
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');

  // Build query
  let query = supabase
    .from('campaigns')
    .select(`
      *,
      created_by:profiles!campaigns_created_by_fkey(id, name, email),
      posts_count:posts(count)
    `, { count: 'exact' })
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: false });

  // Apply filters
  if (status) {
    query = query.eq('status', status);
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data: campaigns, error, count } = await query;

  if (error) {
    throw new APIError(500, error.message, 'DATABASE_ERROR');
  }

  return successResponse(
    {
      campaigns: campaigns || [],
    },
    {
      page,
      limit,
      total: count || 0,
    }
  );
});

/**
 * POST /api/campaigns
 * Create a new campaign
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const { user, userClient: supabase, workspace } = await requireWorkspaceContext(request);

  // Validate request body
  const validatedData = await validateRequest(request, createCampaignSchema);

  // Create campaign
  const { data: campaign, error } = await supabase
    .from('campaigns')
    .insert({
      workspace_id: workspace.id,
      created_by: user.id,
      ...validatedData,
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create campaign', error as any, {
      userId: user.id,
      workspaceId: workspace.id,
    });
    throw new APIError(500, error.message, 'DATABASE_ERROR');
  }

  logger.info('Campaign created', {
    userId: user.id,
    workspaceId: workspace.id,
    campaignId: campaign.id,
  });

  return successResponse({ campaign });
});

export const dynamic = 'force-dynamic';
