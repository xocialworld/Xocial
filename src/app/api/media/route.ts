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

    const sort = searchParams.get('sort') || 'date_desc'; // date_desc, date_asc, name_asc, name_desc, size_desc, size_asc

    // Helper to build query for a table
    const buildQuery = (table: string, dateField: string, nameField: string, sizeField: string) => {
      let q = supabase
        .from(table)
        .select('*')
        .eq('workspace_id', workspace.id);

      if (fileType && (fileType === 'image' || fileType === 'video')) {
        q = q.eq('file_type', fileType);
      }

      if (search) {
        const pattern = `%${escapeLikePattern(search)}%`;
        // Adjust search fields based on table
        if (table === 'media_assets') {
          q = q.or(`${nameField}.ilike.${pattern},tags.cs.{${search}}`);
        } else {
          q = q.or(`original_filename.ilike.${pattern},title.ilike.${pattern},tags.cs.{${search}}`);
        }
      }

      if (mime) {
        const normalized = mime.endsWith('%') ? mime : `${mime}%`;
        q = q.ilike('mime_type', normalized);
      }

      // We fetch more than limit to allow for combined sorting and pagination
      // This is a trade-off for not having a unified view
      q = q.order(dateField, { ascending: false }).limit(limit + offset);

      return q;
    };

    // Execute parallel queries
    const [assetsRes, legacyRes] = await Promise.all([
      buildQuery('media_assets', 'uploaded_at', 'file_name', 'size_bytes'),
      buildQuery('media', 'created_at', 'original_filename', 'file_size')
    ]);

    if (assetsRes.error) console.error('Assets fetch error:', assetsRes.error);
    if (legacyRes.error) console.error('Legacy fetch error:', legacyRes.error);

    const assets = assetsRes.data || [];
    const legacy = legacyRes.data || [];

    // Map to unified format
    const unifiedAssets = assets.map(item => ({
      id: item.id,
      filename: item.file_name,
      original_filename: item.file_name,
      file_type: item.file_type,
      mime_type: item.mime_type,
      file_size: item.size_bytes,
      url: item.storage_path.startsWith('http')
        ? item.storage_path
        : supabase.storage.from('media').getPublicUrl(item.storage_path).data.publicUrl,
      thumbnail_url: null,
      created_at: item.uploaded_at,
      uploaded_by: item.uploaded_by,
      source: 'media_assets'
    }));

    const unifiedLegacy = legacy.map(item => ({
      id: item.id,
      filename: item.filename,
      original_filename: item.original_filename,
      file_type: item.file_type,
      mime_type: item.mime_type,
      file_size: item.file_size,
      url: item.url,
      thumbnail_url: item.thumbnail_url,
      created_at: item.created_at,
      uploaded_by: item.uploaded_by,
      source: 'media'
    }));

    // Combine
    let allMedia = [...unifiedAssets, ...unifiedLegacy];

    // Sort
    allMedia.sort((a, b) => {
      switch (sort) {
        case 'date_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'date_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'name_asc':
          return (a.original_filename || '').localeCompare(b.original_filename || '');
        case 'name_desc':
          return (b.original_filename || '').localeCompare(a.original_filename || '');
        case 'size_asc':
          return (a.file_size || 0) - (b.file_size || 0);
        case 'size_desc':
          return (b.file_size || 0) - (a.file_size || 0);
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    // Paginate
    const total = allMedia.length; // Approximate total since we limited fetch
    const paginatedMedia = allMedia.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: {
        media: paginatedMedia,
      },
      pagination: {
        total: total, // Note: This is now the total of fetched items, not DB total
        limit,
        offset,
        hasMore: total > offset + limit,
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

