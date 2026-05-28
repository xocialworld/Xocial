/**
 * Vercel AI Gateway Integration for AI Content Generation
 * Provides content generation, refinement, and optimization via Vercel AI SDK
 */

import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import type { Platform } from '@/types';
import { DEFAULT_AI_MODEL } from '@/lib/ai/models';
import { env } from '@/lib/env';
import {
  createXocialOpenAIProvider,
  resolveOpenAICompatibleModelId,
} from '@/lib/ai/gateway';
import type { AIContextPacket } from '@/types/intelligence';

// Initialize OpenAI provider with Vercel AI Gateway support.
// Prefer official AI Gateway keys/OIDC before the legacy custom gateway key.
const { openai, usesGateway } = createXocialOpenAIProvider();

const DEFAULT_PLATFORM: Platform = 'instagram';

// Model fallback configuration for gateway provider options
const MODEL_FALLBACKS: Record<string, string[]> = {
  'openai/gpt-4o': ['openai/gpt-4o-mini', 'anthropic/claude-3-5-sonnet'],
  'openai/gpt-4o-mini': ['google/gemini-1.5-flash'],
  'anthropic/claude-3-5-sonnet': ['openai/gpt-4o'],
  'google/gemini-1.5-flash': ['openai/gpt-4o-mini'],
  'google/gemini-1.5-pro': ['openai/gpt-4o'],
  'anthropic/claude-3-haiku': ['openai/gpt-4o-mini'],
  'meta/llama-3.1-70b-instruct': ['openai/gpt-4o-mini'],
  'mistral/mistral-large': ['openai/gpt-4o'],
  'deepseek/deepseek-chat': ['openai/gpt-4o-mini'],
};

export type AITone =
  | 'professional'
  | 'casual'
  | 'friendly'
  | 'enthusiastic'
  | 'informative'
  | 'playful'
  | 'inspirational'
  | 'educational';

export type AIStyle =
  | 'informative'
  | 'storytelling'
  | 'educational'
  | 'promotional'
  | 'playful';

export type AILength = 'short' | 'medium' | 'long';

export interface GenerateContentRequest {
  prompt: string;
  platforms?: Platform[];
  platform?: Platform;
  tone?: AITone;
  style?: AIStyle;
  audience?: string;
  length?: AILength;
  addEmojis?: boolean;
  addHashtags?: boolean;
  addCTA?: boolean;
  maxLength?: number;
  model?: string;
  userId?: string;
  intelligenceContext?: {
    promptContext?: string;
    contextMetadata?: AIContextPacket['contextMetadata'];
    brandProfile?: {
      voice?: string;
      audience?: string;
      products_offers?: string[];
      content_pillars?: string[];
      do_rules?: string[];
      dont_rules?: string[];
      approved_examples?: string[];
      rejected_examples?: string[];
      platform_preferences?: Record<string, unknown>;
    };
    recentTopPosts?: unknown[];
    recentFailedPosts?: unknown[];
    currentPerformanceSummary?: Record<string, unknown>;
    campaignGoal?: string;
    contentPillar?: string;
  };
}

type PromptContextInput = {
  promptContext?: string;
  contextMetadata?: AIContextPacket['contextMetadata'];
};

export interface GeneratedContent {
  text: string;
  hashtags?: string[];
  mentions?: string[];
  estimatedCharCount: number;
  suggestions?: string[];
  callToAction?: string;
  recommendedPostTime?: string;
  summary?: string;
  keyPoints?: string[];
}

export interface PlatformContentResult extends GeneratedContent {
  platform: Platform;
  tone?: string;
  style?: string;
}

export interface GenerateContentResult {
  platformContent: Partial<Record<Platform, PlatformContentResult>>;
  hashtags: string[];
  summary: {
    tone?: string;
    style?: string;
    highlights?: string[];
  };
  analytics: {
    totalCharCount: number;
    averageCharCount: number;
    perPlatform: Partial<Record<
      Platform,
      {
        charCount: number;
        hashtagCount: number;
        emojiCount: number;
      }
    >>;
  };
  model: string;
  tokenUsage: number;
}

