import { NextRequest, NextResponse } from 'next/server';
import { handleAPIError } from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userClient: supabase, workspace } = await requireWorkspaceContext(request);

    const { data: media, error } = await supabase
      .from('media')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspace.id)
      .single();

    if (error || !media) {
      return NextResponse.json(
        { error: 'Media not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: media,
    });
  } catch (error) {
    console.error('Media get error:', error);
    return handleAPIError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, userClient: supabase, workspace } = await requireWorkspaceContext(request);

    const body = await request.json();
    const { title, alt_text, tags } = body;

    const { data: media, error } = await supabase
      .from('media')
      .update({
        title,
        alt_text,
        tags,
      })
      .eq('id', id)
      .eq('workspace_id', workspace.id)
      .eq('uploaded_by', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update media' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: media,
    });
  } catch (error) {
    console.error('Media update error:', error);
    return handleAPIError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userClient: supabase, workspace } = await requireWorkspaceContext(request);

    // 1. Try to find in media_assets (new table)
    const { data: asset, error: assetError } = await supabase
      .from('media_assets')
      .select('storage_path')
      .eq('id', id)
      .eq('workspace_id', workspace.id)
      .single();

    if (asset) {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('media')
        .remove([asset.storage_path]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('media_assets')
        .delete()
        .eq('id', id)
        .eq('workspace_id', workspace.id);

      if (dbError) {
        return NextResponse.json(
          { error: 'Failed to delete media asset' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Media deleted successfully',
      });
    }

    // 2. If not found, try to find in media (legacy table)
    const { data: legacyMedia, error: legacyError } = await supabase
      .from('media')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspace.id)
      .single();

    if (legacyMedia) {
      // Try to extract storage path from URL if possible
      // This is best-effort for legacy items
      try {
        if (legacyMedia.url && legacyMedia.url.includes('/storage/v1/object/public/media/')) {
          const storagePath = legacyMedia.url.split('/storage/v1/object/public/media/')[1];
          if (storagePath) {
            await supabase.storage
              .from('media')
              .remove([storagePath]);
          }
        }
      } catch (e) {
        console.warn('Failed to cleanup legacy storage file:', e);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('media')
        .delete()
        .eq('id', id)
        .eq('workspace_id', workspace.id);

      if (dbError) {
        return NextResponse.json(
          { error: 'Failed to delete legacy media' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Legacy media deleted successfully',
      });
    }

    // If reached here, media was not found in either table
    return NextResponse.json(
      { error: 'Media not found' },
      { status: 404 }
    );

  } catch (error) {
    console.error('Media delete error:', error);
    return handleAPIError(error);
  }
}
