import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getWorkspaceFromRequest, APIError } from '@/lib/api-middleware';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('[Upload] Starting upload request...');
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Upload] Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspace = await getWorkspaceFromRequest(user.id, request, supabase);
    console.log('[Upload] Workspace:', workspace.id);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      console.error('[Upload] No file provided');
      throw new APIError(400, 'No file provided', 'NO_FILE');
    }

    console.log('[Upload] File received:', { name: file.name, type: file.type, size: file.size });

    const mime = file.type || 'application/octet-stream';
    const isImage = mime.startsWith('image/');
    const isVideo = mime.startsWith('video/');
    const fileType = isVideo ? 'video' : isImage ? 'image' : 'unknown';

    if (fileType === 'unknown') {
      throw new APIError(400, 'Unsupported file type', 'UNSUPPORTED_FILE_TYPE');
    }

    const maxSizeMB = isVideo ? 200 : 25;
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new APIError(413, `File too large (>${maxSizeMB}MB)`, 'FILE_TOO_LARGE');
    }

    const safeName = encodeURIComponent(file.name.replace(/\s+/g, '_'));
    const path = `${workspace.id}/${Date.now()}_${safeName}`;

    console.log('[Upload] Uploading to storage path:', path);

    // Use service role client for storage upload to bypass RLS issues
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('[Upload] Missing SUPABASE_SERVICE_ROLE_KEY');
        throw new APIError(500, 'Server configuration error', 'CONFIG_ERROR');
    }

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Ensure bucket exists and is public
    try {
      const { data: bucketInfo } = await supabaseAdmin.storage.getBucket('media');
      if (!bucketInfo) {
        await supabaseAdmin.storage.createBucket('media', { public: true });
      }
    } catch (bucketErr) {
      console.warn('[Upload] Bucket check/create failed, will attempt upload anyway:', bucketErr);
    }

    // Normalize to Blob for Node runtime compatibility
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: mime });

    const { data: uploadRes, error: uploadError } = await supabaseAdmin.storage
      .from('media')
      .upload(path, blob, {
        contentType: mime,
        upsert: false,
      });

    if (uploadError) {
      console.error('[Upload] Storage upload failed:', uploadError);
      throw new APIError(500, uploadError.message || 'Failed to upload to storage', 'STORAGE_UPLOAD_FAILED');
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from('media').getPublicUrl(path);
    const url = publicUrlData.publicUrl;
    console.log('[Upload] Upload successful, URL:', url);

    const { data: record, error: insertError } = await supabaseAdmin
      .from('media_assets')
      .insert({
        workspace_id: workspace.id,
        file_name: file.name,
        storage_path: path,
        file_type: fileType,
        mime_type: mime,
        size_bytes: file.size,
        url,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Upload] Database insert failed:', insertError);
      throw new APIError(500, insertError.message || 'Failed to create media record', 'MEDIA_INSERT_FAILED');
    }

    return NextResponse.json({ 
        id: record.id, 
        url, 
        storage_path: path, 
        name: record.file_name, 
        type: record.file_type, 
        size: record.size_bytes 
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Upload] Uncaught error:', error);
    const status = error?.status || 500;
    const message = error?.message || 'Failed to upload media';
    return NextResponse.json({ error: message }, { status });
  }
}