type ChunkCallback = (payload: { platform: Platform; chunk: string }) => void;

const platformContentSchema = z.object({
  text: z.string().min(1, 'Content must not be empty'),
  hashtags: z.array(z.string()).optional(),
  mentions: z.array(z.string()).optional(),
  key_points: z.array(z.string()).optional(),
  call_to_action: z.string().optional(),
  recommended_post_time: z.string().optional(),
  tone: z.string().optional(),
  style: z.string().optional(),
  summary: z.string().optional(),
}).passthrough();

const generatedJsonSchema = z.object({
  platform_content: z.record(platformContentSchema),
  hashtags: z.array(z.string()).optional(),
  summary: z.object({
    tone: z.string().optional(),
    style: z.string().optional(),
    highlights: z.array(z.string()).optional(),
  }).optional(),
}).passthrough();

function extractAIErrorMessage(error: unknown): string {
  if (!error) return 'Unknown error from AI Gateway.';
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  const err = error as Record<string, any>;
  return (
    err?.error?.message ??
    err?.message ??
    err?.error?.code ??
    'AI Gateway request failed. Please retry.'
  );
}

function getProviderOrder() {
  return (env.VERCEL_AI_GATEWAY_ORDER || 'openai')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
}

function resolveModelId(id: string) {
  return resolveOpenAICompatibleModelId(id, usesGateway);
}

function getFallbackModels(modelId: string) {
  return MODEL_FALLBACKS[modelId] || MODEL_FALLBACKS[`openai/${modelId}`] || [];
}

function extractJsonObject(rawText: string): unknown {
  const trimmed = rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = trimmed.indexOf('{');

  if (start === -1) {
    throw new Error('AI returned text without a JSON object.');
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < trimmed.length; i += 1) {
    const char = trimmed[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(trimmed.slice(start, i + 1));
      }
    }
  }

  throw new Error('AI returned incomplete JSON.');
}

function hasMatchingPlatformKeys(payload: z.infer<typeof generatedJsonSchema>, platforms: Platform[]) {
  const contentKeys = Object.keys(payload.platform_content || {}).map((key) =>
    key.toLowerCase().replace(/[^a-z]/g, '')
  );
  const targetKeys = platforms.map((platform) => platform.toLowerCase().replace(/[^a-z]/g, ''));

  return targetKeys.some((target) =>
    contentKeys.some((key) => key.includes(target) || target.includes(key))
  );
}

/**
 * Platform-specific content guidelines
 */
const PLATFORM_GUIDELINES = {
  facebook: {
    maxLength: 63206,
    optimal: '80-100',
    format: 'longer form content with storytelling',
    bestPractices: ['Use compelling first line', 'Break into paragraphs', 'Include call-to-action'],
  },
  instagram: {
    maxLength: 2200,
    optimal: '125-150',
    format: 'visual-first with engaging captions',
    bestPractices: ['Start with hook', 'Use line breaks', 'Include emojis', 'Add relevant hashtags (5-10)'],
  },
  twitter: {
    maxLength: 280,
    optimal: '100-150',
    format: 'concise and punchy',
    bestPractices: ['Get to the point quickly', 'Use hashtags sparingly (1-2)', 'Include media when possible'],
  },
  linkedin: {
    maxLength: 3000,
    optimal: '150-200',
    format: 'professional and value-driven',
    bestPractices: ['Start with key insight', 'Provide value', 'Professional tone', 'Include call-to-action'],
  },
  tiktok: {
    maxLength: 2200,
    optimal: '100-150',
    format: 'trending and engaging',
    bestPractices: ['Use trending sounds/hashtags', 'Hook in first 3 seconds', 'Clear CTA'],
  },
  youtube: {
    maxLength: 5000,
    optimal: '200-300',
    format: 'descriptive with SEO',
    bestPractices: ['Frontload key info', 'Include timestamps', 'Add keywords', 'Clear CTA'],
  },
};

