import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  getUserWorkspace,
  getWorkspaceFromRequest,
  getPagination,
  validateRequest,
  APIError,
  checkWorkspaceAccess,
} from '@/lib/api-middleware';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { platformPublisher, type Platform } from '@/lib/platforms/publisher';
import {
  recordPlatformPosts,
  createInitialAnalytics,
  extractExternalIds,
} from '@/lib/platforms/publish-utils';
import { normalizeMetadata } from '@/lib/platforms/post-publish-helpers';
import { getCompatiblePlatforms } from '@/lib/platforms/capabilities';

/**
 * Validation schemas
 */
const PLATFORM_VALUES = ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube'] as const;

const platformEnum = z.enum(PLATFORM_VALUES);

const createPostSchema = z.object({
  content: z.record(
    z.object({
      text: z.string(),
      hashtags: z.array(z.string()).optional(),
      mentions: z.array(z.string()).optional(),
    })
  ),
  platforms: z.array(platformEnum),
  platformAccounts: z.record(z.string(), z.string().uuid()).optional(),
  status: z
    .enum(['draft', 'pending_approval', 'approved', 'scheduled', 'published', 'failed'])
    .default('draft'),
  scheduled_at: z.string().optional(),
  campaign_id: z.string().optional(),
  media: z
    .array(
      z.object({
        id: z.string(),
        url: z.string(),
        type: z.enum(['image', 'video']),
        thumbnail: z.string().optional(),
        filename: z.string(),
        size: z.number(),
      })
    )
    .optional(),
  mediaIds: z.array(z.string().uuid()).optional(),
  tags: z.array(z.string()).optional(),
  // AI metadata fields (from SRS 2025 enhancements)
  ai_generated: z.boolean().optional(),
  ai_generation_id: z.string().uuid().optional(),
  ai_prompt: z.string().optional(),
  ai_metadata: z
    .object({
      model: z.string().optional(),
      tone: z.string().optional(),
      style: z.string().optional(),
      length: z.string().optional(),
      platforms: z.array(platformEnum).optional(),
    })
    .optional(),
});

type ValidatedPostInput = z.infer<typeof createPostSchema>;
type NormalizedPostInput = ValidatedPostInput & {
  status: NonNullable<ValidatedPostInput['status']>;
};

/**
 * Valid status transitions map
 * Key: current status, Value: array of allowed next statuses
 */
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['scheduled', 'pending_approval', 'published'],
  pending_approval: ['approved', 'draft', 'scheduled'], // Can be sent back to draft or scheduled after review
  approved: ['scheduled', 'published'],
  scheduled: ['draft', 'pending_approval', 'published', 'failed'],
  published: [], // Terminal state - cannot change
  failed: ['scheduled', 'draft'], // Can retry by rescheduling or reverting to draft
};

/**
 * Validate that a status transition is allowed
 */
function validateStatusTransition(fromStatus: string, toStatus: string): boolean {
  const allowed = VALID_STATUS_TRANSITIONS[fromStatus];
  return allowed ? allowed.includes(toStatus) : false;
}

/**
 * Validate status requirements
 */
function validateStatusRequirements(
  status: string,
  scheduledAt: string | undefined,
  platforms: string[],
  platformAccounts: Record<string, string> | undefined
): void {
  // Scheduled posts require a scheduled_at date
  if (status === 'scheduled') {
    if (!scheduledAt) {
      throw new APIError(
        400,
        'Scheduled posts require a scheduled_at date',
        'MISSING_SCHEDULED_AT'
      );
    }
    
    // Validate scheduled date is in the future
    const scheduledDate = new Date(scheduledAt);
    const now = new Date();
    if (scheduledDate <= now) {
      throw new APIError(
        400,
        'Scheduled time must be in the future',
        'INVALID_SCHEDULED_TIME'
      );
    }
  }

  // Published and scheduled posts require platform accounts
  if (['published', 'scheduled', 'pending_approval'].includes(status)) {
    if (!platformAccounts || Object.keys(platformAccounts).length === 0) {
      throw new APIError(
        400,
        'Platform accounts are required for this status',
        'MISSING_PLATFORM_ACCOUNTS'
      );
    }

    // Ensure all platforms have accounts assigned
    const missing = platforms.filter(p => !platformAccounts[p]);
    if (missing.length > 0) {
      throw new APIError(
        400,
        `Missing account selections for: ${missing.join(', ')}`,
        'MISSING_PLATFORM_ACCOUNTS'
      );
    }
  }

  // Posts must have at least one platform
  if (platforms.length === 0) {
    throw new APIError(
      400,
      'At least one platform is required',
      'MISSING_PLATFORMS'
    );
  }
}

