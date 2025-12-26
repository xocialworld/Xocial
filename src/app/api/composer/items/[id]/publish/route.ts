/**
 * Content Item Publish API
 * POST /api/composer/items/[id]/publish
 *
 * Publish a content item's variants to their respective platforms
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { platformPublisher, type Platform, type PublishResult } from '@/lib/platforms/publisher';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch content item with variants
    const { data: item, error: fetchError } = await supabase
      .from('content_items')
      .select(
        `
        *,
        variants:content_variants (
          id,
          platform,
          social_account_id,
          caption,
          media_ids,
          hashtags,
          mentions,
          link_url,
          platform_specific,
          status,
          scheduled_at
        ),
        approval_instance:content_approval_instances (status)
      `
      )
      .eq('id', params.id)
      .single();

    if (fetchError || !item) {
      return NextResponse.json({ error: 'Content item not found' }, { status: 404 });
    }

    // Verify membership
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', item.workspace_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 });
    }

    // Check if approval is required and approved
    const approvalInstance = item.approval_instance?.[0];
    if (approvalInstance && approvalInstance.status !== 'approved') {
      return NextResponse.json(
        { error: 'Content must be approved before publishing' },
        { status: 400 }
      );
    }

    // Check if there are variants to publish
    const variants = item.variants || [];
    if (variants.length === 0) {
      return NextResponse.json(
        { error: 'Content must have at least one variant to publish' },
        { status: 400 }
      );
    }

    // Filter variants that are ready to publish (scheduled or ready status)
    const publishableVariants = variants.filter(
      (v: any) => ['scheduled', 'ready', 'draft'].includes(v.status) && v.social_account_id
    );

    if (publishableVariants.length === 0) {
      return NextResponse.json(
        { error: 'No variants are ready to publish (missing social account or already published)' },
        { status: 400 }
      );
    }

    // Build account IDs map
    const accountIds: Partial<Record<Platform, string>> = {};
    for (const variant of publishableVariants) {
      accountIds[variant.platform as Platform] = variant.social_account_id;
    }

    // Build platform content map
    const platformContent: Partial<Record<Platform, { text: string; mediaUrls?: string[] }>> = {};
    for (const variant of publishableVariants) {
      // Fetch media URLs if media_ids are present
      let mediaUrls: string[] = [];
      if (variant.media_ids && variant.media_ids.length > 0) {
        const { data: mediaAssets } = await supabase
          .from('media_assets')
          .select('url, storage_path')
          .in('id', variant.media_ids);

        if (mediaAssets) {
          mediaUrls = mediaAssets.map((m: any) => m.url || m.storage_path).filter(Boolean);
        }
      }

      platformContent[variant.platform as Platform] = {
        text: variant.caption || '',
        mediaUrls,
      };
    }

    // Get unique platforms
    const platforms = [...new Set(publishableVariants.map((v: any) => v.platform))] as Platform[];

    // Publish to all platforms
    const results = await platformPublisher.publishToAll({
      platforms,
      content: platformContent[platforms[0]] || { text: '' },
      platformContent,
      accountIds,
    });

    // Process results and update variants
    const publishedAt = new Date().toISOString();
    const variantResults: Array<{
      variantId: string;
      platform: string;
      success: boolean;
      error?: string;
      platformPostId?: string;
      permalink?: string;
    }> = [];

    for (const result of results) {
      // Find the variant for this platform
      const variant = publishableVariants.find((v: any) => v.platform === result.platform);
      if (!variant) continue;

      const variantUpdate: any = {
        status: result.success ? 'published' : 'failed',
      };

      if (result.success) {
        variantUpdate.published_at = publishedAt;
      }

      // Update variant status
      await supabase.from('content_variants').update(variantUpdate).eq('id', variant.id);

      // Record in platform_posts if successful
      if (result.success && result.platformPostId) {
        await supabase.from('platform_posts').upsert(
          {
            content_item_id: params.id,
            content_variant_id: variant.id,
            platform: result.platform,
            platform_post_id: result.platformPostId,
            permalink: result.permalink,
            status: 'published',
            published_at: publishedAt,
          },
          {
            onConflict: 'content_variant_id,platform',
            ignoreDuplicates: false,
          }
        );
      }

      variantResults.push({
        variantId: variant.id,
        platform: result.platform,
        success: result.success,
        error: result.error,
        platformPostId: result.platformPostId,
        permalink: result.permalink,
      });
    }

    // Determine overall item status
    const allSuccessful = results.every((r) => r.success);
    const anySuccessful = results.some((r) => r.success);

    // Update content item status
    const itemStatus = allSuccessful ? 'published' : anySuccessful ? 'published' : 'rejected';

    await supabase
      .from('content_items')
      .update({
        status: itemStatus,
        ...(anySuccessful ? { published_at: publishedAt } : {}),
      })
      .eq('id', params.id);

    // Fetch updated item
    const { data: updatedItem } = await supabase
      .from('content_items')
      .select(
        `
        *,
        variants:content_variants (*)
      `
      )
      .eq('id', params.id)
      .single();

    return NextResponse.json({
      item: updatedItem,
      results: variantResults,
      success: anySuccessful,
      message: allSuccessful
        ? 'Published to all platforms successfully'
        : anySuccessful
        ? 'Published to some platforms'
        : 'Failed to publish to any platform',
    });
  } catch (error) {
    console.error('Publish content error:', error);
    return NextResponse.json({ error: 'Failed to publish content' }, { status: 500 });
  }
}