const LENGTH_GUIDELINES: Record<AILength, { description: string; maxTokens: number }> = {
  short: {
    description: 'Keep it concise (under ~120 words).',
    maxTokens: 320,
  },
  medium: {
    description: 'Balanced detail (~150-220 words).',
    maxTokens: 500,
  },
  long: {
    description: 'More context and storytelling (220+ words).',
    maxTokens: 650,
  },
};

/**
 * Generate platform-specific content using Vercel AI Gateway
 */
export async function generateContent(
  request: GenerateContentRequest,
  options?: { onChunk?: ChunkCallback }
): Promise<GenerateContentResult> {
  const targetPlatforms =
    request.platforms ?? (request.platform ? [request.platform] : [DEFAULT_PLATFORM]);
  const resolvedModel = request.model ?? DEFAULT_AI_MODEL;
  const lengthDescription = request.length
    ? LENGTH_GUIDELINES[request.length]
    : LENGTH_GUIDELINES.medium;
  const systemPrompt = buildSystemPrompt(targetPlatforms, request, lengthDescription.description);

  try {
    const modelString = resolveModelId(resolvedModel);
    const fallbackModels = getFallbackModels(resolvedModel);
    const providerOrder = getProviderOrder();

    const execGenerateJson = async (model: string, retryCount = 0) => {
      const result = await generateText({
        model: openai(model),
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: retryCount === 0
              ? request.prompt
              : `${request.prompt}\n\nReturn only one valid JSON object with non-empty platform_content for: ${targetPlatforms.join(', ')}.`,
          },
        ],
        maxTokens: Math.min(
          1800,
          Math.max(500, lengthDescription.maxTokens * Math.max(1, targetPlatforms.length))
        ),
        temperature: 0.7,
        providerOptions: {
          gateway: {
            order: providerOrder.length ? providerOrder : ['openai'],
          },
          openai: {
            responseFormat: { type: 'json_object' },
          },
        },
      });

      try {
        const parsedJson = extractJsonObject(result.text || '');
        const payload = generatedJsonSchema.parse(parsedJson);
        const hasValidContent = Object.values(payload.platform_content || {}).some((pc) =>
          Boolean(pc?.text?.trim())
        );
        const hasMatchingKeys = hasMatchingPlatformKeys(payload, targetPlatforms);

        if ((!hasValidContent || !hasMatchingKeys) && retryCount < 1) {
          console.warn(
            `[AI] Generated content validation failed (empty: ${!hasValidContent}, no-match: ${!hasMatchingKeys}) for ${model}, retrying...`
          );
          return execGenerateJson(model, retryCount + 1);
        }

        if (!hasValidContent) {
          throw new Error('AI returned empty content.');
        }

        return { payload, result };
      } catch (error) {
        if (retryCount < 1) {
          console.warn(`[AI] Failed to parse generated JSON for ${model}, retrying.`, error);
          return execGenerateJson(model, retryCount + 1);
        }
        throw error;
      }
    };

    let result: Awaited<ReturnType<typeof execGenerateJson>> | undefined;
    let successfulModel = modelString;
    const attemptErrors: string[] = [];

    try {
      result = await execGenerateJson(modelString);
    } catch (e) {
      const message = extractAIErrorMessage(e);
      attemptErrors.push(`${modelString}: ${message}`);
      console.warn(`[AI] Primary model ${modelString} failed.`, e);
    }

    if (!result && fallbackModels.length) {
      for (const fb of fallbackModels) {
        const fbModel = resolveModelId(fb);
        try {
          result = await execGenerateJson(fbModel);
          successfulModel = fbModel;
          break;
        } catch (e) {
          const message = extractAIErrorMessage(e);
          attemptErrors.push(`${fbModel}: ${message}`);
          console.warn(`[AI] Fallback model ${fbModel} failed.`, e);
        }
      }
    }

    // Ultimate fallback to default model if not already tried
    const defaultModelId = resolveModelId(DEFAULT_AI_MODEL);
    const hasTriedDefault = modelString === defaultModelId || fallbackModels.some(fb => resolveModelId(fb) === defaultModelId);

    if (!result && !hasTriedDefault) {
      try {
        console.log(`[AI] Attempting ultimate fallback to ${defaultModelId}`);
        result = await execGenerateJson(defaultModelId);
        successfulModel = defaultModelId;
      } catch (e) {
        const message = extractAIErrorMessage(e);
        attemptErrors.push(`${defaultModelId}: ${message}`);
        console.warn(`[AI] Default model fallback failed.`, e);
      }
    }

    if (!result) {
      throw new Error(
        attemptErrors.length
          ? `AI generation failed after trying all configured models. ${attemptErrors[0]}`
          : 'AI generation failed after trying all configured models.'
      );
    }

    const payload = result.payload;


    // Normalize platform keys in payload to lowercase to handle AI capitalization errors
    const platformPayload: Record<string, any> = {};
    if (payload.platform_content) {
      Object.entries(payload.platform_content).forEach(([key, val]) => {
        // Normalize to lowercase and trim
        const cleanKey = key.toLowerCase().trim();
        platformPayload[cleanKey] = val;

        // Also try to map fuzzy keys like "facebook post" -> "facebook"
        targetPlatforms.forEach(target => {
          if (cleanKey.includes(target) && !platformPayload[target]) {
             platformPayload[target] = val;
          }
        });
      });
    }

    const platformContent: Partial<Record<Platform, PlatformContentResult>> = {};
    targetPlatforms.forEach((platform) => {
      // Try exact match, then fuzzy match
      let entry = platformPayload[platform] || platformPayload[platform.toLowerCase()];

      if (!entry) {
        const fuzzyKey = Object.keys(platformPayload).find(k => k.includes(platform));
        if (fuzzyKey) {
            entry = platformPayload[fuzzyKey];
        }
      }
      if (!entry) {
          const anyKey = Object.keys(platformPayload).find(k => platformPayload[k]?.text);
          if (anyKey) {
              entry = platformPayload[anyKey];
          }
      }
      entry = entry || { text: '' };
      const text: string = entry.text || '';

      if (text && options?.onChunk) {
        chunkString(text).forEach((chunk) => options.onChunk?.({ platform, chunk }));
      }

      const hashtags = Array.isArray(entry.hashtags)
        ? entry.hashtags.map((tag: string) => tag.replace('#', ''))
        : extractHashtags(text);
      const mentions = extractMentions(text);

      platformContent[platform] = {
        platform,
        text,
        hashtags: hashtags.length ? hashtags.slice(0, 12) : undefined,
        mentions: mentions.length ? mentions : undefined,
        estimatedCharCount: text.length,
        suggestions: entry.key_points,
        callToAction: entry.call_to_action,
        recommendedPostTime: entry.recommended_post_time,
        summary: entry.summary,
        keyPoints: entry.key_points,
        tone: entry.tone,
        style: entry.style,
      };
    });

    const aggregatedHashtags = Array.from(
      new Set(
        [
          ...(Array.isArray(payload.hashtags) ? payload.hashtags : []),
          ...Object.values(platformContent)
            .flatMap((content) => content?.hashtags ?? [])
            .filter(Boolean),
        ].map((tag) => String(tag).replace('#', ''))
      )
    ).slice(0, 25);

    const perPlatformAnalytics = targetPlatforms.reduce<
      Partial<
        Record<
          Platform,
          {
            charCount: number;
            hashtagCount: number;
            emojiCount: number;
          }
        >
      >
    >((acc, platform) => {
      const text = platformContent[platform]?.text ?? '';
      acc[platform] = {
        charCount: text.length,
        hashtagCount: platformContent[platform]?.hashtags?.length ?? 0,
        emojiCount: countEmojis(text),
      };
      return acc;
    }, {});

    const analyticsEntries = Object.values(perPlatformAnalytics).filter(
      (entry) => Boolean(entry && typeof (entry as any).charCount === 'number')
    ) as Array<{ charCount: number; hashtagCount?: number; emojiCount?: number }>;
    const totalCharCount = analyticsEntries.reduce((sum, entry) => sum + entry.charCount, 0);

    // Extract model info from provider metadata if available
    const modelUsed = (result.result as any).experimental_providerMetadata?.gateway?.routing?.finalProvider
      ? `${(result.result as any).experimental_providerMetadata.gateway.routing.finalProvider}/${successfulModel.split('/').pop()}`
      : successfulModel;

    return {
      platformContent,
      hashtags: aggregatedHashtags,
      summary: {
        tone: payload.summary?.tone ?? request.tone,
        style: payload.summary?.style ?? request.style,
        highlights:
          Array.isArray(payload.summary?.highlights) && payload.summary.highlights.length
            ? payload.summary.highlights
            : buildHighlights(platformContent),
      },
      analytics: {
        totalCharCount,
        averageCharCount: analyticsEntries.length
          ? totalCharCount / analyticsEntries.length
          : 0,
        perPlatform: perPlatformAnalytics,
      },
      model: modelUsed,
      tokenUsage: (result.result as any).usage?.totalTokens ?? 0,
    };
  } catch (error: any) {
    // Fallback to mock data in demo/preview mode if API fails (e.g. billing, rate limit)
    if (env.DEMO_PUBLISH === 'true') {
      console.warn('⚠️ AI Generation failed, falling back to mock data (DEMO_PUBLISH=true). Error:', error.message);
      return getMockContent(targetPlatforms, request);
    }
    const baseMessage = extractAIErrorMessage(error);
    console.error('[AI Generation Error]', baseMessage, error);
    throw new Error(baseMessage);
  }
}

