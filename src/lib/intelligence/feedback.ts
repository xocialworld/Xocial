import type { SupabaseClient } from '@supabase/supabase-js';
import { APIError } from '@/lib/api-middleware';
import {
  calculateBrandCompletion,
  normalizeTextList,
  recordLearningEvent,
} from '@/lib/intelligence/learning';
import {
  changedBrandProfileFields,
  recordBrandProfileVersion,
} from '@/lib/intelligence/brand-profile-versions';
import type {
  AIFeedbackActionType,
  AIFeedbackRecord,
  AIFeedbackRequest,
  AIFeedbackTargetType,
  LearningEventType,
} from '@/types/intelligence';

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

type RecordFeedbackInput = AIFeedbackRequest & {
  workspaceId: string;
  actorUserId?: string | null;
};

type TargetResult = {
  recommendation?: Record<string, unknown> | null;
  artifact?: Record<string, unknown> | null;
};

function isMissingFeedbackTable(error: any) {
  const message = String(error?.message || '');
  return (
    error?.code === '42P01' ||
    error?.code === '42703' ||
    error?.code === 'PGRST205' ||
    message.includes("Could not find the table 'public.ai_feedback_actions'")
  );
}

function toJsonObject(value: unknown): JsonValue {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') return value as Record<string, unknown>;
  return String(value);
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
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

function uniqueText(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function normalizeApplyMode(mode: string) {
  return ['replace', 'set'].includes(mode) ? 'replace' : 'append';
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

function eventTypeFor(targetType: AIFeedbackTargetType, action: AIFeedbackActionType): LearningEventType {
  if (targetType === 'strategy_recommendation') {
    if (action === 'mark_off_brand') return 'recommendation_marked_off_brand';
    if (action === 'dismiss' || action === 'ignore' || action === 'reject') return 'recommendation_dismissed';
    if (action === 'complete') return 'recommendation_completed';
    return 'recommendation_accepted';
  }

  if (targetType === 'agent_artifact') {
    if (action === 'mark_off_brand') return 'artifact_marked_off_brand';
    if (action === 'ignore' || action === 'dismiss' || action === 'reject') return 'artifact_ignored';
    return 'artifact_accepted';
  }

  return 'ai_feedback_recorded';
}

function strategyStatusFor(action: AIFeedbackActionType) {
  if (action === 'complete') return 'completed';
  if (action === 'dismiss' || action === 'ignore' || action === 'reject' || action === 'mark_off_brand') {
    return 'dismissed';
  }
  return 'active';
}

function artifactStatusFor(action: AIFeedbackActionType) {
  if (action === 'ignore' || action === 'dismiss' || action === 'reject' || action === 'mark_off_brand') {
    return 'ignored';
  }
  return 'accepted';
}

export async function applyBrandSuggestion(
  serviceClient: SupabaseClient,
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
  const applyMode = normalizeApplyMode(
    String(overrides.applyMode || overrides.operation || payload.operation || '')
  );
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
      applyMode === 'replace' || !existing ? suggested : [existing, suggested].filter(Boolean).join('\n');
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

  await recordBrandProfileVersion(serviceClient, {
    workspaceId,
    brandProfileId: current?.id || null,
    snapshot: current || update,
    changedFields: changedBrandProfileFields(current, { ...(current || {}), ...update }),
    changeSource: 'ai_feedback',
    changeReason: `Accepted Brand Brain suggestion for ${field}`,
    createdBy: userId,
  });

  return {
    field,
    applyMode,
    acceptedValue,
    edited: JSON.stringify(acceptedValue) !== JSON.stringify(payload.suggestedValue),
    appliedAt: new Date().toISOString(),
  };
}

export async function applyOffBrandFeedback(
  serviceClient: SupabaseClient,
  workspaceId: string,
  userId: string,
  input: {
    title?: string | null;
    summary?: string | null;
    payload?: Record<string, any>;
    feedback?: Record<string, unknown>;
    sourceType: AIFeedbackTargetType;
  }
) {
  const { data: current } = await serviceClient
    .from('workspace_brand_profiles')
    .select('*')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  const reasonType = String(input.feedback?.reasonType || 'off_brand');
  const comment = normalizeLongText(input.feedback?.comment || input.feedback?.reason || '');
  const title = normalizeLongText(input.title || '');
  const summary = normalizeLongText(input.summary || '');
  const suggestedValue = normalizeLongText(
    input.feedback?.example ||
      input.payload?.suggestedValue ||
      input.payload?.reasoningSummary ||
      input.payload?.reasonSummary ||
      input.payload?.summary ||
      ''
  );
  const rejectedExample = [title, summary || suggestedValue]
    .filter(Boolean)
    .join(' - ')
    .slice(0, 900);
  const dontRule =
    comment ||
    (reasonType === 'wrong_audience'
      ? 'Avoid recommendations that do not match the saved audience.'
      : reasonType === 'wrong_platform'
        ? 'Avoid platform recommendations that do not match the selected channel or media format.'
        : 'Avoid AI suggestions users mark as off-brand unless stronger brand evidence supports them.');

  const nextRejectedExamples = rejectedExample
    ? uniqueText([...normalizeTextList(current?.rejected_examples), rejectedExample])
    : normalizeTextList(current?.rejected_examples);
  const nextDontRules = dontRule
    ? uniqueText([...normalizeTextList(current?.dont_rules), dontRule])
    : normalizeTextList(current?.dont_rules);

  const update = {
    workspace_id: workspaceId,
    rejected_examples: nextRejectedExamples,
    dont_rules: nextDontRules,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };

  const { error } = await serviceClient
    .from('workspace_brand_profiles')
    .upsert(
      {
        ...update,
        confidence_score: calculateBrandCompletion({
          ...(current || {}),
          ...update,
        }),
      },
      { onConflict: 'workspace_id' }
    );

  if (error) {
    throw new APIError(500, error.message, 'OFF_BRAND_FEEDBACK_APPLY_FAILED');
  }

  await recordBrandProfileVersion(serviceClient, {
    workspaceId,
    brandProfileId: current?.id || null,
    snapshot: current || update,
    changedFields: changedBrandProfileFields(current, { ...(current || {}), ...update }),
    changeSource: 'ai_feedback',
    changeReason: `Marked ${input.sourceType} as off-brand`,
    createdBy: userId,
  });

  return {
    sourceType: input.sourceType,
    reasonType,
    comment,
    rejectedExample,
    addedRejectedExample: Boolean(rejectedExample),
    addedDontRule: Boolean(dontRule),
    appliedAt: new Date().toISOString(),
  };
}

async function updateStrategyRecommendation(
  serviceClient: SupabaseClient,
  input: RecordFeedbackInput
) {
  if (!input.targetId) {
    throw new APIError(400, 'targetId is required for strategy recommendation feedback', 'TARGET_ID_REQUIRED');
  }

  const status = strategyStatusFor(input.action);
  const { data, error } = await serviceClient
    .from('strategy_recommendations')
    .update({
      status,
      implemented_at: status === 'completed' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.targetId)
    .eq('workspace_id', input.workspaceId)
    .select()
    .single();

  if (error || !data) {
    throw new APIError(404, 'Recommendation not found', 'RECOMMENDATION_NOT_FOUND');
  }

  return data as Record<string, unknown>;
}

async function updateAgentArtifact(
  serviceClient: SupabaseClient,
  input: RecordFeedbackInput,
  brandBrainUpdate: Record<string, unknown> | null
) {
  if (!input.targetId) {
    throw new APIError(400, 'targetId is required for AI artifact feedback', 'TARGET_ID_REQUIRED');
  }

  const { data, error } = await serviceClient
    .from('agent_artifacts')
    .select()
    .eq('id', input.targetId)
    .eq('workspace_id', input.workspaceId)
    .single();

  if (error || !data) {
    throw new APIError(404, 'AI artifact not found', 'ARTIFACT_NOT_FOUND');
  }

  const currentPayload = asRecord(data.payload);
  const currentFeedback = Array.isArray(currentPayload.feedback) ? currentPayload.feedback : [];
  const feedbackEntry = {
    action: String(input.metadata?.legacyAction || input.action),
    reasonType: input.reasonType || null,
    comment: input.comment || '',
    originalValue: toJsonObject(input.originalValue),
    editedValue: toJsonObject(input.editedValue),
    markedOffBrand: input.action === 'mark_off_brand',
    createdAt: new Date().toISOString(),
  };

  const status = artifactStatusFor(input.action);
  const nextPayload = {
    ...currentPayload,
    ...(brandBrainUpdate ? { applied: brandBrainUpdate, appliedBrandFeedback: brandBrainUpdate } : {}),
    feedback: [...currentFeedback, feedbackEntry],
  };

  const { data: updatedArtifact, error: updateError } = await serviceClient
    .from('agent_artifacts')
    .update({
      status,
      payload: nextPayload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.id)
    .eq('workspace_id', input.workspaceId)
    .select()
    .single();

  if (updateError || !updatedArtifact) {
    throw new APIError(404, 'AI artifact not found', 'ARTIFACT_NOT_FOUND');
  }

  return updatedArtifact as Record<string, unknown>;
}

async function insertFeedbackAction(
  serviceClient: SupabaseClient,
  input: RecordFeedbackInput,
  brandBrainUpdate: Record<string, unknown> | null
) {
  const table = serviceClient.from('ai_feedback_actions') as any;
  if (typeof table?.insert !== 'function') {
    return null;
  }

  try {
    const { data, error } = await table
      .insert({
        workspace_id: input.workspaceId,
        actor_user_id: input.actorUserId || null,
        target_type: input.targetType,
        target_id: input.targetId || null,
        action: input.action,
        reason_type: input.reasonType || null,
        comment: input.comment || null,
        original_value: toJsonObject(input.originalValue) ?? {},
        edited_value: toJsonObject(input.editedValue) ?? {},
        apply_to_brand_brain: Boolean(input.applyToBrandBrain),
        brand_brain_update: brandBrainUpdate || {},
        metadata: input.metadata || {},
      })
      .select()
      .single();

    if (error) {
      if (!isMissingFeedbackTable(error)) {
        console.warn('[AI Feedback] Failed to store feedback action:', error.message);
      }
      return null;
    }

    return data as AIFeedbackRecord;
  } catch (error: any) {
    if (!isMissingFeedbackTable(error)) {
      console.warn('[AI Feedback] Failed to store feedback action:', error?.message || error);
    }
    return null;
  }
}

export async function recordAIFeedbackAction(
  serviceClient: SupabaseClient,
  input: RecordFeedbackInput
): Promise<{
  feedback: AIFeedbackRecord | null;
  target: TargetResult;
  brandBrainUpdate: Record<string, unknown> | null;
}> {
  const metadata = input.metadata || {};
  const originalRecord = asRecord(input.originalValue);
  let brandBrainUpdate: Record<string, unknown> | null = null;
  let recommendation: Record<string, unknown> | null = null;
  let artifact: Record<string, unknown> | null = null;

  if (input.targetType === 'strategy_recommendation') {
    recommendation = await updateStrategyRecommendation(serviceClient, input);
    if (input.action === 'mark_off_brand' && input.applyToBrandBrain !== false) {
      brandBrainUpdate = await applyOffBrandFeedback(serviceClient, input.workspaceId, String(input.actorUserId || ''), {
        title: String(recommendation.title || metadata.title || ''),
        summary: String(recommendation.description || metadata.summary || ''),
        payload: asRecord(recommendation.metrics),
        feedback: {
          reasonType: input.reasonType || 'off_brand',
          comment: input.comment || '',
          ...asRecord(input.editedValue),
        },
        sourceType: input.targetType,
      });
    }
  } else if (input.targetType === 'agent_artifact') {
    if (!input.targetId) {
      throw new APIError(400, 'targetId is required for AI artifact feedback', 'TARGET_ID_REQUIRED');
    }
    const { data } = await serviceClient
      .from('agent_artifacts')
      .select()
      .eq('id', input.targetId)
      .eq('workspace_id', input.workspaceId)
      .single();

    if (!data) {
      throw new APIError(404, 'AI artifact not found', 'ARTIFACT_NOT_FOUND');
    }

    const artifactPayload = asRecord(data.payload);
    if (
      (input.action === 'accept' || input.action === 'edit_accept' || input.action === 'apply') &&
      data.artifact_type === 'brand_suggestion'
    ) {
      brandBrainUpdate = await applyBrandSuggestion(
        serviceClient,
        input.workspaceId,
        artifactPayload,
        String(input.actorUserId || ''),
        {
          ...asRecord(input.editedValue),
          ...asRecord(metadata),
        }
      );
    }

    if (input.action === 'mark_off_brand' && input.applyToBrandBrain !== false) {
      brandBrainUpdate = await applyOffBrandFeedback(serviceClient, input.workspaceId, String(input.actorUserId || ''), {
        title: String(data.title || metadata.title || ''),
        summary: String(data.summary || metadata.summary || ''),
        payload: artifactPayload,
        feedback: {
          reasonType: input.reasonType || 'off_brand',
          comment: input.comment || '',
          ...asRecord(input.editedValue),
        },
        sourceType: input.targetType,
      });
    }

    artifact = await updateAgentArtifact(serviceClient, input, brandBrainUpdate);
  } else if (input.action === 'mark_off_brand' && input.applyToBrandBrain !== false) {
    brandBrainUpdate = await applyOffBrandFeedback(serviceClient, input.workspaceId, String(input.actorUserId || ''), {
      title: String(metadata.title || originalRecord.title || ''),
      summary: String(metadata.summary || originalRecord.summary || originalRecord.text || ''),
      payload: {
        ...originalRecord,
        ...asRecord(metadata),
      },
      feedback: {
        reasonType: input.reasonType || 'off_brand',
        comment: input.comment || '',
        ...asRecord(input.editedValue),
      },
      sourceType: input.targetType,
    });
  }

  const feedback = await insertFeedbackAction(serviceClient, input, brandBrainUpdate);
  await recordLearningEvent(serviceClient, {
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId || null,
    source: 'user',
    eventType: eventTypeFor(input.targetType, input.action),
    entityType: input.targetType,
    entityId: input.targetId || null,
    signalStrength: input.action === 'mark_off_brand' || input.action === 'reject' ? 0.9 : 0.7,
    metadata: {
      targetType: input.targetType,
      action: input.action,
      reasonType: input.reasonType || null,
      comment: input.comment || null,
      originalValue: toJsonObject(input.originalValue),
      editedValue: toJsonObject(input.editedValue),
      applyToBrandBrain: Boolean(input.applyToBrandBrain),
      brandBrainUpdate,
      feedbackActionId: feedback?.id || null,
      ...(input.metadata || {}),
    },
  });

  return {
    feedback,
    target: { recommendation, artifact },
    brandBrainUpdate,
  };
}
