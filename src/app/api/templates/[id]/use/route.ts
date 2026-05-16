import { NextRequest, NextResponse } from 'next/server';
import { handleAPIError, APIError } from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userClient: supabase, workspace } = await requireWorkspaceContext(request);

    const { data: template, error: fetchError } = await supabase
      .from('templates')
      .select('usage_count')
      .eq('id', id)
      .eq('workspace_id', workspace.id)
      .single();

    if (fetchError || !template) {
      throw new APIError(404, 'Template not found');
    }

    const { error: updateError } = await supabase
      .from('templates')
      .update({ usage_count: (template.usage_count || 0) + 1 })
      .eq('id', id)
      .eq('workspace_id', workspace.id);

    if (updateError) {
      throw new APIError(500, 'Failed to update template usage');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error);
  }
}