function getMockContent(platforms: Platform[], request: GenerateContentRequest): GenerateContentResult {
  const platformContent: Partial<Record<Platform, PlatformContentResult>> = {};

  platforms.forEach(p => {
    platformContent[p] = {
      platform: p,
      text: `[DEMO] Generated caption for ${p} regarding "${request.prompt}". Tone: ${request.tone || 'neutral'}. #demo #ai`,
      hashtags: ['demo', 'ai', 'generated'],
      estimatedCharCount: 100,
      keyPoints: ['Demo point 1', 'Demo point 2'],
      callToAction: request.addCTA ? 'Click here!' : undefined,
      recommendedPostTime: 'Tomorrow at 10am',
      tone: request.tone,
      style: request.style,
    };
  });

  return {
    platformContent,
    hashtags: ['demo', 'ai', 'generated'],
    summary: {
      tone: request.tone,
      style: request.style,
      highlights: ['Generated in DEMO mode']
    },
    analytics: {
      totalCharCount: 100 * platforms.length,
      averageCharCount: 100,
      perPlatform: platforms.reduce((acc, p) => ({
        ...acc,
        [p]: { charCount: 100, hashtagCount: 3, emojiCount: 0 }
      }), {})
    },
    model: 'mock-model',
    tokenUsage: 0
  };
}

