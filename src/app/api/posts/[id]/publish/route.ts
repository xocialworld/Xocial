import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleAPIError, APIError } from '@/lib/api-middleware';
import { platformPublisher } from '@/lib/platforms/publisher';
import type { Platform, PublishResult } from '@/lib/platforms/publisher';
import {
  recordPlatformPosts,
  createInitialAnalytics,
  extractExternalIds,
  extractMediaUrls,
  buildPlatformContentPayload,
  inferMediaTypeFromMedia,
} from '@/lib/platforms/publish-utils';
import {
  normalizeMetadata,
  normalizePlatforms,
  resolveAccountIds,
} from '@/lib/platforms/post-publish-helpers';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new APIError(401, 'Unauthorized');
    }

    const { id: postId } = await params;

    // Get post details
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('*, workspace_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      throw new APIError(404, 'Post not found');
    }

    // Verify user has access
    const { data: member } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('workspace_id', post.workspace_id)
      .eq('user_id', user.id)
      .single();

    if (!member) {
      throw new APIError(403, 'Access denied');
    }

    const platforms = normalizePlatforms(post.platforms);
    if (platforms.length === 0) {
      throw new APIError(400, 'Post does not target any supported platforms');
    }

    const metadata = normalizeMetadata(post.metadata);
    const accountIds = await resolveAccountIds(supabase, post.workspace_id, platforms, metadata);

    const mediaUrls = extractMediaUrls(post.media);
    const mediaType = inferMediaTypeFromMedia(post.media);

    const { fallback, perPlatform } = buildPlatformContentPayload(
      post.content,
      platforms,
      mediaUrls,
      mediaType
    );

    // Idempotency: find already published platform posts
    const { data: existingPosts } = await supabase
      .from('platform_posts')
      .select('platform, platform_post_id, permalink, status')
      .eq('post_id', postId)
      .in('platform', post.platforms || []);

    const alreadyPublished = new Set<string>(
      (existingPosts || [])
        .filter((p: any) => p.status === 'published' && p.platform_post_id)
        .map((p: any) => p.platform)
    );

    const pendingPlatforms = platforms.filter((platform) => !alreadyPublished.has(platform));

    const results =
      pendingPlatforms.length > 0
        ? await platformPublisher.publishToAll({
            platforms: pendingPlatforms,
            content: fallback,
            platformContent: perPlatform,
            accountIds,
          })
        : [];

    // Add successes for already published to final results
    const carriedSuccesses: PublishResult[] =
      ((existingPosts || [])
        .filter((p: any) => alreadyPublished.has(p.platform))
        .map((p: any) => ({
          platform: p.platform as Platform,
          success: true,
          platformPostId: p.platform_post_id as string | undefined,
          permalink: p.permalink as string | undefined,
        })) as PublishResult[]) || [];

    const allResults = [...results, ...carriedSuccesses];

    if (results.length > 0) {
      const publishedAt = new Date().toISOString();
      await recordPlatformPosts({
        supabase,
        postId,
        publishResults: results,
        publishedAt,
      });
      await createInitialAnalytics({
        supabase,
        postId,
        publishResults: results,
      });
    }

    const allSuccessful = allResults.length > 0 && allResults.every((r) => r.success);
    const anySuccessful = allResults.some((r) => r.success);
    const firstError = allResults.find((r) => !r.success)?.error || null;

    const updates: Record<string, any> = {
      status: allSuccessful ? 'published' : anySuccessful ? 'partial' : 'failed',
      error_message: firstError,
      metadata: {
        ...metadata,
        accountIds,
        publishResults: allResults,
      },
    };

    if (anySuccessful) {
      updates.published_at = new Date().toISOString();
      updates.external_post_id = JSON.stringify(extractExternalIds(allResults));
    } else {
      updates.published_at = null;
    }

    await supabase.from('posts').update(updates).eq('id', postId);

    if (!anySuccessful) {
      return NextResponse.json(
        {
          success: false,
          results: allResults,
          message: 'Failed to publish to any platform',
          error: firstError,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: allSuccessful,
      partial: !allSuccessful,
      results: allResults,
      message: allSuccessful
        ? 'Published to all platforms successfully'
        : 'Published to some platforms with errors',
      error: firstError,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}
