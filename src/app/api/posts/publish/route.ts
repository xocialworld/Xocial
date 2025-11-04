import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleAPIError, APIError } from '@/lib/api-middleware';
import { platformPublisher } from '@/lib/platforms/publisher';
import type { Platform } from '@/lib/platforms/publisher';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new APIError(401, 'Unauthorized');
    }

    const body = await request.json();
    const { postId } = body;

    if (!postId) {
      throw new APIError(400, 'Post ID is required');
    }

    // Get post details
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('*, workspace_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      throw new APIError(404, 'Post not found');
    }

    // Verify user has access to this workspace
    const { data: member } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('workspace_id', post.workspace_id)
      .eq('user_id', user.id)
      .single();

    if (!member) {
      throw new APIError(403, 'Access denied');
    }

    // Get social accounts for the workspace
    const { data: accounts, error: accountsError } = await supabase
      .from('social_accounts')
      .select('id, platform')
      .eq('workspace_id', post.workspace_id)
      .in('platform', post.platforms || []);

    if (accountsError || !accounts || accounts.length === 0) {
      throw new APIError(400, 'No connected accounts found for selected platforms');
    }

    // Build account ID map
    const accountIds: Record<Platform, string> = {};
    accounts.forEach((account: any) => {
      accountIds[account.platform as Platform] = account.id;
    });

    // Prepare content for publishing
    const content = {
      text: post.content?.text || '',
      mediaUrls: post.content?.media_urls || [],
      link: post.content?.link,
    };

    // Publish to all platforms
    const results = await platformPublisher.publishToAll({
      platforms: post.platforms || [],
      content,
      accountIds,
      scheduledFor: post.scheduled_for ? new Date(post.scheduled_for) : undefined,
    });

    // Store platform post IDs
    const platformPostInserts = results
      .filter((r) => r.success)
      .map((r) => ({
        post_id: postId,
        platform: r.platform,
        platform_post_id: r.platformPostId!,
        permalink: r.permalink,
        published_at: new Date().toISOString(),
        status: 'published',
      }));

    if (platformPostInserts.length > 0) {
      await supabase.from('platform_posts').insert(platformPostInserts);
    }

    // Update post status
    const allSuccessful = results.every((r) => r.success);
    const anySuccessful = results.some((r) => r.success);

    await supabase
      .from('posts')
      .update({
        status: allSuccessful ? 'published' : anySuccessful ? 'partial' : 'failed',
        published_at: anySuccessful ? new Date().toISOString() : null,
      })
      .eq('id', postId);

    return NextResponse.json({
      success: true,
      results,
      message: allSuccessful
        ? 'Published to all platforms successfully'
        : anySuccessful
        ? 'Published to some platforms'
        : 'Failed to publish to any platform',
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