function buildSystemPrompt(
  platforms: Platform[],
  request: GenerateContentRequest,
  lengthDescription: string
) {
  const preferenceLines = [
    request.tone ? `Overall tone preference: ${request.tone}.` : '',
    request.style ? `Writing style preference: ${request.style}.` : '',
    request.audience ? `Target Audience: ${request.audience}.` : '',
    request.addCTA ? 'Every platform entry must include a clear CTA.' : '',
    request.addEmojis ? 'Use engaging emojis when appropriate (but do not overdo it).' : '',
    request.addHashtags
      ? 'Include relevant hashtags (Instagram: 5-10, other networks 1-3).'
      : 'Skip hashtags unless absolutely necessary.'
    ,
    request.maxLength ? `Global hard cap: ${request.maxLength} characters.` : '',
    lengthDescription,
  ]
    .filter(Boolean)
    .join('\n');

  const platformSections = platforms
    .map((platform) => {
      const guide = PLATFORM_GUIDELINES[platform];
      return `### ${platform.toUpperCase()}
- Maximum length: ${guide.maxLength} characters (optimal ${guide.optimal} words)
- Format: ${guide.format}
- Best practices: ${guide.bestPractices.join(', ')}`;
    })
    .join('\n\n');

  const context = request.intelligenceContext;
  const brand = context?.brandProfile;
  const intelligenceLines = [
    context?.campaignGoal ? `Campaign goal: ${context.campaignGoal}` : '',
    context?.contentPillar ? `Preferred content pillar: ${context.contentPillar}` : '',
    brand?.voice ? `Brand voice: ${brand.voice}` : '',
    brand?.audience ? `Brand audience: ${brand.audience}` : '',
    brand?.products_offers?.length ? `Products/offers: ${brand.products_offers.slice(0, 6).join(', ')}` : '',
    brand?.content_pillars?.length ? `Content pillars: ${brand.content_pillars.slice(0, 8).join(', ')}` : '',
    brand?.do_rules?.length ? `Brand do rules: ${brand.do_rules.slice(0, 8).join('; ')}` : '',
    brand?.dont_rules?.length ? `Brand do-not rules: ${brand.dont_rules.slice(0, 8).join('; ')}` : '',
    brand?.approved_examples?.length
      ? `Approved example style: ${brand.approved_examples.slice(0, 2).join('\n---\n')}`
      : '',
    brand?.rejected_examples?.length
      ? `Avoid rejected example patterns: ${brand.rejected_examples.slice(0, 2).join('\n---\n')}`
      : '',
    context?.currentPerformanceSummary && Object.keys(context.currentPerformanceSummary).length
      ? `Recent performance summary: ${JSON.stringify(context.currentPerformanceSummary).slice(0, 1200)}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const schemaExample = `{
  "platform_content": {
    "instagram": {
      "text": "full caption text",
      "call_to_action": "string",
      "hashtags": ["tag1","tag2"],
      "tone": "casual",
      "style": "storytelling",
      "summary": "single-sentence recap",
      "key_points": ["point one","point two"],
      "recommended_post_time": "Tuesday 10am"
    }
  },
  "hashtags": ["shared","tags"],
  "summary": {
    "tone": "friendly",
    "style": "informative",
    "highlights": ["CTA: Join waitlist"]
  }
}`;

  const sharedPromptContext = context?.promptContext;

  return `You are Xocial's Expert Social Media Strategist, capable of turning even the vaguest ideas into professional, attention-grabbing content for multiple platforms.

YOUR CORE MISSION:
1. Interpret the user's prompt creatively. If it's vague (e.g., "sales post"), expand on it significantly based on the requested tone and audience. NEVER return empty content.
2. Adapt perfectly to each platform's unique culture (e.g., LinkedIn = professional value, TikTok = trending/hook-heavy).
3. Ensure every post has a strong "Hook" (first line) and a clear "Call to Action" (CTA).
4. Respect the requested Tone: ${request.tone || 'professional'} and Audience: ${request.audience || 'general'}.

SPECIFIC INSTRUCTIONS:
- If the prompt is too short, invent plausible details that fit the context to make the post complete and ready to publish.
- Use engaging formatting (line breaks, bullet points) where appropriate.
- For "professional" tone, avoid buzzwords but sound authoritative.
- For "casual/playful" tone, feel free to use idioms and conversational language.

${preferenceLines}

${platformSections}

${sharedPromptContext || intelligenceLines ? `${sharedPromptContext || `XOCIAL MEMORY CONTEXT:\n${intelligenceLines}`}\n\nUse this memory to sound like the user's actual brand. Do not mention that you used memory or analytics.` : ''}

Return a single JSON object EXACTLY matching this structure (no extra commentary, no markdown formatting).
DO NOT wrap the response in \`\`\`json ... \`\`\`. Return RAW JSON only.

${schemaExample}

- Use the platform keys "${platforms.join('", "')}" in "platform_content" (MUST be lowercase).
- Ensure "text" field is NEVER empty. If you are unsure, generate a high-quality generic post about the topic.
- Keep hashtag strings without the leading # character.
- recommended_post_time should be a short friendly string.`;
}

function extractHashtags(text: string) {
  const hashtagRegex = /#[\w]+/g;
  return text.match(hashtagRegex)?.map((tag) => tag.slice(1)) || [];
}

function extractMentions(text: string) {
  const mentionRegex = /@[\w]+/g;
  return text.match(mentionRegex)?.map((mention) => mention.slice(1)) || [];
}

function chunkString(value: string, size: number = 80) {
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += size) {
    chunks.push(value.slice(i, i + size));
  }
  return chunks;
}

