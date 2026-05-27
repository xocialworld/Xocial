import type { SupabaseClient } from '@supabase/supabase-js';
import { PLATFORM_CAPABILITIES } from '@/lib/platforms/capabilities';
import type { Platform } from '@/types';
import type { BrandProfile, IntelligenceContext } from '@/types/intelligence';
import { calculateBrandCompletion, normalizeTextList } from './learning';

export const EMPTY_BRAND_PROFILE: BrandProfile = {
  voice: '',
  audience: '',
  products_offers: [],
  content_pillars: [],
  competitors: [],
  do_rules: [],
  dont_rules: [],
  approved_examples: [],
  rejected_examples: [],
  platform_preferences: {},
  confidence_score: 0,
};

function isMissingTable(error: any) {
  const message = String(error?.message || '');
  return error?.code === '42P01' || error?.code === 'PGRST205' || message.includes('Could not find');
}

export function normalizeBrandProfile(row: any): BrandProfile {
  if (!row) return EMPTY_BRAND_PROFILE;
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    voice: row.voice || '',
    audience: row.audience || '',
    products_offers: normalizeTextList(row.products_offers),
    content_pillars: normalizeTextList(row.content_pillars),
    competitors: normalizeTextList(row.competitors),
    do_rules: normalizeTextList(row.do_rules),
    dont_rules: normalizeTextList(row.dont_rules),
    approved_examples: normalizeTextList(row.approved_examples),
    rejected_examples: normalizeTextList(row.rejected_examples),
    platform_preferences:
      row.platform_preferences && typeof row.platform_preferences === 'object'
        ? row.platform_preferences
        : {},
    knowledge_settings:
      row.knowledge_settings && typeof row.knowledge_settings === 'object'
        ? row.knowledge_settings
        : {},
    confidence_score: Number(row.confidence_score || calculateBrandCompletion(row)) || 0,
    updated_at: row.updated_at,
  };
}

export async function getBrandProfile(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<BrandProfile> {
  const { data, error } = await supabase
    .from('workspace_brand_profiles')
    .select('*')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error) {
    if (!isMissingTable(error)) {
      console.warn('[Intelligence] Failed to fetch brand profile:', error.message);
    }
    return EMPTY_BRAND_PROFILE;
  }

  return normalizeBrandProfile(data);
}

export async function buildIntelligenceContext(
  supabase: SupabaseClient,
  input: {
    workspaceId: string;
    selectedPlatforms?: Platform[];
    campaignGoal?: string;
    query?: string;
  }
): Promise<IntelligenceContext> {
  const [brandProfile, topPosts, failedPosts, knowledge, outcomes, approvalSignals] = await Promise.all([
    getBrandProfile(supabase, input.workspaceId),
    supabase
      .from('posts')
      .select('id, content, platforms, published_at, metadata, post_analytics(engagement, reach, impressions, platform)')
      .eq('workspace_id', input.workspaceId)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(8)
      .then(({ data, error }) => (error ? [] : data || [])),
    supabase
      .from('posts')
      .select('id, content, platforms, error_message, metadata, updated_at')
      .eq('workspace_id', input.workspaceId)
      .in('status', ['failed', 'partial'])
      .order('updated_at', { ascending: false })
      .limit(5)
      .then(({ data, error }) => (error ? [] : data || [])),
    supabase
      .from('knowledge_documents')
      .select('id, title, document_type, content, metadata')
      .eq('workspace_id', input.workspaceId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data, error }) => (error ? [] : data || [])),
    supabase
      .from('post_outcome_summaries')
      .select('platform, score, confidence, reason_summary')
      .eq('workspace_id', input.workspaceId)
      .order('generated_at', { ascending: false })
      .limit(10)
      .then(({ data, error }) => (error ? [] : data || [])),
    supabase
      .from('approval_learning_signals')
      .select('signal_type, comment, metadata, created_at')
      .eq('workspace_id', input.workspaceId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data, error }) => (error ? [] : data || [])),
  ]);

  const selectedPlatforms = input.selectedPlatforms || [];
  const performanceSummary = outcomes.reduce(
    (acc: Record<string, unknown>, outcome: any) => {
      acc[outcome.platform] = {
        score: outcome.score,
        confidence: outcome.confidence,
        reason: outcome.reason_summary,
      };
      return acc;
    },
    {}
  );

  return {
    brandProfile,
    selectedPlatforms,
    campaignGoal: input.campaignGoal,
    contentPillars: brandProfile.content_pillars,
    platformRules: selectedPlatforms.length
      ? selectedPlatforms.reduce((acc, platform) => {
          acc[platform] = PLATFORM_CAPABILITIES[platform];
          return acc;
        }, {} as Record<string, unknown>)
      : PLATFORM_CAPABILITIES,
    recentTopPosts: topPosts,
    recentFailedPosts: failedPosts,
    approvalPreferences: approvalSignals.map((signal: any) => ({
      signalType: signal.signal_type,
      comment: signal.comment,
      reasonSummary: signal.metadata?.reasonSummary,
      reasonLabels: signal.metadata?.reasonLabels || [],
      reasonCategories: signal.metadata?.reasonCategories || [],
      reasonHints: signal.metadata?.reasonHints || [],
      createdAt: signal.created_at,
    })),
    similarPastExamples: topPosts,
    currentPerformanceSummary: performanceSummary,
    audienceLanguage: [],
    activeKnowledgeSources: knowledge,
  };
}