async function ensurePlatformAccounts(
  supabase: SupabaseClient,
  workspaceId: string,
  platformAccounts: Record<string, string> | undefined,
  status: ValidatedPostInput['status']
) {
  if (status === 'draft') {
    return (platformAccounts as Partial<Record<Platform, string>>) || {};
  }

  if (!platformAccounts || Object.keys(platformAccounts).length === 0) {
    throw new APIError(
      400,
      'At least one platform account selection is required',
      'MISSING_PLATFORM_ACCOUNTS'
    );
  }

  const normalizedEntries = Object.entries(platformAccounts).map(([platform, accountId]) => {
    if (!PLATFORM_VALUES.includes(platform as Platform)) {
      throw new APIError(400, `Unsupported platform "${platform}"`, 'INVALID_PLATFORM');
    }
    return [platform as Platform, accountId] as const;
  });

  const uniqueAccountIds = Array.from(new Set(normalizedEntries.map(([, id]) => id)));

  const { data: accounts, error } = await supabase
    .from('social_accounts')
    .select('id, platform')
    .in('id', uniqueAccountIds)
    .eq('workspace_id', workspaceId);

  if (error) {
    throw new APIError(500, error.message, 'DATABASE_ERROR', error);
  }

  if (!accounts || accounts.length !== uniqueAccountIds.length) {
    throw new APIError(
      400,
      'One or more social accounts are invalid or unavailable',
      'INVALID_PLATFORM_ACCOUNT'
    );
  }

  normalizedEntries.forEach(([platform, accountId]) => {
    const match = accounts.find((account) => account.id === accountId);
    if (!match) {
      throw new APIError(
        400,
        `Account ${accountId} is not connected to this workspace`,
        'INVALID_PLATFORM_ACCOUNT'
      );
    }
    if (match.platform?.toLowerCase() !== platform.toLowerCase()) {
      throw new APIError(
        400,
        `Account ${accountId} does not belong to ${platform}`,
        'INVALID_PLATFORM_ACCOUNT'
      );
    }
  });

  return normalizedEntries.reduce((acc, [platform, accountId]) => {
    acc[platform] = accountId;
    return acc;
  }, {} as Partial<Record<Platform, string>>);
}

async function ensureMediaOwnership(
  supabase: SupabaseClient,
  workspaceId: string,
  mediaIds?: string[]
) {
  if (!mediaIds || mediaIds.length === 0) {
    return;
  }

  const { data, error } = await supabase
    .from('media_assets')
    .select('id')
    .eq('workspace_id', workspaceId)
    .in('id', mediaIds);

  if (error) {
    console.error('[ensureMediaOwnership] Database error:', error);
    throw new APIError(500, error.message, 'DATABASE_ERROR');
  }

  if (!data || data.length !== mediaIds.length) {
    console.error('[ensureMediaOwnership] Media validation failed:', {
      expected: mediaIds.length,
      found: data?.length || 0,
      mediaIds,
    });
    throw new APIError(400, 'One or more media items are invalid', 'INVALID_MEDIA');
  }
}

function buildPlatformContentMap(
  content: ValidatedPostInput['content'],
  platforms: Platform[]
) {
  const fallbackText =
    content.default?.text ||
    platforms
      .map((platform) => content[platform]?.text)
      .find((text): text is string => Boolean(text)) ||
    '';

  return platforms.reduce((acc, platform) => {
    acc[platform] = {
      text: content[platform]?.text || fallbackText,
    };
    return acc;
  }, {} as Partial<Record<Platform, { text: string }>>);
}