function countEmojis(value: string) {
  const match = value.match(/\p{Extended_Pictographic}/gu);
  return match ? match.length : 0;
}

function buildHighlights(content: Partial<Record<Platform, PlatformContentResult>>) {
  const highlights = new Set<string>();
  Object.values(content).forEach((entry) => {
    entry?.keyPoints?.forEach((point) => highlights.add(point));
    if (entry?.callToAction) {
      highlights.add(`CTA: ${entry.callToAction}`);
    }
  });
  return Array.from(highlights).slice(0, 6);
}

/**
 * Refine existing content with specific instructions
 */
export async function refineContent(
  originalContent: string,
  platform: string,
  refinementType: 'shorter' | 'longer' | 'more_emojis' | 'more_professional' | 'more_casual' | 'add_urgency' | 'custom',
  customInstruction?: string,
  options: PromptContextInput = {}
): Promise<string> {
  const refinementInstructions = {
    shorter: 'Make this content more concise while keeping the main message.',
    longer: 'Expand this content with more details and context.',
    more_emojis: 'Add more relevant emojis to make it more engaging.',
    more_professional: 'Rewrite this in a more professional tone.',
    more_casual: 'Rewrite this in a more casual, friendly tone.',
    add_urgency: 'Add urgency and a stronger call-to-action.',
    custom: customInstruction?.trim() || 'Improve this content while keeping the main message.',
  };

  try {
    const providerOrder = getProviderOrder();

    const result = await generateText({
      model: openai(resolveModelId('openai/gpt-4o')),
      messages: [
        {
          role: 'system',
          content: [
            `You are refining social media content for ${platform}. ${refinementInstructions[refinementType]} Keep the content platform-appropriate and preserve the core intent.`,
            options.promptContext
              ? `${options.promptContext}\n\nFollow this memory closely, especially brand voice, audience, platform preferences, approved examples, and do-not rules.`
              : '',
          ]
            .filter(Boolean)
            .join('\n\n'),
        },
        { role: 'user', content: originalContent },
      ],
      maxTokens: 500,
      temperature: 0.7,
      providerOptions: {
        gateway: {
          order: providerOrder.length ? providerOrder : ['openai'],
        },
      },
    });

    return result.text || originalContent;
  } catch (error: any) {
    const detail = extractAIErrorMessage(error);
    throw new Error(`Failed to refine content: ${detail}`);
  }
}

