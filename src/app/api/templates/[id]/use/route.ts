import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleAPIError, APIError } from '@/lib/api-middleware';

export const dynamic = 'force-dynamic';

export async function POST(
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

    // Increment usage count
    const { error: updateError } = await supabase.rpc('increment_template_usage', {
      template_id: id,
    });

    if (updateError) {
      // If the RPC doesn't exist, use a direct update
      const { data: template, error: fetchError } = await supabase
        .from('templates')
        .select('usage_count')
        .eq('id', id)
        .single();

      if (fetchError || !template) {
        throw new APIError(404, 'Template not found');
      }

      const { error: directUpdateError } = await supabase
        .from('templates')
        .update({ usage_count: template.usage_count + 1 })
        .eq('id', id);

      if (directUpdateError) {
        throw new APIError(500, 'Failed to update template usage');
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error);
  }
}

