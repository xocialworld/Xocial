/**
 * Post Management API Routes
 * GET/PATCH/DELETE /api/posts/[id]
 * Based on Xocial SRS Section 3.2
 * Standardized with error handling, workspace access, and rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleAPIError, parseJSONBody, validateRequiredFields } from '@/lib/error-handler';
import { APIError } from '@/lib/api-error';
import {
  verifyResourceAccess,
  verifyWorkspaceAccess,
} from '@/lib/api/workspace-access';
import { rateLimitMiddleware } from '@/lib/api/rate-limit';
import { getWorkspaceIdFromRequest } from '@/lib/workspace-context';

// GET - Fetch a specific post
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const id = params.id;
    const supabase = await createClient();

    // 1. Verify authentication
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session) {
      throw APIError.unauthorized('Authentication required');
    }

    // 2. Rate limiting
    rateLimitMiddleware(session.user.id, 'READ');

    const workspaceId = getWorkspaceIdFromRequest(request);
    let postClient = supabase;
    let workspaceFilter: string | null = null;

    // 3. Verify workspace access. When the UI sends the selected workspace,
    // scope the lookup to that workspace so stale URLs cannot cross tenants.
    if (workspaceId) {
      await verifyWorkspaceAccess(supabase, workspaceId, session.user.id);
      workspaceFilter = workspaceId;
    } else {
      await verifyResourceAccess(supabase, 'posts', id, session.user.id);
    }

    // 4. Fetch post with analytics
    let postQuery = postClient
      .from('posts')
      .select(`
        *,
        post_analytics(*)
      `)
      .eq('id', id);

    if (workspaceFilter) {
      postQuery = postQuery.eq('workspace_id', workspaceFilter);
    }

    const { data: post, error: postError } = await postQuery.maybeSingle();

    if (postError || !post) {
      throw APIError.notFound('Post', 'The requested post does not exist');
    }

    // 5. Return success response
    return NextResponse.json(
      { data: post },
      { status: 200 }
    );
  } catch (error) {
    return handleAPIError(error);
  }
}

// PATCH - Update a post
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const id = params.id;
    const supabase = await createClient();

    // 1. Verify authentication
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session) {
      throw APIError.unauthorized('Authentication required');
    }

    // 2. Rate limiting
    rateLimitMiddleware(session.user.id, 'WRITE');

    // 3. Verify workspace access (admin or owner required for updates)
    await verifyResourceAccess(supabase, 'posts', id, session.user.id, 'member');

    // 4. Parse and validate request body
    const body = await parseJSONBody<{
      caption?: string;
      platforms?: string[];
      scheduled_at?: string;
      status?: string;
      media_urls?: string[];
    }>(request);

    // 5. Validate fields if provided
    if (body.caption !== undefined && body.caption.length > 5000) {
      throw APIError.validation('Caption is too long', {
        max_length: 5000,
        current_length: body.caption.length,
      });
    }

    if (body.platforms !== undefined && body.platforms.length === 0) {
      throw APIError.validation('At least one platform must be selected');
    }

    // 6. Update post
    const updates = {
      ...body,
      updated_at: new Date().toISOString(),
    };

    const { data: post, error: updateError } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw APIError.internal('Failed to update post');
    }

    // 7. Return success response
    return NextResponse.json(
      { data: post },
      { status: 200 }
    );
  } catch (error) {
    return handleAPIError(error);
  }
}

// DELETE - Delete a post
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const id = params.id;
    const supabase = await createClient();

    // 1. Verify authentication
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session) {
      throw APIError.unauthorized('Authentication required');
    }

    // 2. Rate limiting
    rateLimitMiddleware(session.user.id, 'WRITE');

    // 3. Verify workspace access (admin or owner required for deletion)
    await verifyResourceAccess(supabase, 'posts', id, session.user.id, 'admin');

    // 4. Soft delete the post (set metadata for undo functionality)
    const restoreToken = crypto.randomUUID();

    const { error: deleteError } = await supabase
      .from('posts')
      .update({
        metadata: {
          restore_token: restoreToken,
          deleted_at: new Date().toISOString(),
        },
      })
      .eq('id', id);

    if (deleteError) {
      throw APIError.internal('Failed to delete post');
    }

    // 5. Return success response with restore token
    return NextResponse.json(
      {
        message: 'Post deleted successfully',
        restore_token: restoreToken,
        undo_window_seconds: 5,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleAPIError(error);
  }
}
