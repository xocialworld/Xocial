import type { SupabaseClient } from '@supabase/supabase-js';
import { PLATFORM_CAPABILITIES } from '@/lib/platforms/capabilities';
import type { Platform } from '@/types';
import type { AIContextPacket, BrandProfile, IntelligenceContext } from '@/types/intelligence';
import { calculateBrandCompletion, normalizeTextList } from './learning';
import { rankKnowledgeRows } from './knowledge';

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

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function tokenize(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9#@]+/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 3 && !COMMON_WORDS.has(token));
}

const COMMON_WORDS = new Set([
  'this',
  'that',
  'with',
  'from',
  'have',
  'your',
  'about',
  'will',
  'into',
  'they',
  'them',
  'post',
  'content',
  'social',
]);

function contentText(content: unknown, platform?: string) {
  const record = asRecord(content);
  const preferred = platform ? asRecord(record[platform]) : {};
  const first = Object.values(record).find((value) => {
    const entry = asRecord(value);
    return typeof value === 'string' || typeof entry.text === 'string' || typeof entry.caption === 'string';
  });
  return String(
    preferred.text ||
      preferred.caption ||
      record.text ||
      record.caption ||
      asRecord(first).text ||
      asRecord(first).caption ||
      (typeof first === 'string' ? first : '')
  );
}

function extractAudienceLanguage(
  posts: unknown[],
  approvalSignals: unknown[],
  feedbackActions: unknown[]
) {
  const phrases = new Map<string, number>();
  const addTokens = (value: unknown, weight = 1) => {
    tokenize(value)
      .filter((token) => token.length <= 28)
      .forEach((token) => phrases.set(token, (phrases.get(token) || 0) + weight));
  };

  posts.forEach((post: any) => addTokens(contentText(post?.content), 1.2));
  approvalSignals.forEach((signal: any) => addTokens(`${signal?.comment || ''} ${JSON.stringify(signal?.metadata || {})}`, 1.4));
  feedbackActions.forEach((feedback: any) => addTokens(`${feedback?.comment || ''} ${JSON.stringify(feedback?.edited_value || {})}`, 1.6));

  return Array.from(phrases.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([phrase]) => phrase)
    .slice(0, 12);
}

