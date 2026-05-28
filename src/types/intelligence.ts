import type { Platform } from '@/types';

export type LearningEventType =
  | 'post_created'
  | 'post_updated'
  | 'post_deleted'
  | 'post_content_edited'
  | 'post_scheduled'
  | 'post_published'
  | 'post_status_changed'
  | 'platform_variant_created'
  | 'platform_variant_edited'
  | 'approval_requested'
  | 'ai_generated'
  | 'ai_regenerated'
  | 'hashtag_generated'
  | 'strategy_generated'
  | 'recommendation_accepted'
  | 'recommendation_dismissed'
  | 'recommendation_completed'
  | 'recommendation_marked_off_brand'
  | 'artifact_accepted'
  | 'artifact_ignored'
  | 'artifact_marked_off_brand'
  | 'ai_feedback_recorded'
  | 'brand_profile_updated'
  | 'metric_synced'
  | 'comment_received'
  | 'comment_replied'
  | 'approval_approved'
  | 'approval_rejected'
  | 'publish_started'
  | 'publish_succeeded'
  | 'publish_partial'
  | 'publish_failed'
  | 'publish_retry_scheduled'
  | 'prediction_generated'
  | 'calendar_ai_draft_created'
  | 'content_classified'
  | 'agent_task_queued'
  | 'agent_task_succeeded'
  | 'agent_task_failed'
  | 'agent_task_retry_scheduled'
  | 'agent_task_recovered'
  | 'agent_tasks_manual_process'
  | 'learning_backfilled'
  | 'analytics_backfilled'
  | 'knowledge_ingested';

export type BrandProfile = {
  id?: string;
  workspace_id?: string;
  voice: string;
  audience: string;
  products_offers: string[];
  content_pillars: string[];
  competitors: string[];
  do_rules: string[];
  dont_rules: string[];
  approved_examples: string[];
  rejected_examples: string[];
  platform_preferences: Partial<Record<Platform, string>>;
  knowledge_settings?: Record<string, unknown>;
  confidence_score?: number;
  updated_at?: string;
};

export type LeverageInsight = {
  id: string;
  type: 'growth' | 'content' | 'timing' | 'brand' | 'risk' | 'learning';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  source: string;
  actionLabel: string;
  action: 'create_draft' | 'push_calendar' | 'review_brand' | 'run_audit' | 'view_analytics';
  explanation?: AIExplanation;
};

export type ContentScore = {
  overall: number;
  brandFit: number;
  platformFit: Partial<Record<Platform, number>>;
  engagementPotential: number;
  safety: number;
  blockers: string[];
  suggestions: string[];
  explanation: string;
};

export type AIExplanation = {
  reasonSummary?: string;
  evidence?: string[];
  sourceSignals?: string[];
  confidenceScore?: number;
  confidenceBreakdown?: Record<string, unknown>;
  dataCaveats?: string[];
  expectedImpact?: string;
  recommendedAction?: string;
  targetPlatforms?: Platform[];
  contentPillar?: string | null;
  calendarAction?: string | null;
  generatedBy?: string;
  workerVersion?: string;
  promptVersion?: string;
  details?: Array<{ label: string; value: string }>;
};

export type CalendarStrategyActionType =
  | 'fill_empty_day'
  | 'create_strategy_draft'
  | 'create_pillar_balance_draft'
  | 'create_best_time_draft'
  | 'fill_platform_gap'
  | 'fill_campaign_gap';

export type CalendarStrategyAction = {
  id: string;
  type: CalendarStrategyActionType;
  title: string;
  description: string;
  scheduledAt: string;
  dateKey: string;
  platforms: Platform[];
  pillar?: string;
  recommendationId?: string;
  sourceArtifactId?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical' | string;
  confidence?: number;
  source?: string;
  slotType?: 'empty_day' | 'best_time' | 'pillar_gap' | 'platform_gap' | 'campaign_gap' | 'strategy';
  impact?: string;
  state?: 'recommended' | 'applied' | 'ignored' | 'blocked';
  blockedReason?: string | null;
  explanation?: AIExplanation;
};

export type CalendarStrategyHealth = {
  score: number;
  status: 'healthy' | 'needs_attention' | 'at_risk';
  emptyDays: number;
  underusedPillars: number;
  bestTimeSlots: number;
  platformGaps: number;
  campaignGaps: number;
  plannedDrafts: number;
  recommendations: number;
};

export type CalendarDayIntelligence = {
  dateKey: string;
  hasPosts: boolean;
  postCount: number;
  recommendedSlotCount: number;
  topActionIds: string[];
  labels: string[];
};

export type CalendarPlatformOpportunity = {
  platform: Platform;
  scheduledCount: number;
  publishedCount: number;
  recommendedActionId?: string;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
};

export type CalendarCampaignGap = {
  id: string;
  title: string;
  description: string;
  recommendedActionId?: string;
  pillar?: string | null;
  platforms: Platform[];
  priority: 'low' | 'medium' | 'high' | 'critical';
};

export type AIFeedbackTargetType =
  | 'strategy_recommendation'
  | 'agent_artifact'
  | 'content_prediction'
  | 'platform_variant'
  | 'calendar_suggestion'
  | 'approval_item'
  | 'ai_generation'
  | 'hashtag_set'
  | 'analytics_insight';

export type AIFeedbackActionType =
  | 'accept'
  | 'edit_accept'
  | 'ignore'
  | 'dismiss'
  | 'complete'
  | 'apply'
  | 'reject'
  | 'mark_off_brand';

export type AIFeedbackReasonType =
  | 'off_brand'
  | 'wrong_audience'
  | 'wrong_platform'
  | 'weak_evidence'
  | 'client_preference'
  | 'inaccurate'
  | 'already_handled'
  | 'not_useful'
  | 'other';

export type AIFeedbackRequest = {
  targetType: AIFeedbackTargetType;
  targetId?: string | null;
  action: AIFeedbackActionType;
  reasonType?: AIFeedbackReasonType | string | null;
  comment?: string | null;
  originalValue?: unknown;
  editedValue?: unknown;
  applyToBrandBrain?: boolean;
  metadata?: Record<string, unknown>;
};

export type AIFeedbackRecord = {
  id: string;
  workspace_id: string;
  actor_user_id?: string | null;
  target_type: string;
  target_id?: string | null;
  action: string;
  reason_type?: string | null;
  comment?: string | null;
  original_value?: unknown;
  edited_value?: unknown;
  apply_to_brand_brain?: boolean;
  brand_brain_update?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_at: string;
};

export type IntelligenceContext = {
  brandProfile: BrandProfile;
  selectedPlatforms: Platform[];
  campaignGoal?: string;
  contentPillars: string[];
  platformRules: Record<string, unknown>;
  recentTopPosts: unknown[];
  recentFailedPosts: unknown[];
  approvalPreferences: unknown[];
  feedbackSignals?: unknown[];
  similarPastExamples: unknown[];
  currentPerformanceSummary: Record<string, unknown>;
  audienceLanguage: string[];
  activeKnowledgeSources: unknown[];
};

export type AIContextPacket = {
  promptContext: string;
  contextMetadata: {
    usedBrandBrain: boolean;
    brandCompletion: number;
    contextSources: string[];
    selectedPlatforms: Platform[];
    campaignGoal?: string;
    contentPillar?: string;
    query?: string;
  };
  intelligenceContext: IntelligenceContext;
};
