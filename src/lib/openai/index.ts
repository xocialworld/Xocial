/**
 * OpenAI Integration for AI Content Generation
 * Provides content generation, refinement, and optimization
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface GenerateContentRequest {
  platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube';
  prompt: string;
  tone?: 'professional' | 'casual' | 'friendly' | 'enthusiastic' | 'informative';
  addEmojis?: boolean;
  addHashtags?: boolean;
  addCTA?: boolean;
  maxLength?: number;
}

export interface GeneratedContent {
  text: string;
  hashtags?: string[];
  mentions?: string[];
  estimatedCharCount: number;
  suggestions?: string[];
}

/**
 * Platform-specific content guidelines
 */
const PLATFORM_GUIDELINES = {
  facebook: {
    maxLength: 63206,
    optimal: 80-100,
    format: 'longer form content with storytelling',
    bestPractices: ['Use compelling first line', 'Break into paragraphs', 'Include call-to-action'],
  },
  instagram: {
    maxLength: 2200,
    optimal: 125-150,
    format: 'visual-first with engaging captions',
    bestPractices: ['Start with hook', 'Use line breaks', 'Include emojis', 'Add relevant hashtags (5-10)'],
  },
  twitter: {
    maxLength: 280,
    optimal: 100-150,
    format: 'concise and punchy',
    bestPractices: ['Get to the point quickly', 'Use hashtags sparingly (1-2)', 'Include media when possible'],
  },
  linkedin: {
    maxLength: 3000,
    optimal: 150-200,
    format: 'professional and value-driven',
    bestPractices: ['Start with key insight', 'Provide value', 'Professional tone', 'Include call-to-action'],
  },
  tiktok: {
    maxLength: 2200,
    optimal: 100-150,
    format: 'trending and engaging',
    bestPractices: ['Use trending sounds/hashtags', 'Hook in first 3 seconds', 'Clear CTA'],
  },
  youtube: {
    maxLength: 5000,
    optimal: 200-300,
    format: 'descriptive with SEO',
    bestPractices: ['Frontload key info', 'Include timestamps', 'Add keywords', 'Clear CTA'],
  },
};

/**
 * Generate platform-specific content using OpenAI
 */
export async function generateContent(
  request: GenerateContentRequest
): Promise<GeneratedContent> {
  const guidelines = PLATFORM_GUIDELINES[request.platform];
  
  // Build the system prompt
  const systemPrompt = `You are an expert social media content creator specializing in ${request.platform} content.
  
Platform Guidelines:
- Maximum length: ${guidelines.maxLength} characters
- Optimal length: ${guidelines.optimal} words
- Format: ${guidelines.format}
- Best practices: ${guidelines.bestPractices.join(', ')}

${request.tone ? `Tone: ${request.tone}` : ''}
${request.addEmojis ? 'Include relevant emojis to enhance engagement.' : ''}
${request.addHashtags ? `Include ${request.platform === 'instagram' ? '5-10' : '1-3'} relevant hashtags.` : ''}
${request.addCTA ? 'Include a clear call-to-action.' : ''}

Generate engaging, platform-optimized content that follows these guidelines and best practices.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: request.prompt },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const generatedText = completion.choices[0].message.content || '';

    // Extract hashtags if present
    const hashtagRegex = /#[\w]+/g;
    const hashtags = generatedText.match(hashtagRegex)?.map(tag => tag.slice(1)) || [];

    // Extract mentions if present
    const mentionRegex = /@[\w]+/g;
    const mentions = generatedText.match(mentionRegex)?.map(mention => mention.slice(1)) || [];

    return {
      text: generatedText,
      hashtags: hashtags.length > 0 ? hashtags : undefined,
      mentions: mentions.length > 0 ? mentions : undefined,
      estimatedCharCount: generatedText.length,
      suggestions: [], // Can be populated with refinement suggestions
    };
  } catch (error: any) {
    throw new Error(`Failed to generate content: ${error.message}`);
  }
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
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are refining social media content for ${platform}. ${refinementInstructions[refinementType]}`,
        },
        { role: 'user', content: originalContent },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return completion.choices[0].message.content || originalContent;
  } catch (error: any) {
    throw new Error(`Failed to refine content: ${error.message}`);
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
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Generate ${count} relevant, trending hashtags for ${platform} based on the content. Return only the hashtags without the # symbol, one per line.`,
        },
        { role: 'user', content },
      ],
      max_tokens: 100,
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content || '';
    return response.split('\n').filter(tag => tag.trim()).map(tag => tag.trim().replace('#', ''));
  } catch (error: any) {
    throw new Error(`Failed to generate hashtags: ${error.message}`);
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
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Analyze this social media content and provide:
1. Sentiment (positive/neutral/negative)
2. Readability (easy/moderate/difficult)
3. 3 specific improvement suggestions

Format your response as JSON:
{
  "sentiment": "positive",
  "readability": "easy",
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"]
}`,
        },
        { role: 'user', content },
      ],
      max_tokens: 300,
      temperature: 0.3,
    });

    const response = completion.choices[0].message.content || '{}';
    return JSON.parse(response);
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
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
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
      max_tokens: 800,
      temperature: 0.8,
    });

    const response = completion.choices[0].message.content || '';
    const variations = response.split(/\n\s*\n/).filter(v => v.trim());
    return variations.map(v => v.replace(/^\d+\.\s*/, '').trim());
  } catch (error: any) {
    throw new Error(`Failed to generate variations: ${error.message}`);
  }
}

