import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleAPIError, APIError } from '@/lib/api-middleware';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new APIError(401, 'Unauthorized');
    }

    const { data: template, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !template) {
      throw new APIError(404, 'Template not found');
    }

    return NextResponse.json({ data: template });
  } catch (error) {
    return handleAPIError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new APIError(401, 'Unauthorized');
    }

    // Verify ownership
    const { data: template, error: fetchError } = await supabase
      .from('templates')
      .select('created_by')
      .eq('id', id)
      .single();

    if (fetchError || !template) {
      throw new APIError(404, 'Template not found');
    }

    if (template.created_by !== user.id) {
      throw new APIError(403, 'You can only delete your own templates');
    }

    // Delete template
    const { error: deleteError } = await supabase
      .from('templates')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw new APIError(500, 'Failed to delete template');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new APIError(401, 'Unauthorized');
    }

    // Verify ownership
    const { data: template, error: fetchError } = await supabase
      .from('templates')
      .select('created_by')
      .eq('id', id)
      .single();

    if (fetchError || !template) {
      throw new APIError(404, 'Template not found');
    }

    if (template.created_by !== user.id) {
      throw new APIError(403, 'You can only update your own templates');
    }

    const body = await request.json();

    // Update template
    const { data: updated, error: updateError } = await supabase
      .from('templates')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw new APIError(500, 'Failed to update template');
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleAPIError(error);
  }
}

