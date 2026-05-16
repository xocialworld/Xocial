/**
 * Single Content Item API
 * GET, PATCH, DELETE /api/composer/items/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    APIError,
    createServiceRoleClient,
    handleAPIError,
    requireAuth,
} from '@/lib/api-middleware';
import {
    assertContentMutable,
    assertMediaInWorkspace,
    assertSocialAccountsInWorkspace,
    requireWorkspaceContext,
} from '@/lib/workspace-context';

// GET - Fetch a single content item
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        await requireAuth(request);
        const serviceClient = createServiceRoleClient();
        const { data: existing } = await serviceClient
            .from('content_items')
            .select('workspace_id, is_internal_only')
            .eq('id', params.id)
            .maybeSingle();

        if (!existing) {
            return NextResponse.json(
                { error: 'Content item not found' },
                { status: 404 }
            );
        }

        const { userClient: supabase, role } = await requireWorkspaceContext(request, {
            workspaceId: existing.workspace_id,
            roles: ['owner', 'admin', 'manager', 'creator', 'analyst', 'client'],
        });

        if (role === 'client' && existing.is_internal_only) {
            return NextResponse.json(
                { error: 'Content item not found' },
                { status: 404 }
            );
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
        return handleAPIError(error);
    }
}

// PATCH - Update a content item
export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const body = await request.json();
        const {
            title,
            brief,
            status,
            scheduled_at,
            variants,
        } = body;

        // Fetch existing item
        await requireAuth(request);
        const serviceClient = createServiceRoleClient();
        const { data: existingItem, error: fetchError } = await serviceClient
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

        const { user, userClient: supabase, workspace, role } = await requireWorkspaceContext(request, {
            workspaceId: existingItem.workspace_id,
            roles: ['owner', 'admin', 'manager', 'creator'],
        });

        assertContentMutable(existingItem.status, role);

        const variantList = Array.isArray(variants) ? variants : [];
        await assertSocialAccountsInWorkspace(
            supabase,
            workspace.id,
            variantList.map((variant: any) => variant.social_account_id)
        );
        await assertMediaInWorkspace(
            supabase,
            workspace.id,
            variantList.flatMap((variant: any) => variant.media_ids || [])
        );

        // Build update object
        const updateData: any = {};
        if (title !== undefined) updateData.title = title;
        if (brief !== undefined) updateData.brief = brief;
        if (status !== undefined) updateData.status = status;
        if (scheduled_at !== undefined) updateData.scheduled_at = scheduled_at;
        if (body.drafted_at !== undefined) updateData.drafted_at = body.drafted_at;
        if (body.approval_workflow_id !== undefined) updateData.approval_workflow_id = body.approval_workflow_id;
        if (body.is_internal_only !== undefined) updateData.is_internal_only = body.is_internal_only;
        if (status === 'approved') {
            updateData.approved_at = new Date().toISOString();
            updateData.approved_by = user.id;
            updateData.locked_at = new Date().toISOString();
            updateData.locked_by = user.id;
        }
        if (status === 'scheduled') {
            updateData.locked_at = updateData.locked_at || new Date().toISOString();
            updateData.locked_by = updateData.locked_by || user.id;
        }

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
            for (const variant of variantList) {
                if (variant.id) {
                    // Update existing variant
                    const { id, ...variantData } = variant;
                    const { data: ownedVariant } = await supabase
                        .from('content_variants')
                        .select('id')
                        .eq('id', id)
                        .eq('content_item_id', params.id)
                        .maybeSingle();

                    if (!ownedVariant) {
                        throw new APIError(
                            400,
                            'Variant does not belong to this content item',
                            'INVALID_WORKSPACE_RESOURCE'
                        );
                    }

                    await supabase
                        .from('content_variants')
                        .update(variantData)
                        .eq('id', id)
                        .eq('content_item_id', params.id);
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
        return handleAPIError(error);
    }
}

// DELETE - Delete a content item
export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        // Fetch existing item
        await requireAuth(request);
        const serviceClient = createServiceRoleClient();
        const { data: existingItem, error: fetchError } = await serviceClient
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

        const { userClient: supabase } = await requireWorkspaceContext(request, {
            workspaceId: existingItem.workspace_id,
            roles: ['owner', 'admin', 'manager'],
        });

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
        return handleAPIError(error);
    }
}
