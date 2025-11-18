import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceFromRequest } from '@/lib/api-middleware';

function escapeLikePattern(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

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
    const search = searchParams.get('search')?.trim();
    const label = searchParams.get('label')?.trim();
    const mime = searchParams.get('mime')?.trim();
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get user's workspace
    const workspace = await getWorkspaceFromRequest(user.id, request, supabase);

    // Build query
    let query = supabase
      .from('media')
      .select('*', { count: 'exact' })
      .eq('workspace_id', workspace.id);

    if (fileType && (fileType === 'image' || fileType === 'video')) {
      query = query.eq('file_type', fileType);
    }

    if (search) {
      const pattern = `%${escapeLikePattern(search)}%`;
      query = query.or(
        `original_filename.ilike.${pattern},title.ilike.${pattern},tags.cs.{${search}}`
      );
    }

    if (label) {
      query = query.contains('ai_labels', [label]);
    }

    if (mime) {
      const normalized = mime.endsWith('%') ? mime : `${mime}%`;
      query = query.ilike('mime_type', normalized);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: media, error, count } = await query;

    if (error) {
      console.error('Media fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch media' },
        { status: 500 }
      );
    }

    const sanitized = (media || []).map((item) => ({
      id: item.id,
      filename: item.filename,
      original_filename: item.original_filename,
      file_type: item.file_type,
      mime_type: item.mime_type,
      file_size: item.file_size,
      url: item.url,
      thumbnail_url: item.thumbnail_url,
      ai_labels: item.ai_labels || [],
      ai_description: item.ai_description,
      created_at: item.created_at,
      uploaded_by: item.uploaded_by,
      metadata: item.metadata,
    }));

    return NextResponse.json({
      success: true,
      data: {
        media: sanitized,
      },
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

