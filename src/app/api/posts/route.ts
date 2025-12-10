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

  // Date range filtering for calendar view
  if (from) {
    query = query.or(`scheduled_at.gte.${from},published_at.gte.${from},created_at.gte.${from}`);
  }
  if (to) {
    query = query.or(`scheduled_at.lte.${to},published_at.lte.${to},created_at.lte.${to}`);
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

  const normalizedAccounts = await ensurePlatformAccounts(
    supabase,
    workspace.id,
    normalizedData.platformAccounts,
    normalizedStatus
  );

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

  // SRS Optimization: Dual Write to content_items and content_variants
  // This ensures we are populating the new schema structure defined in the Blueprint
  try {
    // 1. Create content_item
    const { data: contentItem, error: itemError } = await supabase
      .from('content_items')
      .insert({
        workspace_id: workspace.id,
        title: normalizedData.ai_prompt?.slice(0, 50) || 'Untitled Post',
        brief: normalizedData.ai_prompt,
        status: normalizedData.status === 'pending_approval' ? 'in_review' : normalizedData.status,
        scheduled_at: normalizedData.scheduled_at,
        created_by: user.id,
      })
      .select()
      .single();

    if (itemError) {
      console.warn('[SRS Sync] Failed to create content_item:', itemError);
    } else if (contentItem) {
      // 2. Create content_variants for each platform
      const variants = normalizedData.platforms.map(platform => {
        const platformContent = normalizedData.content[platform] || normalizedData.content.default;
        return {
          content_item_id: contentItem.id,
          social_account_id: normalizedAccounts[platform], // Might be undefined for draft
          platform: platform,
          caption: platformContent?.text || '',
          media_ids: normalizedData.mediaIds || [],
          status: normalizedData.status === 'published' ? 'published' :
            normalizedData.status === 'scheduled' ? 'scheduled' : 'draft',
          scheduled_at: normalizedData.scheduled_at,
          published_at: normalizedData.status === 'published' ? new Date().toISOString() : null,
        };
      });

      const { error: variantError } = await supabase
        .from('content_variants')
        .insert(variants);

      if (variantError) {
        console.warn('[SRS Sync] Failed to create content_variants:', variantError);
      }
    }
  } catch (srsError) {
    // Non-blocking error - tables might not exist yet if migration wasn't run
    console.warn('[SRS Sync] SRS tables not ready or sync failed:', srsError);
  }

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
