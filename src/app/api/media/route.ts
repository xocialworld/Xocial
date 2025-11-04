import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const fileType = searchParams.get('type'); // 'image' or 'video'
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get user's workspace
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    // Build query
    let query = supabase
      .from('media')
      .select('*', { count: 'exact' })
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply file type filter if provided
    if (fileType && (fileType === 'image' || fileType === 'video')) {
      query = query.eq('file_type', fileType);
    }

    const { data: media, error, count } = await query;

    if (error) {
      console.error('Media fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch media' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: media,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error('Media list error:', error);
    return NextResponse.json(
      { error: 'Failed to list media' },
      { status: 500 }
    );
  }
}