function shouldPublishImmediately(input: ValidatedPostInput) {
  return input.status === 'published' && !input.scheduled_at;
}

/**
 * Validate that the content is compatible with all selected platforms
 */
function validateContentForPlatforms(
  platforms: Platform[],
  input: ValidatedPostInput
): void {
  const media = input.media || [];
  const hasText = Object.values(input.content).some(c => c?.text?.trim());
  const hasImages = media.some(m => m.type === 'image');
  const hasVideos = media.some(m => m.type === 'video');
  const imageCount = media.filter(m => m.type === 'image').length;
  const videoCount = media.filter(m => m.type === 'video').length;

  const { incompatible } = getCompatiblePlatforms(platforms, {
    hasText,
    hasImages,
    hasVideos,
    imageCount,
    videoCount,
  });

  if (incompatible.length > 0) {
    const errorMessages = incompatible.map(i => `${i.platform}: ${i.reason}`);
    throw new APIError(
      400,
      `Content not supported for: ${errorMessages.join('; ')}`,
      'INCOMPATIBLE_CONTENT',
      { incompatiblePlatforms: incompatible }
    );
  }
}

async function publishImmediately({
  supabase,
  post,
  input,
  platformAccounts,
}: {
  supabase: SupabaseClient;
  post: any;
  input: ValidatedPostInput;
  platformAccounts: Partial<Record<Platform, string>>;
}) {
  const platforms = (post.platforms || []) as Platform[];

  console.log('[publishImmediately] Starting publish for platforms:', platforms);
  console.log('[publishImmediately] Input content keys:', Object.keys(input.content || {}));
  console.log('[publishImmediately] Media count:', input.media?.length || 0);

  // Validate content compatibility before attempting to publish
  validateContentForPlatforms(platforms, input);

  const contentMap = buildPlatformContentMap(input.content, platforms);
  const mediaUrls =
    input.media?.map((item) => item.url).filter((url) => Boolean(url)) ?? undefined;

  const primaryPlatform = platforms[0];
  const fallbackText = primaryPlatform ? contentMap[primaryPlatform]?.text || '' : '';

  console.log('[publishImmediately] Content map:', contentMap);
  console.log('[publishImmediately] Fallback text length:', fallbackText.length);
  console.log('[publishImmediately] Media URLs:', mediaUrls);

  const publishResults = await platformPublisher.publishToAll({
    platforms,
    content: {
      text: fallbackText,
      mediaUrls,
    },
    platformContent: platforms.reduce((acc, platform) => {
      acc[platform] = {
        text: contentMap[platform]?.text || fallbackText,
        mediaUrls,
      };
      return acc;
    }, {} as Partial<Record<Platform, { text: string; mediaUrls?: string[] }>>),
    accountIds: platformAccounts,
  });

  console.log('[publishImmediately] Publish results:', publishResults);

  const metadata = normalizeMetadata(post.metadata);
  const allSucceeded = publishResults.every((result) => result.success);
  const publishedAt = new Date().toISOString();

  if (allSucceeded) {
    const externalIds = extractExternalIds(publishResults);

    await supabase
      .from('posts')
      .update({
        status: 'published',
        published_at: publishedAt,
        external_post_id: JSON.stringify(externalIds),
        metadata: {
          ...metadata,
          accountIds: platformAccounts,
          publishResults,
        },
      })
      .eq('id', post.id);

    await recordPlatformPosts({
      supabase,
      postId: post.id,
      publishResults,
      publishedAt,
    });

    await createInitialAnalytics({
      supabase,
      postId: post.id,
      publishResults,
    });

    const { data: refreshed } = await supabase
      .from('posts')
      .select('*')
      .eq('id', post.id)
      .single();

    return refreshed || post;
  }

  const errors = publishResults
    .filter((result) => !result.success && result.error)
    .map((result) => `${result.platform}: ${result.error}`)
    .join('; ');

  await supabase
    .from('posts')
    .update({
      status: 'failed',
      error_message: errors || 'Failed to publish to selected platforms',
      metadata: {
        ...metadata,
        accountIds: platformAccounts,
        publishResults,
      },
    })
    .eq('id', post.id);

  throw new APIError(502, 'Failed to publish to one or more platforms', 'PUBLISH_FAILED', {
    errors: publishResults,
  });
}

