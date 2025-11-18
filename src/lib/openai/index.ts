/**
 * Vercel AI Gateway Integration for AI Content Generation
 * Provides content generation, refinement, and optimization via Vercel AI SDK
 */

import { generateObject, generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import type { Platform } from '@/types';
import { DEFAULT_AI_MODEL } from '@/lib/ai/models';
import { env } from '@/lib/env';

// Initialize OpenAI provider through Vercel AI Gateway
const gatewayOpenAI = createOpenAI({
  baseURL: `${env.VERCEL_AI_GATEWAY_URL}/v1`,
  apiKey: env.VERCEL_AI_GATEWAY_API_KEY,
});

const DEFAULT_PLATFORM: Platform = 'instagram';

// Model fallback configuration for gateway provider options
const MODEL_FALLBACKS: Record<string, string[]> = {
  'gpt-4o': ['openai/gpt-4o', 'openai/gpt-4o-mini'],
  'gpt-4o-mini': ['openai/gpt-4o-mini', 'openai/gpt-3.5-turbo'],
  'gpt-3.5-turbo': ['openai/gpt-3.5-turbo'],
};

export type AITone =
  | 'professional'
  | 'casual'
  | 'friendly'
  | 'enthusiastic'
  | 'informative';

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
  length?: AILength;
  addEmojis?: boolean;
  addHashtags?: boolean;
  addCTA?: boolean;
  maxLength?: number;
  model?: string;
}

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

  // Build Zod schema for structured output
  const platformContentSchema = z.object({
    text: z.string(),
    call_to_action: z.string().optional(),
    hashtags: z.array(z.string()).optional(),
    tone: z.string().optional(),
    style: z.string().optional(),
    summary: z.string().optional(),
    key_points: z.array(z.string()).optional(),
    recommended_post_time: z.string().optional(),
  });

  const platformsRecord = targetPlatforms.reduce((acc, platform) => {
    acc[platform] = platformContentSchema;
    return acc;
  }, {} as Record<string, typeof platformContentSchema>);

  const responseSchema = z.object({
    platform_content: z.object(platformsRecord),
    hashtags: z.array(z.string()).optional(),
    summary: z.object({
      tone: z.string().optional(),
      style: z.string().optional(),
      highlights: z.array(z.string()).optional(),
    }).optional(),
  });

  try {
    // Prepare model string with provider prefix for gateway
    const modelString = resolvedModel.includes('/') ? resolvedModel : `openai/${resolvedModel}`;
    
    // Get fallback models if available
    const fallbackModels = MODEL_FALLBACKS[resolvedModel] || [];

    const providerOrder = (env.VERCEL_AI_GATEWAY_ORDER || 'openai')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const execGenerateObject = async (model: string) =>
      generateObject({
        model: gatewayOpenAI(model),
        schema: responseSchema,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: request.prompt },
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
        },
      });

    let result = await execGenerateObject(modelString);
    if (!result?.object && fallbackModels.length) {
      for (const fb of fallbackModels) {
        const fbModel = fb.includes('/') ? fb : `openai/${fb}`;
        try {
          result = await execGenerateObject(fbModel);
          if (result?.object) break;
        } catch {}
      }
    }

    const payload = result.object;
    const platformPayload = payload.platform_content;

    const platformContent: Partial<Record<Platform, PlatformContentResult>> = {};
    targetPlatforms.forEach((platform) => {
      const entry = platformPayload[platform] || { text: '' };
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
    const modelUsed = (result as any).experimental_providerMetadata?.gateway?.routing?.finalProvider 
      ? `${(result as any).experimental_providerMetadata.gateway.routing.finalProvider}/${resolvedModel}`
      : modelString;

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
      tokenUsage: result.usage?.totalTokens ?? 0,
    };
  } catch (error: any) {
    const baseMessage = extractAIErrorMessage(error);
    throw new Error(baseMessage);
  }
}

function buildSystemPrompt(
  platforms: Platform[],
  request: GenerateContentRequest,
  lengthDescription: string
) {
  const preferenceLines = [
    request.tone ? `Overall tone preference: ${request.tone}.` : '',
    request.style ? `Writing style preference: ${request.style}.` : '',
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

  return `You are an expert social media strategist creating content for multiple platforms simultaneously.

${preferenceLines}

${platformSections}

Return a single JSON object EXACTLY matching this structure (no extra commentary):
${schemaExample}

- Use the platform keys "${platforms.join('", "')}" in "platform_content".
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
  refinementType: 'shorter' | 'longer' | 'more_emojis' | 'more_professional' | 'more_casual' | 'add_urgency'
): Promise<string> {
  const refinementInstructions = {
    shorter: 'Make this content more concise while keeping the main message.',
    longer: 'Expand this content with more details and context.',
    more_emojis: 'Add more relevant emojis to make it more engaging.',
    more_professional: 'Rewrite this in a more professional tone.',
    more_casual: 'Rewrite this in a more casual, friendly tone.',
    add_urgency: 'Add urgency and a stronger call-to-action.',
  };

  try {
    const providerOrder = (env.VERCEL_AI_GATEWAY_ORDER || 'openai')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const result = await generateText({
      model: gatewayOpenAI('openai/gpt-4o'),
      messages: [
        {
          role: 'system',
          content: `You are refining social media content for ${platform}. ${refinementInstructions[refinementType]}`,
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
  count: number = 5
): Promise<string[]> {
  try {
    const providerOrder = (env.VERCEL_AI_GATEWAY_ORDER || 'openai')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const result = await generateText({
      model: gatewayOpenAI('openai/gpt-4o-mini'),
      messages: [
        {
          role: 'system',
          content: `Generate ${count} relevant, trending hashtags for ${platform} based on the content. Return only the hashtags without the # symbol, one per line.`,
        },
        { role: 'user', content },
      ],
      maxTokens: 100,
      temperature: 0.7,
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
export async function analyzeContent(content: string): Promise<{
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
      model: gatewayOpenAI('openai/gpt-4o-mini'),
      schema: analysisSchema,
      messages: [
        {
          role: 'system',
          content: `Analyze this social media content and provide:
1. Sentiment (positive/neutral/negative)
2. Readability (easy/moderate/difficult)
3. 3 specific improvement suggestions`,
        },
        { role: 'user', content },
      ],
      maxTokens: 300,
      temperature: 0.3,
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
  count: number = 3
): Promise<string[]> {
  try {
    const providerOrder = (env.VERCEL_AI_GATEWAY_ORDER || 'openai')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const result = await generateText({
      model: gatewayOpenAI('openai/gpt-4o'),
      messages: [
        {
          role: 'system',
          content: `Generate ${count} different variations of this ${platform} post. Each variation should:
- Maintain the core message
- Use different wording and structure
- Be optimized for ${platform}
- Be numbered (1., 2., 3., etc.)

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
