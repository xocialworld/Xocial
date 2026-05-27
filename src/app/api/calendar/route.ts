/**
 * Calendar API Route
 *
 * Returns unified calendar entries primarily from the posts table.
 * Also attempts to merge data from:
 * - content_items + content_variants (if table exists)
 * - external_posts (if table exists)
 *
 * Date bucketing:
 * - drafts -> created_at
 * - scheduled -> scheduled_at
 * - published -> published_at
 */

import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  successResponse,
  APIError,
} from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';

export const dynamic = 'force-dynamic';

/**
 * Calendar entry source type
 */
type CalendarEntrySource = 'internal' | 'external' | 'legacy';

/**
 * Unified calendar entry shape
 */
interface CalendarEntry {
  id: string;
  source: CalendarEntrySource;
  calendarDate: string;
  title?: string;
  brief?: string;
  caption?: string;
  content?: Record<string, unknown>;
  media?: unknown[];
  status: string;
  platforms: string[];
  draftedAt?: string;
  scheduledAt?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt?: string;
  workspaceId: string;
  socialAccountId?: string;
  externalPostId?: string;
  permalink?: string;
  contentItemId?: string;
  variants?: ContentVariantEntry[];
  approvalWorkflowId?: string;
  approvalStatus?: string;
  metrics?: Record<string, unknown>;
  postType?: string;
}

interface ContentVariantEntry {
  id: string;
  platform: string;
  socialAccountId?: string;
  caption?: string;
  status: string;
  scheduledAt?: string;
  publishedAt?: string;
}

/**
 * Safely check if a table exists by attempting a limited query
 */