/**
 * Generate hashtag suggestions for content
 */
export async function generateHashtags(
  content: string,
  platform: string,
  count: number = 5,
  options: PromptContextInput & { intent?: string } = {}
): Promise<string[]> {
  try {
    const providerOrder = getProviderOrder();

    const result = await generateText({
      model: openai(resolveModelId('openai/gpt-4o-mini')),
      messages: [
        {
          role: 'system',
          content: [
            `Generate ${count} relevant, platform-appropriate hashtags for ${platform} based on the content. Return only the hashtags without the # symbol, one per line.`,
            options.intent ? `Hashtag intent: ${options.intent}` : '',
            options.promptContext
              ? `${options.promptContext}\n\nUse Brand Brain pillars, audience language, past winners, and do-not rules. Avoid off-brand, competitor, banned, or irrelevant hashtags.`
              : '',
          ]
            .filter(Boolean)
            .join('\n\n'),
        },
        { role: 'user', content },
      ],
      maxTokens: 100,
      temperature: 0.7,
      providerOptions: {
        gateway: {
          order: providerOrder.length ? providerOrder : ['openai'],
        },
      },
    });

    const response = result.text || '';
    return response.split('\n').filter(tag => tag.trim()).map(tag => tag.trim().replace('#', ''));
  } catch (error: any) {
    const detail = extractAIErrorMessage(error);
    throw new Error(`Failed to generate hashtags: ${detail}`);
  }
}

