import { NextRequest, NextResponse } from 'next/server';
import { handleAPIError, APIError } from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userClient: supabase, workspace } = await requireWorkspaceContext(request);

    const { data: template, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspace.id)
      .single();

    if (error || !template) {
      throw new APIError(404, 'Template not found');
    }

    return NextResponse.json({ data: template });
  } catch (error) {
    return handleAPIError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, userClient: supabase, workspace } = await requireWorkspaceContext(request);

    // Verify ownership
    const { data: template, error: fetchError } = await supabase
      .from('templates')
      .select('created_by')
      .eq('id', id)
      .eq('workspace_id', workspace.id)
      .single();

    if (fetchError || !template) {
      throw new APIError(404, 'Template not found');
    }

    if (template.created_by !== user.id) {
      throw new APIError(403, 'You can only delete your own templates');
    }

    // Delete template
    const { error: deleteError } = await supabase
      .from('templates')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspace.id);

    if (deleteError) {
      throw new APIError(500, 'Failed to delete template');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, userClient: supabase, workspace } = await requireWorkspaceContext(request);

    // Verify ownership
    const { data: template, error: fetchError } = await supabase
      .from('templates')
      .select('created_by')
      .eq('id', id)
      .eq('workspace_id', workspace.id)
      .single();

    if (fetchError || !template) {
      throw new APIError(404, 'Template not found');
    }

    if (template.created_by !== user.id) {
      throw new APIError(403, 'You can only update your own templates');
    }

    const body = await request.json();
    const {
      id: _id,
      workspace_id: _workspaceId,
      created_by: _createdBy,
      created_at: _createdAt,
      ...updates
    } = body;

    // Update template
    const { data: updated, error: updateError } = await supabase
      .from('templates')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', workspace.id)
      .select()
      .single();

    if (updateError) {
      throw new APIError(500, 'Failed to update template');
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleAPIError(error);
  }
}