/**
 * GET /api/posts - List posts
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);
  const { page, limit, offset } = getPagination(request);

  // Get user's workspace
  const workspace = await getWorkspaceFromRequest(user.id, request, supabase);

  // Get query parameters for filtering
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');
  const accountId = searchParams.get('account_id');
  const campaignId = searchParams.get('campaign_id');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const unscheduled = searchParams.get('unscheduled') === 'true';

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
  if (unscheduled) {
    query = query.is('scheduled_at', null).in('status', ['draft', 'pending_approval']);
  } else {
    // Standard filtering
    if (status) {
      query = query.eq('status', status);
    }

    // Date range filtering for calendar view:
    // Include posts that should appear in the calendar range based on the same rule the UI uses:
    // displayDate = scheduled_at || published_at || created_at
    //
    // IMPORTANT: Use proper BETWEEN-style filters (gte + lte) grouped with `and(...)`.
    // If we OR individual gte/lte checks, we can match almost every row, then pagination can
    // "starve" the calendar by returning irrelevant recent posts.
    if (from && to) {
      const fromIso = new Date(from).toISOString();
      const toIso = new Date(to).toISOString();

      query = query.or(
        [
          // Scheduled posts shown on scheduled_at
          `and(scheduled_at.gte.${fromIso},scheduled_at.lte.${toIso})`,
          // Published posts shown on published_at
          `and(published_at.gte.${fromIso},published_at.lte.${toIso})`,
          // Unscheduled drafts/pending shown on created_at (only when no scheduled/published date exists)
          `and(created_at.gte.${fromIso},created_at.lte.${toIso},scheduled_at.is.null,published_at.is.null)`,
        ].join(',')
      );
    }
  }

  if (accountId) {
    query = query.eq('social_account_id', accountId);
  }
  if (campaignId) {
    query = query.eq('campaign_id', campaignId);
  }

  // Apply pagination
  // Calendar views can legitimately have >200 items; use a safer cap when from/to is provided.
  const effectiveLimit = from && to ? Math.max(limit, 1000) : limit;
  query = query.range(offset, offset + effectiveLimit - 1);

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
  const normalizedStatus = validatedData.status ?? 'draft';
  const normalizedData: NormalizedPostInput = {
    ...validatedData,
    status: normalizedStatus,
  };

  // Get user's workspace
  const workspace = await getWorkspaceFromRequest(user.id, request, supabase);
  const role = await checkWorkspaceAccess(user.id, workspace.id);

  if (!['owner', 'admin', 'editor'].includes(role)) {
    throw new APIError(403, 'You do not have permission to create posts', 'FORBIDDEN');
  }

  // Approval Workflow Enforcement
  // If workspace requires approval, and user is not an approver (admin/owner),
  // force status to 'pending_approval' for any non-draft status.
  const requireApproval = (workspace as any).settings?.require_approval;
  const isApprover = ['owner', 'admin'].includes(role);

  if (requireApproval && !isApprover && ['published', 'scheduled'].includes(normalizedData.status)) {
    console.log(`[Approval Enforcement] Forcing status to pending_approval for user ${user.id} in workspace ${workspace.id}`);
    normalizedData.status = 'pending_approval';
  }

  // Validate status requirements before proceeding
  validateStatusRequirements(
    normalizedData.status,
    normalizedData.scheduled_at,
    normalizedData.platforms,
    normalizedData.platformAccounts
  );

  const normalizedAccounts = await ensurePlatformAccounts(
    supabase,
    workspace.id,
    normalizedData.platformAccounts,
    normalizedData.status
  );

  // Additional platform account validation for non-draft posts
  if (normalizedData.status !== 'draft') {
    const missing = normalizedData.platforms.filter(
      (platform) => !normalizedAccounts[platform as Platform]
    );

    if (missing.length > 0) {
      throw new APIError(
        400,
        `Select accounts for: ${missing.join(', ')}`,
        'MISSING_PLATFORM_ACCOUNTS'
      );
    }
  }

  await ensureMediaOwnership(supabase, workspace.id, validatedData.mediaIds);

  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      workspace_id: workspace.id,
      content: normalizedData.content,
      platforms: normalizedData.platforms,
      status: normalizedData.status,
      scheduled_at: normalizedData.scheduled_at,
      campaign_id: normalizedData.campaign_id,
      media: normalizedData.media || [],
      tags: normalizedData.tags || [],
      created_by: user.id,
      metadata: {
        accountIds: normalizedAccounts,
        mediaIds: normalizedData.mediaIds || [],
        ai: {
          ...(normalizedData.ai_metadata || {}),
          prompt: normalizedData.ai_prompt,
          generation_id: normalizedData.ai_generation_id,
          generated: normalizedData.ai_generated ?? false,
        },
      },
    })
    .select()
    .single();

  if (error) {
    throw new APIError(500, error.message, 'DATABASE_ERROR');
  }

  // NOTE: Dual-write to content_items/content_variants removed for performance
  // and to maintain single source of truth. The `posts` table is the canonical store.
  // SRS migration can be done as a separate future initiative.

  if (shouldPublishImmediately(normalizedData)) {
    const updatedPost = await publishImmediately({
      supabase,
      post,
      input: normalizedData,
      platformAccounts: normalizedAccounts,
    });

    return successResponse({ post: updatedPost });
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
  const workspace = await getWorkspaceFromRequest(user.id, request, supabase);
  const role = await checkWorkspaceAccess(user.id, workspace.id);

  if (!['owner', 'admin', 'editor'].includes(role)) {
    throw new APIError(403, 'You do not have permission to update posts', 'FORBIDDEN');
  }

  // Fetch current post to validate status transitions
  const { data: currentPost, error: fetchError } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .eq('workspace_id', workspace.id)
    .single();

  if (fetchError || !currentPost) {
    throw new APIError(404, 'Post not found', 'POST_NOT_FOUND');
  }

  // Validate status transition if status is being changed
  if (body.status && body.status !== currentPost.status) {
    // Published posts cannot be modified
    if (currentPost.status === 'published') {
      throw new APIError(
        400,
        'Published posts cannot be modified',
        'INVALID_STATUS_TRANSITION'
      );
    }

    // Validate the transition is allowed
    if (!validateStatusTransition(currentPost.status, body.status)) {
      throw new APIError(
        400,
        `Cannot transition from "${currentPost.status}" to "${body.status}"`,
        'INVALID_STATUS_TRANSITION'
      );
    }

    // Validate requirements for the new status
    const platforms = body.platforms || currentPost.platforms || [];
    const platformAccounts = body.metadata?.accountIds || currentPost.metadata?.accountIds;
    const scheduledAt = body.scheduled_at || currentPost.scheduled_at;

    validateStatusRequirements(body.status, scheduledAt, platforms, platformAccounts);
  }

  // Prevent modification of published_at and external_post_id by non-system calls
  const sanitizedBody = { ...body };
  delete sanitizedBody.published_at;
  delete sanitizedBody.external_post_id;

  // Update post
  const { data: post, error } = await supabase
    .from('posts')
    .update(sanitizedBody)
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
  const workspace = await getWorkspaceFromRequest(user.id, request, supabase);
  const role = await checkWorkspaceAccess(user.id, workspace.id);

  if (!['owner', 'admin', 'editor'].includes(role)) {
    throw new APIError(403, 'You do not have permission to delete posts', 'FORBIDDEN');
  }

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
