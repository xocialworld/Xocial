import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withErrorHandler, requireAuth, successResponse, validateRequest, APIError } from '@/lib/api-middleware';
import { z } from 'zod';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user } = await requireAuth(request);
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  const supabase = await createClient(); // Use standard client, RLS should handle user scoping if set up, or we scope manually

  // Explicitly fetching for the user to ensure security even if RLS is loose
  const { data: notifications, error, count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new APIError(500, 'Failed to fetch notifications');

  // Get unread count
  const { count: unreadCount, error: countError } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false);

  if (countError) console.error('Error fetching unread count:', countError);

  return successResponse({
    notifications: notifications || [],
    total: count || 0,
    unreadCount: unreadCount || 0
  });
});

export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const { user } = await requireAuth(request);

  // Simple validation schema for now
  const schema = z.object({
    markAllAsRead: z.boolean().optional(),
    notificationId: z.string().optional(),
    read: z.boolean().optional()
  });

  const body = await validateRequest(request, schema);
  const supabase = await createClient();

  if (body.markAllAsRead) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      throw new APIError(500, 'Failed to mark notifications as read');
    }

    return successResponse({ success: true });
  }

  if (body.notificationId && body.read !== undefined) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: body.read })
      .eq('id', body.notificationId)
      .eq('user_id', user.id);

    if (error) {
      throw new APIError(500, 'Failed to update notification');
    }

    return successResponse({ success: true });
  }

  return successResponse({ success: true, message: 'No action taken' });
});

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
