import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withErrorHandler, successResponse, validateRequest, APIError } from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import {
  calculateBrandCompletion,
  normalizeTextList,
  recordLearningEvent,
} from '@/lib/intelligence/learning';

export const dynamic = 'force-dynamic';

const actionSchema = z.object({
  action: z.enum([
    'recommendation_accept',
    'recommendation_dismiss',
    'recommendation_complete',
    'artifact_accept',
    'artifact_ignore',
  ]),
  targetId: z.string().min(1),
  payload: z.record(z.unknown()).optional().default({}),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const input = await validateRequest(request, actionSchema);
  const { serviceClient, workspaceId, user } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager', 'creator', 'analyst'],
  });

  if (input.action.startsWith('recommendation_')) {
    const status =
      input.action === 'recommendation_dismiss'
        ? 'dismissed'
        : input.action === 'recommendation_complete'
          ? 'completed'
          : 'active';

    const { data, error } = await serviceClient
      .from('strategy_recommendations')
      .update({
        status,
        implemented_at: status === 'completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.targetId)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error || !data) {
      throw new APIError(404, 'Recommendation not found', 'RECOMMENDATION_NOT_FOUND');
    }

    await recordLearningEvent(serviceClient, {
      workspaceId,
      actorUserId: user.id,
      source: 'user',
      eventType:
        input.action === 'recommendation_dismiss'
          ? 'recommendation_dismissed'
          : input.action === 'recommendation_complete'
            ? 'recommendation_completed'
          : 'recommendation_accepted',
      entityType: 'strategy_recommendation',
      entityId: data.id,
      metadata: {
        status,
        payload: input.payload,
      },
    });

    return successResponse({ recommendation: data });
  }

  const artifactStatus = input.action === 'artifact_ignore' ? 'ignored' : 'accepted';
  const { data, error } = await serviceClient
    .from('agent_artifacts')
    .select()
    .eq('id', input.targetId)
    .eq('workspace_id', workspaceId)
    .single();

  if (error || !data) {
    throw new APIError(404, 'AI artifact not found', 'ARTIFACT_NOT_FOUND');
  }

  let appliedBrandSuggestion: Record<string, unknown> | null = null;
  if (input.action === 'artifact_accept' && data.artifact_type === 'brand_suggestion') {
    appliedBrandSuggestion = await applyBrandSuggestion(
      serviceClient,
      workspaceId,
      data.payload || {},
      user.id,
      input.payload || {}
    );
  }

  const artifactPayload =
    appliedBrandSuggestion && data.payload && typeof data.payload === 'object'
      ? {
          ...(data.payload as Record<string, unknown>),
          applied: appliedBrandSuggestion,
        }
      : data.payload;

  const { data: updatedArtifact, error: updateError } = await serviceClient
    .from('agent_artifacts')
    .update({
      status: artifactStatus,
      payload: artifactPayload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.id)
    .eq('workspace_id', workspaceId)
    .select()
    .single();

  if (updateError || !updatedArtifact) {
    throw new APIError(404, 'AI artifact not found', 'ARTIFACT_NOT_FOUND');
  }

  await recordLearningEvent(serviceClient, {
    workspaceId,
    actorUserId: user.id,
    source: 'user',
    eventType: artifactStatus === 'accepted' ? 'recommendation_accepted' : 'recommendation_dismissed',
    entityType: 'agent_artifact',
    entityId: data.id,
    metadata: {
      status: artifactStatus,
      payload: input.payload,
      appliedBrandSuggestion,
    },
  });

  return successResponse({ artifact: updatedArtifact });
});

async function applyBrandSuggestion(
  serviceClient: any,
  workspaceId: string,
  payload: Record<string, any>,
  userId: string,
  overrides: Record<string, any> = {}
) {
  const field = String(payload.field || '');
  const allowedTextFields = new Set(['voice', 'audience']);
  const allowedArrayFields = new Set([
    'products_offers',
    'content_pillars',
    'competitors',
    'do_rules',
    'dont_rules',
    'approved_examples',
    'rejected_examples',
  ]);
  const allowedObjectFields = new Set(['platform_preferences']);

  const { data: current } = await serviceClient
    .from('workspace_brand_profiles')
    .select('*')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  const acceptedValue =
    overrides.editedValue ??
    overrides.value ??
    overrides.suggestedValue ??
    payload.suggestedValue;
  const applyMode = normalizeApplyMode(String(overrides.applyMode || overrides.operation || payload.operation || ''));
  const update: Record<string, unknown> = {
    workspace_id: workspaceId,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };

  if (allowedArrayFields.has(field)) {
    const existing = normalizeTextList(current?.[field]);
    const suggested = normalizeTextList(acceptedValue);
    update[field] = applyMode === 'replace' ? suggested : uniqueText([...existing, ...suggested]);
  } else if (allowedTextFields.has(field) && acceptedValue) {
    const existing = String(current?.[field] || '').trim();
    const suggested = normalizeLongText(acceptedValue);
    update[field] =
      applyMode === 'replace' || !existing
        ? suggested
        : [existing, suggested].filter(Boolean).join('\n');
  } else if (allowedObjectFields.has(field)) {
    const existing =
      current?.[field] && typeof current[field] === 'object' && !Array.isArray(current[field])
        ? current[field]
        : {};
    const suggested = normalizePlatformPreferences(acceptedValue);
    update[field] = applyMode === 'replace' ? suggested : { ...existing, ...suggested };
  } else {
    throw new APIError(400, 'Unsupported Brand Brain suggestion field', 'UNSUPPORTED_BRAND_FIELD', {
      field,
    });
  }

  update.confidence_score = calculateBrandCompletion({
    ...(current || {}),
    ...update,
  });

  const { error } = await serviceClient
    .from('workspace_brand_profiles')
    .upsert(update, { onConflict: 'workspace_id' });

  if (error) {
    throw new APIError(500, error.message, 'BRAND_SUGGESTION_APPLY_FAILED');
  }

  return {
    field,
    applyMode,
    acceptedValue,
    edited: JSON.stringify(acceptedValue) !== JSON.stringify(payload.suggestedValue),
    appliedAt: new Date().toISOString(),
  };
}

function uniqueText(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function normalizeApplyMode(mode: string) {
  return ['replace', 'set'].includes(mode) ? 'replace' : 'append';
}

function normalizeLongText(value: unknown) {
  if (Array.isArray(value)) {
    return normalizeTextList(value).join('\n');
  }
  if (value && typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value || '').trim();
}

function normalizePlatformPreferences(value: unknown): Record<string, string> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([platform, preference]) => [platform, String(preference || '').trim()])
        .filter(([, preference]) => Boolean(preference))
    );
  }

  const preferences: Record<string, string> = {};
  String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const separator = line.includes(':') ? ':' : '=';
      const [platform, ...rest] = line.split(separator);
      const key = platform?.trim();
      const preference = rest.join(separator).trim();
      if (key && preference) {
        preferences[key] = preference;
      }
    });
  return preferences;
}