/**
 * Analyze content sentiment and provide suggestions
 */
export async function analyzeContent(content: string, options: PromptContextInput & { platforms?: string[] } = {}): Promise<{
  sentiment: 'positive' | 'neutral' | 'negative';
  readability: 'easy' | 'moderate' | 'difficult';
  suggestions: string[];
}> {
  const analysisSchema = z.object({
    sentiment: z.enum(['positive', 'neutral', 'negative']),
    readability: z.enum(['easy', 'moderate', 'difficult']),
    suggestions: z.array(z.string()),
  });

  try {
    const result = await generateObject({
      model: openai(resolveModelId('openai/gpt-4o-mini')),
      schema: analysisSchema,
      messages: [
        {
          role: 'system',
          content: `Analyze this social media content and provide:
1. Sentiment (positive/neutral/negative)
2. Readability (easy/moderate/difficult)
3. 3 specific improvement suggestions
${options.platforms?.length ? `Target platforms: ${options.platforms.join(', ')}` : ''}
${options.promptContext ? `\n${options.promptContext}\n\nEvaluate whether the content fits the Brand Brain voice, audience, platform preferences, and do-not rules.` : ''}`,
        },
        { role: 'user', content },
      ],
      maxTokens: 300,
      temperature: 0.3,
      providerOptions: {
        gateway: {
          order: getProviderOrder().length ? getProviderOrder() : ['openai'],
        },
      },
    });

    return result.object;
  } catch (error: any) {
    return {
      sentiment: 'neutral',
      readability: 'moderate',
      suggestions: ['Unable to analyze content at this time'],
    };
  }
}

/**
 * Generate content variations
 */
export async function generateVariations(
  originalContent: string,
  platform: string,
  count: number = 3,
  options: PromptContextInput = {}
): Promise<string[]> {
  try {
    const providerOrder = getProviderOrder();

    const result = await generateText({
      model: openai(resolveModelId('openai/gpt-4o')),
      messages: [
        {
          role: 'system',
          content: `Generate ${count} different variations of this ${platform} post. Each variation should:
- Maintain the core message
- Use different wording and structure
- Be optimized for ${platform}
- Be numbered (1., 2., 3., etc.)
${options.promptContext ? `\n${options.promptContext}\n\nAll variations must follow the workspace Brand Brain and avoid do-not rules.` : ''}

Separate each variation with a blank line.`,
        },
        { role: 'user', content: originalContent },
      ],
      maxTokens: 800,
      temperature: 0.8,
      providerOptions: {
        gateway: {
          order: providerOrder.length ? providerOrder : ['openai'],
        },
      },
    });

    const response = result.text || '';
    const variations = response.split(/\n\s*\n/).filter(v => v.trim());
    return variations.map(v => v.replace(/^\d+\.\s*/, '').trim());
  } catch (error: any) {
    const detail = extractAIErrorMessage(error);
    throw new Error(`Failed to generate variations: ${detail}`);
  }
}
