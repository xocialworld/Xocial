import { NextRequest, NextResponse } from 'next/server';
import { handleAPIError, APIError } from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { userClient: supabase, workspace } = await requireWorkspaceContext(request);

    // Fetch templates
    const { data: templates, error: templatesError } = await supabase
      .from('templates')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false });

    if (templatesError) {
      throw new APIError(500, 'Failed to fetch templates');
    }

    return NextResponse.json({ data: templates || [] });
  } catch (error) {
    return handleAPIError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, userClient: supabase, workspace } = await requireWorkspaceContext(request);

    const body = await request.json();
    const { name, description, content, category, platforms, tags, is_public, workspace_id } = body;

    // Validate required fields
    if (!name || !content || !category || !platforms || platforms.length === 0) {
      throw new APIError(400, 'Missing required fields');
    }

    if (workspace_id && workspace_id !== workspace.id) {
      throw new APIError(400, 'workspace_id must match the selected workspace');
    }

    // Create template
    const { data: template, error: createError } = await supabase
      .from('templates')
      .insert({
        workspace_id: workspace.id,
        created_by: user.id,
        name,
        description: description || null,
        content,
        category,
        platforms,
        tags: tags || [],
        is_public: is_public || false,
        usage_count: 0,
      })
      .select()
      .single();

    if (createError) {
      console.error('Create template error:', createError);
      throw new APIError(500, 'Failed to create template');
    }

    return NextResponse.json({ data: template }, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}
