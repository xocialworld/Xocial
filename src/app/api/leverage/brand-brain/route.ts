import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withErrorHandler, successResponse, validateRequest } from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { getBrandProfile } from '@/lib/intelligence/context';
import { calculateBrandCompletion, recordLearningEvent } from '@/lib/intelligence/learning';
import {
  changedBrandProfileFields,
  recordBrandProfileVersion,
} from '@/lib/intelligence/brand-profile-versions';

export const dynamic = 'force-dynamic';

const textArray = z.array(z.string()).optional().default([]);

const brandBrainSchema = z.object({
  voice: z.string().optional().default(''),
  audience: z.string().optional().default(''),
  products_offers: textArray,
  content_pillars: textArray,
  competitors: textArray,
  do_rules: textArray,
  dont_rules: textArray,
  approved_examples: textArray,
  rejected_examples: textArray,
  platform_preferences: z.record(z.string()).optional().default({}),
  knowledge_settings: z.record(z.unknown()).optional().default({}),
});

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { serviceClient, workspaceId } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager', 'creator', 'analyst'],
  });

  const profile = await getBrandProfile(serviceClient, workspaceId);
  return successResponse({
    profile,
    completion: calculateBrandCompletion(profile),
  });
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const input = await validateRequest(request, brandBrainSchema);
  const { serviceClient, workspaceId, user } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager', 'creator'],
  });

  const payload = {
    ...input,
    workspace_id: workspaceId,
    confidence_score: calculateBrandCompletion(input),
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  const { data: currentProfile } = await serviceClient
    .from('workspace_brand_profiles')
    .select('*')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  const { data, error } = await serviceClient
    .from('workspace_brand_profiles')
    .upsert(payload, { onConflict: 'workspace_id' })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const changedFields = changedBrandProfileFields(currentProfile, data);
  await recordBrandProfileVersion(serviceClient, {
    workspaceId,
    brandProfileId: data.id,
    snapshot: currentProfile || data,
    changedFields,
    changeSource: 'user',
    changeReason: 'Manual Brand Brain save',
    createdBy: user.id,
  });

  await recordLearningEvent(serviceClient, {
    workspaceId,
    actorUserId: user.id,
    source: 'user',
    eventType: 'brand_profile_updated',
    entityType: 'workspace_brand_profile',
    entityId: data.id,
    metadata: {
      completion: calculateBrandCompletion(data),
      updatedFields: changedFields.length ? changedFields : Object.keys(input),
    },
  });

  return successResponse({
    profile: data,
    completion: calculateBrandCompletion(data),
  });
});
