import { NextRequest } from 'next/server';
import { withErrorHandler, requireAuth, successResponse, validateRequest, APIError } from '@/lib/api-middleware';
import { z } from 'zod';

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireAuth(request);
  return successResponse({ notifications: [] });
});

const patchSchema = z.object({
  notificationIds: z.array(z.string().uuid()).optional(),
  markAllAsRead: z.boolean().optional(),
});

export const PATCH = withErrorHandler(async (request: NextRequest) => {
  await requireAuth(request);
  await validateRequest(request, patchSchema);
  return successResponse({ updated: true });
});

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
