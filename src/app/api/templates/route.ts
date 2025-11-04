import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleAPIError, APIError } from '@/lib/api-middleware';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new APIError(401, 'Unauthorized');
    }

    // Get user's workspace
    const { data: workspaceMember, error: workspaceError } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single();

    if (workspaceError || !workspaceMember) {
      throw new APIError(404, 'No workspace found');
    }

    // Fetch templates
    const { data: templates, error: templatesError } = await supabase
      .from('templates')
      .select('*')
      .eq('workspace_id', workspaceMember.workspace_id)
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
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new APIError(401, 'Unauthorized');
    }

    // Get user's workspace
    const { data: workspaceMember, error: workspaceError } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single();

    if (workspaceError || !workspaceMember) {
      throw new APIError(404, 'No workspace found');
    }

    const body = await request.json();
    const { name, description, content, category, platforms, tags, is_public } = body;

    // Validate required fields
    if (!name || !content || !category || !platforms || platforms.length === 0) {
      throw new APIError(400, 'Missing required fields');
    }

    // Create template
    const { data: template, error: createError } = await supabase
      .from('templates')
      .insert({
        workspace_id: workspaceMember.workspace_id,
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