function scorePostSimilarity(post: any, query: string, selectedPlatforms: Platform[]) {
  const platforms = Array.isArray(post?.platforms) ? post.platforms : [];
  const text = contentText(post?.content, selectedPlatforms[0]);
  const queryTokens = new Set(tokenize(query));
  const textTokens = tokenize(text);
  const tokenScore = textTokens.filter((token) => queryTokens.has(token)).length;
  const platformScore =
    selectedPlatforms.length === 0
      ? 0
      : platforms.filter((platform: Platform) => selectedPlatforms.includes(platform)).length * 2;
  const analytics = Array.isArray(post?.post_analytics) ? post.post_analytics : [];
  const performanceScore = analytics.reduce(
    (sum: number, item: any) => sum + Number(item.engagement || item.reach || item.impressions || 0),
    0
  );
  return tokenScore * 3 + platformScore + Math.min(5, Math.log10(performanceScore + 1));
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
  const [brandProfile, topPosts, failedPosts, knowledge, knowledgeChunks, outcomes, approvalSignals, feedbackActions] = await Promise.all([
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
      .from('knowledge_chunks')
      .select('id, document_id, chunk_index, content, embedding, metadata, created_at')
      .eq('workspace_id', input.workspaceId)
      .order('created_at', { ascending: false })
      .limit(60)
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
    supabase
      .from('ai_feedback_actions')
      .select('target_type, target_id, action, reason_type, comment, original_value, edited_value, brand_brain_update, metadata, created_at')
      .eq('workspace_id', input.workspaceId)
      .order('created_at', { ascending: false })
      .limit(30)
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

  const query = [
    input.query || '',
    input.campaignGoal || '',
    selectedPlatforms.join(' '),
    brandProfile.voice,
    brandProfile.audience,
    brandProfile.content_pillars.join(' '),
  ]
    .filter(Boolean)
    .join('\n');
  const rankedKnowledgeChunks = rankKnowledgeRows(knowledgeChunks as any[], query, 8).map((chunk: any) => ({
    id: chunk.id,
    document_id: chunk.document_id,
    title: chunk.metadata?.title || 'Knowledge chunk',
    document_type: chunk.metadata?.documentType || 'chunk',
    content: chunk.content,
    metadata: {
      ...(chunk.metadata || {}),
      relevanceScore: chunk.relevanceScore,
      source: 'knowledge_chunk',
    },
  }));
  const rankedKnowledge = rankedKnowledgeChunks.length
    ? rankedKnowledgeChunks
    : rankKnowledgeRows(knowledge as any[], query, 6);
  const similarPastExamples = [...topPosts]
    .map((post: any) => ({
      ...post,
      similarityScore: scorePostSimilarity(post, query, selectedPlatforms),
    }))
    .sort((a: any, b: any) => b.similarityScore - a.similarityScore)
    .slice(0, 6);
  const feedbackPreferences = (feedbackActions || []).map((feedback: any) => ({
    signalType: feedback.action,
    comment: feedback.comment,
    reasonType: feedback.reason_type,
    targetType: feedback.target_type,
    editedValue: feedback.edited_value,
    brandBrainUpdate: feedback.brand_brain_update,
    createdAt: feedback.created_at,
  }));

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
    approvalPreferences: [
      ...approvalSignals.map((signal: any) => ({
        signalType: signal.signal_type,
        comment: signal.comment,
        reasonSummary: signal.metadata?.reasonSummary,
        reasonLabels: signal.metadata?.reasonLabels || [],
        reasonCategories: signal.metadata?.reasonCategories || [],
        reasonHints: signal.metadata?.reasonHints || [],
        createdAt: signal.created_at,
      })),
      ...feedbackPreferences,
    ],
    feedbackSignals: feedbackPreferences,
    similarPastExamples,
    currentPerformanceSummary: performanceSummary,
    audienceLanguage: extractAudienceLanguage(topPosts, approvalSignals, feedbackActions),
    activeKnowledgeSources: rankedKnowledge,
  };
}

function truncate(value: string, max: number) {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, Math.max(0, max - 1)).trim()}...`;
}

function contentPreview(content: unknown, max = 240) {
  if (!content || typeof content !== 'object') return '';
  const entries = Object.values(content as Record<string, any>);
  const firstText = entries
    .map((entry) => (typeof entry === 'string' ? entry : entry?.text))
    .find((text): text is string => typeof text === 'string' && text.trim().length > 0);
  return firstText ? truncate(firstText, max) : '';
}

function listLine(label: string, values: unknown[], limit = 6) {
  const normalized = values.map((value) => String(value || '').trim()).filter(Boolean).slice(0, limit);
  return normalized.length ? `${label}: ${normalized.join('; ')}` : '';
}

function compactExamples(posts: unknown[], limit = 3) {
  return posts
    .slice(0, limit)
    .map((post: any) => {
      const text = contentPreview(post?.content);
      const platforms = Array.isArray(post?.platforms) ? post.platforms.join(', ') : '';
      return text ? `${platforms ? `[${platforms}] ` : ''}${text}` : '';
    })
    .filter(Boolean);
}

function compactKnowledge(sources: unknown[], limit = 4) {
  return sources
    .slice(0, limit)
    .map((source: any) => {
      const title = String(source?.title || source?.document_type || 'Knowledge source');
      const content = source?.content ? truncate(String(source.content), 220) : '';
      return content ? `${title}: ${content}` : title;
    })
    .filter(Boolean);
}

function compactApprovalPreferences(preferences: unknown[], limit = 5) {
  return preferences
    .slice(0, limit)
    .map((preference: any) => {
      const labels = Array.isArray(preference?.reasonLabels)
        ? preference.reasonLabels.join(', ')
        : '';
      const comment = preference?.comment ? truncate(String(preference.comment), 160) : '';
      return [preference?.signalType, labels, comment].filter(Boolean).join(' - ');
    })
    .filter(Boolean);
}

function compactPerformance(summary: Record<string, unknown>, limit = 6) {
  return Object.entries(summary || {})
    .slice(0, limit)
    .map(([platform, value]: [string, any]) => {
      const reason = value?.reason ? `: ${truncate(String(value.reason), 150)}` : '';
      const score = value?.score !== undefined ? ` score ${value.score}` : '';
      return `${platform}${score}${reason}`;
    });
}

export function formatAIContextForPrompt(
  context: IntelligenceContext,
  options: {
    contentPillar?: string;
    query?: string;
  } = {}
) {
  const brand = context.brandProfile;
  const lines = [
    'XOCIAL MEMORY CONTEXT',
    'Use this workspace memory to make the output sound like the actual brand. Do not mention memory, analytics, or Brand Brain to the user.',
    brand.voice ? `Brand voice: ${truncate(brand.voice, 500)}` : '',
    brand.audience ? `Audience: ${truncate(brand.audience, 500)}` : '',
    listLine('Products/offers', brand.products_offers, 6),
    listLine('Content pillars', brand.content_pillars, 8),
    options.contentPillar ? `Preferred content pillar: ${options.contentPillar}` : '',
    listLine('Competitors to be aware of', brand.competitors, 5),
    listLine('Brand do rules', brand.do_rules, 8),
    listLine('Brand do-not rules', brand.dont_rules, 8),
    brand.platform_preferences && Object.keys(brand.platform_preferences).length
      ? `Platform preferences: ${truncate(JSON.stringify(brand.platform_preferences), 900)}`
      : '',
    brand.approved_examples.length
      ? `Approved style examples:\n${brand.approved_examples.slice(0, 2).map((item) => `- ${truncate(item, 280)}`).join('\n')}`
      : '',
    brand.rejected_examples.length
      ? `Avoid rejected patterns:\n${brand.rejected_examples.slice(0, 2).map((item) => `- ${truncate(item, 220)}`).join('\n')}`
      : '',
    compactExamples(context.recentTopPosts).length
      ? `Recent winners:\n${compactExamples(context.recentTopPosts).map((item) => `- ${item}`).join('\n')}`
      : '',
    compactExamples(context.similarPastExamples, 3).length
      ? `Similar past examples:\n${compactExamples(context.similarPastExamples, 3).map((item) => `- ${item}`).join('\n')}`
      : '',
    compactExamples(context.recentFailedPosts, 2).length
      ? `Recent weak/failed examples to learn from:\n${compactExamples(context.recentFailedPosts, 2).map((item) => `- ${item}`).join('\n')}`
      : '',
    context.audienceLanguage.length
      ? `Audience language signals: ${context.audienceLanguage.slice(0, 10).join('; ')}`
      : '',
    compactApprovalPreferences(context.approvalPreferences).length
      ? `Approval preferences:\n${compactApprovalPreferences(context.approvalPreferences).map((item) => `- ${item}`).join('\n')}`
      : '',
    compactPerformance(context.currentPerformanceSummary).length
      ? `Performance summary:\n${compactPerformance(context.currentPerformanceSummary).map((item) => `- ${item}`).join('\n')}`
      : '',
    compactKnowledge(context.activeKnowledgeSources).length
      ? `Knowledge sources:\n${compactKnowledge(context.activeKnowledgeSources).map((item) => `- ${item}`).join('\n')}`
      : '',
    options.query ? `User request/query: ${truncate(options.query, 350)}` : '',
  ];

  return lines.filter(Boolean).join('\n');
}

export function getContextSources(context: IntelligenceContext) {
  const sources = ['platform_rules'];
  const brand = context.brandProfile;

  if (brand.confidence_score || brand.voice || brand.audience || brand.content_pillars.length) {
    sources.push('brand_profile');
  }
  if (context.recentTopPosts.length) sources.push('recent_top_posts');
  if (context.similarPastExamples.length) sources.push('similar_past_examples');
  if (context.recentFailedPosts.length) sources.push('recent_failed_posts');
  if (context.approvalPreferences.length) sources.push('approval_preferences');
  if (context.feedbackSignals?.length) sources.push('ai_feedback');
  if (context.audienceLanguage.length) sources.push('audience_language');
  if (Object.keys(context.currentPerformanceSummary || {}).length) sources.push('performance_summary');
  if (context.activeKnowledgeSources.length) sources.push('knowledge_sources');

  return sources;
}

export async function buildAIContextPacket(
  supabase: SupabaseClient,
  input: {
    workspaceId: string;
    selectedPlatforms?: Platform[];
    campaignGoal?: string;
    contentPillar?: string;
    query?: string;
  }
): Promise<AIContextPacket> {
  const intelligenceContext = await buildIntelligenceContext(supabase, input);
  return {
    promptContext: formatAIContextForPrompt(intelligenceContext, {
      contentPillar: input.contentPillar,
      query: input.query,
    }),
    contextMetadata: {
      usedBrandBrain: true,
      brandCompletion: Number(intelligenceContext.brandProfile.confidence_score || 0),
      contextSources: getContextSources(intelligenceContext),
      selectedPlatforms: intelligenceContext.selectedPlatforms,
      campaignGoal: input.campaignGoal,
      contentPillar: input.contentPillar,
      query: input.query,
    },
    intelligenceContext,
  };
}
