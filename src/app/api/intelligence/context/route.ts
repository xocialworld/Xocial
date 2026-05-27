import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { buildIntelligenceContext } from '@/lib/intelligence/context';
import type { Platform } from '@/types';

export const dynamic = 'force-dynamic';

const PLATFORM_VALUES: Platform[] = [
  'facebook',
  'instagram',
  'twitter',
  'linkedin',
  'tiktok',
  'youtube',
];

function parsePlatforms(value: string | null): Platform[] {
  if (!value) return [];
  return value
    .split(',')
    .map((platform) => platform.trim().toLowerCase())
    .filter((platform): platform is Platform => PLATFORM_VALUES.includes(platform as Platform));
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { serviceClient, workspaceId } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager', 'creator', 'analyst'],
  });

  const context = await buildIntelligenceContext(serviceClient, {
    workspaceId,
    selectedPlatforms: parsePlatforms(request.nextUrl.searchParams.get('platforms')),
    campaignGoal: request.nextUrl.searchParams.get('goal') || undefined,
    query: request.nextUrl.searchParams.get('query') || undefined,
  });

  return successResponse({ context });
});
