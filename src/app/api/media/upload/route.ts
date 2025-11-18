import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkWorkspaceAccess } from '@/lib/api-middleware';
import { getWorkspaceFromRequest } from '@/lib/api-middleware';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's workspace
    const workspace = await getWorkspaceFromRequest(user.id, request, supabase);

    const role = await checkWorkspaceAccess(user.id, workspace.id);
    if (role === 'viewer') {
      return NextResponse.json(
        { error: 'You do not have permission to upload media' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images and videos are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50MB.' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const filename = `${uuidv4()}.${fileExt}`;
    const storagePath = `${workspace.id}/${filename}`;

    // Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(storagePath);

    // Determine file type category
    const fileType = file.type.startsWith('image/') ? 'image' : 'video';

    // Create media record in database
    const { data: mediaRecord, error: dbError } = await supabase
      .from('media')
      .insert({
        workspace_id: workspace.id,
        filename,
        original_filename: file.name,
        file_type: fileType,
        mime_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        url: publicUrl,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Try to delete uploaded file
      await supabase.storage.from('media').remove([storagePath]);
      return NextResponse.json(
        { error: 'Failed to save media record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: mediaRecord,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload media' },
      { status: 500 }
    );
  }
}

