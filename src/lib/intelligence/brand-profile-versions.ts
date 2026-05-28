import type { SupabaseClient } from '@supabase/supabase-js';

function isMissingVersionTable(error: any) {
  const message = String(error?.message || '');
  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    message.includes("Could not find the table 'public.workspace_brand_profile_versions'") ||
    message.includes('order is not a function')
  );
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

export function changedBrandProfileFields(
  previous: Record<string, any> | null | undefined,
  next: Record<string, any>
) {
  const before = asRecord(previous);
  return [
    'voice',
    'audience',
    'products_offers',
    'content_pillars',
    'competitors',
    'do_rules',
    'dont_rules',
    'approved_examples',
    'rejected_examples',
    'platform_preferences',
    'knowledge_settings',
  ].filter((field) => JSON.stringify(before[field] ?? null) !== JSON.stringify(next[field] ?? null));
}

export async function recordBrandProfileVersion(
  supabase: SupabaseClient,
  input: {
    workspaceId: string;
    brandProfileId?: string | null;
    snapshot?: Record<string, unknown> | null;
    changedFields?: string[];
    changeSource?: string;
    changeReason?: string | null;
    createdBy?: string | null;
  }
) {
  if (!input.snapshot || Object.keys(input.snapshot).length === 0) {
    return null;
  }

  let latest: any = null;
  try {
    const result = await supabase
      .from('workspace_brand_profile_versions')
      .select('version_no')
      .eq('workspace_id', input.workspaceId)
      .order('version_no', { ascending: false })
      .limit(1)
      .maybeSingle();
    latest = result.data;

    if (result.error) {
      if (!isMissingVersionTable(result.error)) {
        console.warn('[BrandBrain] Failed to inspect profile versions:', result.error.message);
      }
      return null;
    }
  } catch (error: any) {
    if (!isMissingVersionTable(error)) {
      console.warn('[BrandBrain] Failed to inspect profile versions:', error?.message || error);
    }
    return null;
  }

  const versionNo = Number(latest?.version_no || 0) + 1;
  let insertResult: any;
  try {
    insertResult = await supabase
      .from('workspace_brand_profile_versions')
      .insert({
        workspace_id: input.workspaceId,
        brand_profile_id: input.brandProfileId || null,
        version_no: versionNo,
        snapshot: input.snapshot,
        changed_fields: input.changedFields || [],
        change_source: input.changeSource || 'user',
        change_reason: input.changeReason || null,
        created_by: input.createdBy || null,
      })
      .select('id, version_no')
      .maybeSingle();
  } catch (error: any) {
    if (!isMissingVersionTable(error)) {
      console.warn('[BrandBrain] Failed to record profile version:', error?.message || error);
    }
    return null;
  }

  const { data, error } = insertResult;
  if (error) {
    if (!isMissingVersionTable(error)) {
      console.warn('[BrandBrain] Failed to record profile version:', error.message);
    }
    return null;
  }

  return data;
}
