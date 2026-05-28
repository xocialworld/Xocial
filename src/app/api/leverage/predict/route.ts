import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withErrorHandler, successResponse, validateRequest } from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { buildAIContextPacket } from '@/lib/intelligence/context';
import { recordLearningEvent } from '@/lib/intelligence/learning';
import type { Platform } from '@/types';
import type { AIExplanation, ContentScore, IntelligenceContext } from '@/types/intelligence';

export const dynamic = 'force-dynamic';

const platformEnum = z.enum([
  'facebook',
  'instagram',
  'twitter',
  'linkedin',
  'tiktok',
  'youtube',
]);

const predictionSchema = z.object({
  content: z.string().min(10, 'Content must be at least 10 characters'),
  platforms: z.array(platformEnum).min(1).default(['instagram']),
  campaignGoal: z.string().optional(),
});

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function countMatches(content: string, terms: string[]) {
  const lower = content.toLowerCase();
  return terms.filter((term) => term && lower.includes(term.toLowerCase())).length;
}

function platformLengthScore(content: string, platform: Platform) {
  const length = content.length;
  const ideal: Record<Platform, { min: number; max: number; hard: number }> = {
    instagram: { min: 80, max: 700, hard: 2200 },
    facebook: { min: 80, max: 900, hard: 63206 },
    twitter: { min: 40, max: 220, hard: 280 },
    linkedin: { min: 120, max: 1200, hard: 3000 },
    tiktok: { min: 40, max: 220, hard: 2200 },
    youtube: { min: 120, max: 900, hard: 5000 },
  };
  const rule = ideal[platform];

  if (length > rule.hard) return 15;
  if (length >= rule.min && length <= rule.max) return 92;
  if (length < rule.min) return 68;
  return clampScore(92 - ((length - rule.max) / rule.max) * 45);
}

function scoreContent(
  content: string,
  platforms: Platform[],
  context: IntelligenceContext
): ContentScore {
  const { brandProfile } = context;
  const pillarMatches = countMatches(content, brandProfile.content_pillars);
  const productMatches = countMatches(content, brandProfile.products_offers);
  const doRuleMatches = countMatches(content, brandProfile.do_rules);
  const dontRuleMatches = countMatches(content, brandProfile.dont_rules);
  const competitorMatches = countMatches(content, brandProfile.competitors);
  const hasQuestion = /\?/.test(content);
  const hasCTA = /\b(comment|reply|share|save|follow|subscribe|book|join|try|learn|download|dm)\b/i.test(
    content
  );
  const hasHashtag = /#[a-z0-9_]+/i.test(content);
  const hasHook = content.trim().split(/\s+/).slice(0, 12).join(' ').length <= 90;

  const brandFit = clampScore(
    45 +
      Math.min(24, pillarMatches * 8) +
      Math.min(16, productMatches * 8) +
      Math.min(16, doRuleMatches * 4) -
      Math.min(30, dontRuleMatches * 12) -
      Math.min(15, competitorMatches * 5)
  );

  const platformFit = platforms.reduce(
    (acc, platform) => {
      acc[platform] = platformLengthScore(content, platform);
      return acc;
    },
    {} as Partial<Record<Platform, number>>
  );

  const averagePlatformFit =
    Object.values(platformFit).reduce((sum, value) => sum + (value || 0), 0) / platforms.length;

  const engagementPotential = clampScore(
    48 +
      (hasHook ? 12 : 0) +
      (hasQuestion ? 10 : 0) +
      (hasCTA ? 14 : 0) +
      (hasHashtag ? 6 : 0) +
      Math.min(10, content.split('\n').filter(Boolean).length * 2)
  );

  const safety = clampScore(96 - dontRuleMatches * 15 - competitorMatches * 4);
  const overall = clampScore(
    brandFit * 0.32 + averagePlatformFit * 0.26 + engagementPotential * 0.27 + safety * 0.15
  );

  const blockers: string[] = [];
  const suggestions: string[] = [];

  if (dontRuleMatches > 0) {
    blockers.push('Content appears to match one or more Brand Brain do-not rules.');
  }
  if (platforms.includes('twitter') && content.length > 280) {
    blockers.push('Twitter/X copy exceeds 280 characters.');
  }
  if (!hasCTA) {
    suggestions.push('Add one clear call to action so the post has a measurable next step.');
  }
  if (!hasQuestion && platforms.some((platform) => ['instagram', 'facebook', 'linkedin'].includes(platform))) {
    suggestions.push('Ask a focused question to invite comments on community-driven platforms.');
  }
  if (pillarMatches === 0 && brandProfile.content_pillars.length > 0) {
    suggestions.push('Tie the post to one saved content pillar for stronger brand consistency.');
  }
  if (!hasHashtag && platforms.some((platform) => ['instagram', 'tiktok', 'youtube'].includes(platform))) {
    suggestions.push('Add a small hashtag set for discovery-oriented platforms.');
  }

  return {
    overall,
    brandFit,
    platformFit,
    engagementPotential,
    safety,
    blockers,
    suggestions,
    explanation:
      blockers.length > 0
        ? 'The score is held back by brand or platform blockers that should be fixed before publishing.'
        : 'The score combines brand alignment, platform length fit, engagement cues, and safety checks.',
  };
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const input = await validateRequest(request, predictionSchema);
  const { serviceClient, workspaceId, user } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager', 'creator', 'analyst'],
  });
  const platforms = (input.platforms?.length ? input.platforms : ['instagram']) as Platform[];

  const aiContextPacket = await buildAIContextPacket(serviceClient, {
    workspaceId,
    selectedPlatforms: platforms,
    campaignGoal: input.campaignGoal,
    query: input.content,
  });
  const context = aiContextPacket.intelligenceContext;
  const score = scoreContent(input.content, platforms, context);
  const explanation: AIExplanation = {
    reasonSummary: score.explanation,
    evidence: [
      `Brand fit: ${score.brandFit}%.`,
      `Engagement potential: ${score.engagementPotential}%.`,
      `Safety score: ${score.safety}%.`,
      `${platforms.length} selected platform${platforms.length === 1 ? '' : 's'} evaluated.`,
    ],
    confidenceScore: score.overall / 100,
    targetPlatforms: platforms,
    dataCaveats: aiContextPacket.contextMetadata.contextSources.length
      ? []
      : ['More published posts, synced metrics, and approval feedback will improve future scoring.'],
    generatedBy: 'engagement_predictor',
    promptVersion: 'leverage.predict.v1',
  };

  await recordLearningEvent(serviceClient, {
    workspaceId,
    actorUserId: user.id,
    source: 'xocial_ai',
    eventType: 'prediction_generated',
    entityType: 'content_prediction',
    signalStrength: 0.6,
    metadata: {
      platforms,
      score: score.overall,
      blockers: score.blockers,
      contextMetadata: aiContextPacket.contextMetadata,
      explanation,
    },
  });

  return successResponse({
    score,
    explanation,
    context: {
      brandProfile: context.brandProfile,
      selectedPlatforms: context.selectedPlatforms,
      contentPillars: context.contentPillars,
      recentTopPosts: context.recentTopPosts.slice(0, 3),
      currentPerformanceSummary: context.currentPerformanceSummary,
      contextMetadata: aiContextPacket.contextMetadata,
    },
  });
});
