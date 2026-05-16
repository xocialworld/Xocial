import { NextRequest } from "next/server";
import { APIError, errorResponse, successResponse, validateRequest } from "@/lib/api-middleware";
import { requireWorkspaceContext } from "@/lib/workspace-context";
import { z } from "zod";

// Fetch media assets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'image' | 'video' | undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { userClient: supabase, workspace } = await requireWorkspaceContext(request);

    let query = supabase
      .from('media_assets')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) {
      query = query.eq('file_type', type);
    }

    const { data, error } = await query;

    if (error) {
      // If table doesn't exist yet, return empty
      if (error.code === '42P01') return successResponse([]);
      throw error;
    }

    return successResponse({ media: data });
  } catch (error) {
    return errorResponse(error as Error);
  }
}

// Upload media asset (Metadata only - actual upload happens via storage presigned URL or direct upload)
// Or for this MVP, we might assume direct upload to storage and then creating a record here.
// But let's implementing DELETE first as requested.

const deleteSchema = z.object({
  id: z.string()
});

export async function DELETE(request: NextRequest) {
  try {
    const body = await validateRequest(request, deleteSchema);
    const { userClient: supabase, workspace } = await requireWorkspaceContext(request);

    // Get the asset to find its storage path (if we were deleting from storage too)
    // For now, we assume RLS handles permission to delete
    const { data: asset } = await supabase
      .from('media_assets')
      .select('*')
      .eq('id', body.id)
      .eq('workspace_id', workspace.id)
      .single();

    if (!asset) {
      throw new APIError(404, 'Asset not found');
    }

    // 1. Delete from Storage (if url contains storage path)
    // This is tricky without knowing exact bucket structure, but usually it's in 'media' bucket.
    // We'll attempt to delete from DB first.

    const { error } = await supabase
      .from('media_assets')
      .delete()
      .eq('id', body.id)
      .eq('workspace_id', workspace.id);

    if (error) throw error;

    return successResponse({ success: true, id: body.id });
  } catch (error) {
    return errorResponse(error as Error);
  }
}
