/**
 * Notifications API
 * GET /api/notifications - Fetch user notifications
 * PATCH /api/notifications - Mark notification(s) as read
 * DELETE /api/notifications - Delete notification(s)
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  getPagination,
  APIError,
} from '@/lib/api-middleware';

/**
 * GET /api/notifications
 * Fetch notifications for the current user
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);
  const { page, limit, offset } = getPagination(request);

  // Get query parameters
  const searchParams = request.nextUrl.searchParams;
  const unreadOnly = searchParams.get('unread') === 'true';
  const type = searchParams.get('type');

  // Build query
  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (unreadOnly) {
    query = query.eq('read', false);
  }

  if (type) {
    query = query.eq('type', type);
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data: notifications, error, count } = await query;

  if (error) {
    throw new APIError(500, error.message, 'DATABASE_ERROR');
  }

  // Get unread count
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false);

  return successResponse(
    {
      notifications: notifications || [],
      unreadCount: unreadCount || 0,
    },
    {
      page,
      limit,
      total: count || 0,
    }
  );
});

/**
 * PATCH /api/notifications
 * Mark notifications as read
 */
export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);

  const body = await request.json();
  const schema = z.object({
    notificationIds: z.array(z.string().uuid()).optional(),
    markAllAsRead: z.boolean().optional(),
  });

  const validation = schema.safeParse(body);
  if (!validation.success) {
    throw new APIError(400, 'Invalid request body', 'VALIDATION_ERROR');
  }

  const { notificationIds, markAllAsRead } = validation.data;

  if (markAllAsRead) {
    // Mark all notifications as read
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) {
      throw new APIError(500, error.message, 'UPDATE_FAILED');
    }

    return successResponse({ message: 'All notifications marked as read' });
  }

  if (notificationIds && notificationIds.length > 0) {
    // Mark specific notifications as read
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', notificationIds)
      .eq('user_id', user.id);

    if (error) {
      throw new APIError(500, error.message, 'UPDATE_FAILED');
    }

    return successResponse({
      message: `${notificationIds.length} notification(s) marked as read`,
    });
  }

  throw new APIError(400, 'Must provide notificationIds or markAllAsRead', 'INVALID_REQUEST');
});

/**
 * DELETE /api/notifications
 * Delete notifications
 */
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);

  const body = await request.json();
  const schema = z.object({
    notificationIds: z.array(z.string().uuid()).optional(),
    deleteAll: z.boolean().optional(),
  });

  const validation = schema.safeParse(body);
  if (!validation.success) {
    throw new APIError(400, 'Invalid request body', 'VALIDATION_ERROR');
  }

  const { notificationIds, deleteAll } = validation.data;

  if (deleteAll) {
    // Delete all read notifications
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)
      .eq('read', true);

    if (error) {
      throw new APIError(500, error.message, 'DELETE_FAILED');
    }

    return successResponse({ message: 'All read notifications deleted' });
  }

  if (notificationIds && notificationIds.length > 0) {
    // Delete specific notifications
    const { error } = await supabase
      .from('notifications')
      .delete()
      .in('id', notificationIds)
      .eq('user_id', user.id);

    if (error) {
      throw new APIError(500, error.message, 'DELETE_FAILED');
    }

    return successResponse({
      message: `${notificationIds.length} notification(s) deleted`,
    });
  }

  throw new APIError(400, 'Must provide notificationIds or deleteAll', 'INVALID_REQUEST');
});

export const dynamic = 'force-dynamic';

