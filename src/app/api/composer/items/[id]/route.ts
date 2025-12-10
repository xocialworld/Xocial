/**
 * Single Content Item API
 * GET, PATCH, DELETE /api/composer/items/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Fetch a single content item
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: item, error } = await supabase
            .from('content_items')
            .select(`
        *,
        created_by_user:profiles!created_by (
          id,
          full_name,
          avatar_url
        ),
        variants:content_variants (
          id,
          platform,
          caption,
          media_ids,
          hashtags,
          mentions,
          link_url,
          platform_specific,
          status,
          scheduled_at,
          published_at,
          social_account:social_accounts (
            id,
            platform_username,
            platform,
            avatar_url
          )
        ),
        comments:content_comments (
          id,
          body,
          visibility,
          created_at,
          author:profiles!author_id (
            id,
            full_name,
            avatar_url
          )
        ),
        approval_instance:content_approval_instances (
          id,
          status,
          current_step_id,
          workflow:approval_workflows (
            id,
            name,
            type
          ),
          actions:content_approval_actions (
            id,
            action,
            comment,
            created_at,
            actor:profiles!actor_id (
              id,
              full_name
            )
          )
        )
      `)
            .eq('id', params.id)
            .single();

        if (error || !item) {
            return NextResponse.json(
                { error: 'Content item not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ item });

    } catch (error) {
        console.error('Content item GET error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch content item' },
            { status: 500 }
        );
    }
}

// PATCH - Update a content item
export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            title,
            brief,
            status,
            scheduled_at,
            variants,
        } = body;

        // Fetch existing item
        const { data: existingItem, error: fetchError } = await supabase
            .from('content_items')
            .select('workspace_id, status')
            .eq('id', params.id)
            .single();

        if (fetchError || !existingItem) {
            return NextResponse.json(
                { error: 'Content item not found' },
                { status: 404 }
            );
        }

        // Verify membership
        const { data: membership } = await supabase
            .from('workspace_members')
            .select('role')
            .eq('workspace_id', existingItem.workspace_id)
            .eq('user_id', user.id)
            .single();

        if (!membership) {
            return NextResponse.json(
                { error: 'Not a member of this workspace' },
                { status: 403 }
            );
        }

        // Build update object
        const updateData: any = {};
        if (title !== undefined) updateData.title = title;
        if (brief !== undefined) updateData.brief = brief;
        if (status !== undefined) updateData.status = status;
        if (scheduled_at !== undefined) updateData.scheduled_at = scheduled_at;

        // Update content item
        if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await supabase
                .from('content_items')
                .update(updateData)
                .eq('id', params.id);

            if (updateError) {
                console.error('Update content item error:', updateError);
                return NextResponse.json(
                    { error: 'Failed to update content item' },
                    { status: 500 }
                );
            }
        }

        // Update variants if provided
        if (variants !== undefined) {
            for (const variant of variants) {
                if (variant.id) {
                    // Update existing variant
                    const { id, ...variantData } = variant;
                    await supabase
                        .from('content_variants')
                        .update(variantData)
                        .eq('id', id);
                } else {
                    // Create new variant
                    await supabase.from('content_variants').insert({
                        content_item_id: params.id,
                        ...variant,
                    });
                }
            }
        }

        // Fetch updated item
        const { data: updatedItem } = await supabase
            .from('content_items')
            .select(`
        *,
        variants:content_variants (*)
      `)
            .eq('id', params.id)
            .single();

        return NextResponse.json({
            item: updatedItem,
            success: true,
        });

    } catch (error) {
        console.error('Content item PATCH error:', error);
        return NextResponse.json(
            { error: 'Failed to update content item' },
            { status: 500 }
        );
    }
}

// DELETE - Delete a content item
export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch existing item
        const { data: existingItem, error: fetchError } = await supabase
            .from('content_items')
            .select('workspace_id, status')
            .eq('id', params.id)
            .single();

        if (fetchError || !existingItem) {
            return NextResponse.json(
                { error: 'Content item not found' },
                { status: 404 }
            );
        }

        // Verify admin/owner role
        const { data: membership } = await supabase
            .from('workspace_members')
            .select('role')
            .eq('workspace_id', existingItem.workspace_id)
            .eq('user_id', user.id)
            .single();

        if (!membership || !['owner', 'admin', 'manager'].includes(membership.role)) {
            return NextResponse.json(
                { error: 'Insufficient permissions to delete content' },
                { status: 403 }
            );
        }

        // Cannot delete published content
        if (existingItem.status === 'published') {
            return NextResponse.json(
                { error: 'Cannot delete published content' },
                { status: 400 }
            );
        }

        // Delete (will cascade to variants, comments, approvals)
        const { error: deleteError } = await supabase
            .from('content_items')
            .delete()
            .eq('id', params.id);

        if (deleteError) {
            console.error('Delete content item error:', deleteError);
            return NextResponse.json(
                { error: 'Failed to delete content item' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Content item deleted successfully',
        });

    } catch (error) {
        console.error('Content item DELETE error:', error);
        return NextResponse.json(
            { error: 'Failed to delete content item' },
            { status: 500 }
        );
    }
}
