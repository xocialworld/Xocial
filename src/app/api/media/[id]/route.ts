import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceFromRequest } from '@/lib/api-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const workspace = await getWorkspaceFromRequest(user.id, request, supabase);

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
    return NextResponse.json(
      { error: 'Failed to fetch media' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, alt_text, tags } = body;

    const workspace = await getWorkspaceFromRequest(user.id, request, supabase);

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
    return NextResponse.json(
      { error: 'Failed to update media' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const workspace = await getWorkspaceFromRequest(user.id, request, supabase);

    // Get media record to get storage path
    const { data: media, error: fetchError } = await supabase
      .from('media')
      .select('storage_path')
      .eq('id', id)
      .eq('workspace_id', workspace.id)
      .single();

    if (fetchError || !media) {
      return NextResponse.json(
        { error: 'Media not found' },
        { status: 404 }
      );
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('media')
      .remove([media.storage_path]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('media')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspace.id)
      .eq('uploaded_by', user.id);

    if (dbError) {
      return NextResponse.json(
        { error: 'Failed to delete media' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Media deleted successfully',
    });
  } catch (error) {
    console.error('Media delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete media' },
      { status: 500 }
    );
  }
}