async function tableExists(supabase: any, tableName: string): Promise<boolean> {
  try {
    const { error } = await supabase.from(tableName).select('id').limit(0);
    return !error || !error.message?.includes('does not exist');
  } catch {
    return false;
  }
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { userClient: supabase, workspace } = await requireWorkspaceContext(request);

  const { searchParams } = new URL(request.url);
  const workspaceId = workspace.id;
  const from = searchParams.get('from') || searchParams.get('start');
  const to = searchParams.get('to') || searchParams.get('end');
  const platformFilter = searchParams.get('platform');

  console.log('[Calendar API] Request:', { workspaceId, from, to, platformFilter });

  const entries: CalendarEntry[] = [];
  const seenIds = new Set<string>(); // Track seen post IDs to avoid duplicates

  // ─────────────────────────────────────────────────────────────────────────────
  // Primary Source: Legacy posts table (always exists)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[Calendar API] Fetching from posts table...');
  
  let postsQuery = supabase
    .from('posts')
    .select('*')
    .eq('workspace_id', workspaceId);

  // Apply date range filtering
  if (from && to) {
    postsQuery = postsQuery.or(
      [
        `and(scheduled_at.gte.${from},scheduled_at.lte.${to})`,
        `and(published_at.gte.${from},published_at.lte.${to})`,
        `and(created_at.gte.${from},created_at.lte.${to},scheduled_at.is.null,published_at.is.null)`,
      ].join(',')
    );
  }

  // Platform filter
  if (platformFilter) {
    postsQuery = postsQuery.contains('platforms', [platformFilter]);
  }

  // Order by relevant date descending
  postsQuery = postsQuery.order('created_at', { ascending: false }).limit(1000);

  const { data: posts, error: postsError } = await postsQuery;

  if (postsError) {
    console.error('[Calendar API] Error fetching posts:', postsError);
    throw new APIError(500, 'Failed to fetch posts', 'DATABASE_ERROR');
  }

  console.log('[Calendar API] Found', posts?.length || 0, 'posts');

  // Transform posts into CalendarEntry[]
  for (const post of posts || []) {
    // Determine calendar date based on status
    let calendarDate: string;
    if (post.status === 'published' || post.status === 'partial') {
      calendarDate = post.published_at || post.scheduled_at || post.created_at;
    } else if (post.status === 'scheduled' || post.scheduled_at) {
      calendarDate = post.scheduled_at || post.created_at;
    } else {
      calendarDate = post.created_at;
    }

    // Check if date is within range (double-check)
    if (from && to) {
      const entryDate = new Date(calendarDate);
      const fromDate = new Date(from);
      const toDate = new Date(to);
      if (entryDate < fromDate || entryDate > toDate) {
        continue;
      }
    }

    const platforms = Array.isArray(post.platforms) ? post.platforms : [];
    const content = post.content as Record<string, unknown> || {};
    const firstPlatformContent = platforms[0] && typeof content[platforms[0]] === 'object'
      ? content[platforms[0]] as Record<string, unknown>
      : content;

    entries.push({
      id: post.id,
      source: post.external_post_id ? 'external' : 'legacy',
      calendarDate,
      caption: (firstPlatformContent?.text || firstPlatformContent?.caption || content?.text) as string | undefined,
      content,
      media: post.media as unknown[] || [],
      status: post.status,
      platforms,
      scheduledAt: post.scheduled_at,
      publishedAt: post.published_at,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      workspaceId: post.workspace_id,
      socialAccountId: post.social_account_id,
      externalPostId: post.external_post_id,
      metrics: post.metrics as Record<string, unknown> || {},
    });

    seenIds.add(post.id);
    if (post.external_post_id) {
      seenIds.add(post.external_post_id);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Optional: content_items table (if migrations have been applied)
  // ─────────────────────────────────────────────────────────────────────────────
  const hasContentItems = await tableExists(supabase, 'content_items');
  
  if (hasContentItems) {
    console.log('[Calendar API] Checking content_items table...');
    
    let contentItemsQuery = supabase
      .from('content_items')
      .select(`
        id,
        workspace_id,
        title,
        brief,
        status,
        drafted_at,
        scheduled_at,
        approval_workflow_id,
        created_by,
        created_at,
        updated_at,
        content_variants (
          id,
          platform,
          social_account_id,
          caption,
          status,
          scheduled_at,
          published_at
        )
      `)
      .eq('workspace_id', workspaceId);

    if (from && to) {
      contentItemsQuery = contentItemsQuery.or(
        `drafted_at.gte.${from},drafted_at.lte.${to},` +
        `scheduled_at.gte.${from},scheduled_at.lte.${to}`
      );
    }

    const { data: contentItems, error: contentItemsError } = await contentItemsQuery;

    if (!contentItemsError && contentItems) {
      console.log('[Calendar API] Found', contentItems.length, 'content_items');
      
      for (const item of contentItems) {
        if (seenIds.has(item.id)) continue; // Skip if already have this ID
        
        const variants = (item.content_variants || []) as any[];
        
        let calendarDate: string;
        if (item.status === 'published') {
          const publishedVariant = variants.find((v: any) => v.published_at);
          calendarDate = publishedVariant?.published_at || item.scheduled_at || item.drafted_at || item.created_at;
        } else if (item.status === 'scheduled' || item.status === 'approved') {
          calendarDate = item.scheduled_at || item.drafted_at || item.created_at;
        } else {
          calendarDate = item.drafted_at || item.created_at;
        }

        const platforms = [...new Set(variants.map((v: any) => v.platform))];
        if (platformFilter && !platforms.includes(platformFilter)) {
          continue;
        }

        if (from && to) {
          const entryDate = new Date(calendarDate);
          const fromDate = new Date(from);
          const toDate = new Date(to);
          if (entryDate < fromDate || entryDate > toDate) {
            continue;
          }
        }

        entries.push({
          id: item.id,
          source: 'internal',
          calendarDate,
          title: item.title,
          brief: item.brief,
          status: item.status,
          platforms,
          draftedAt: item.drafted_at,
          scheduledAt: item.scheduled_at,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          workspaceId: item.workspace_id,
          contentItemId: item.id,
          variants: variants.map((v: any) => ({
            id: v.id,
            platform: v.platform,
            socialAccountId: v.social_account_id,
            caption: v.caption,
            status: v.status,
            scheduledAt: v.scheduled_at,
            publishedAt: v.published_at,
          })),
          approvalWorkflowId: item.approval_workflow_id,
        });

        seenIds.add(item.id);
      }
    } else if (contentItemsError) {
      console.log('[Calendar API] content_items query error (non-fatal):', contentItemsError.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Optional: external_posts table (if migrations have been applied)
  // ─────────────────────────────────────────────────────────────────────────────
  const hasExternalPosts = await tableExists(supabase, 'external_posts');
  
  if (hasExternalPosts) {
    console.log('[Calendar API] Checking external_posts table...');
    
    let externalPostsQuery = supabase
      .from('external_posts')
      .select(`
        id,
        workspace_id,
        social_account_id,
        platform,
        external_post_id,
        permalink,
        content,
        media,
        post_type,
        published_at,
        metrics,
        created_at,
        updated_at
      `)
      .eq('workspace_id', workspaceId);

    if (from) {
      externalPostsQuery = externalPostsQuery.gte('published_at', from);
    }
    if (to) {
      externalPostsQuery = externalPostsQuery.lte('published_at', to);
    }
    if (platformFilter) {
      externalPostsQuery = externalPostsQuery.eq('platform', platformFilter);
    }

    const { data: externalPosts, error: externalPostsError } = await externalPostsQuery;

    if (!externalPostsError && externalPosts) {
      console.log('[Calendar API] Found', externalPosts.length, 'external_posts');
      
      for (const post of externalPosts) {
        // Skip if we already have this external post ID
        if (seenIds.has(post.id) || seenIds.has(post.external_post_id)) {
          continue;
        }

        const content = post.content as Record<string, unknown> || {};

        entries.push({
          id: post.id,
          source: 'external',
          calendarDate: post.published_at || post.created_at,
          caption: (content.caption || content.text || content.title) as string | undefined,
          content,
          media: post.media as unknown[] || [],
          status: 'published',
          platforms: [post.platform],
          publishedAt: post.published_at,
          createdAt: post.created_at,
          updatedAt: post.updated_at,
          workspaceId: post.workspace_id,
          socialAccountId: post.social_account_id,
          externalPostId: post.external_post_id,
          permalink: post.permalink,
          metrics: post.metrics as Record<string, unknown> || {},
          postType: post.post_type,
        });

        seenIds.add(post.id);
        seenIds.add(post.external_post_id);
      }
    } else if (externalPostsError) {
      console.log('[Calendar API] external_posts query error (non-fatal):', externalPostsError.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Sort entries by calendarDate (ascending) then by status priority
  // ─────────────────────────────────────────────────────────────────────────────
  const statusPriority: Record<string, number> = {
    scheduled: 1,
    approved: 2,
    in_review: 3,
    pending_approval: 3,
    draft: 4,
    published: 5,
    partial: 6,
    rejected: 7,
    failed: 8,
  };

  entries.sort((a, b) => {
    const dateA = new Date(a.calendarDate).getTime();
    const dateB = new Date(b.calendarDate).getTime();
    if (dateA !== dateB) {
      return dateA - dateB;
    }
    const priorityA = statusPriority[a.status] ?? 10;
    const priorityB = statusPriority[b.status] ?? 10;
    return priorityA - priorityB;
  });

  console.log('[Calendar API] Returning', entries.length, 'total entries');

  return successResponse({
    entries,
    count: entries.length,
    meta: {
      workspaceId,
      from,
      to,
      platformFilter,
    },
  });
});
