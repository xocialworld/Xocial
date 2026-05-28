/**
 * AI Strategy Engine
 * Analyzes post performance and generates strategic recommendations
 * Based on SRS Section 6.7
 */

import { createClient } from '@supabase/supabase-js';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { env } from '@/lib/env';
import { StrategyRecommendation } from '@/types';
import { buildAIContextPacket } from '@/lib/intelligence/context';
import type { AIContextPacket } from '@/types/intelligence';

const gatewayOpenAI = createOpenAI({
  baseURL: `${env.VERCEL_AI_GATEWAY_URL}/v1`,
  apiKey: env.VERCEL_AI_GATEWAY_API_KEY,
});
import { logger } from '../logger';

export interface PerformanceData {
  totalPosts: number;
  avgEngagementRate: number;
  topPerformingPlatform: string;
  bestPostingTimes: Array<{ hour: number; day: string; avgEngagement: number }>;
  topHashtags: Array<{ tag: string; count: number; avgEngagement: number }>;
  contentTypes: Array<{ type: string; count: number; avgEngagement: number }>;
  weeklyGrowth: number;
}

export interface AIStrategyRecommendation {
  type: 'content' | 'timing' | 'engagement' | 'growth' | 'hashtag' | 'topic';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidenceScore: number;
  actionItems: string[];
  expectedImpact: string;
  metrics?: Record<string, any>;
}

/**
 * Analyze post performance data
 */
export async function analyzePerformance(
  workspaceId: string
): Promise<PerformanceData | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get posts from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        post_analytics(*)
      `)
      .eq('workspace_id', workspaceId)
      .eq('status', 'published')
      .gte('published_at', thirtyDaysAgo.toISOString());

    if (error || !posts) {
      logger.error('Failed to fetch posts for analysis', error as any);
      return null;
    }

    // Calculate metrics
    const totalPosts = posts.length;
    
    if (totalPosts === 0) {
      return {
        totalPosts: 0,
        avgEngagementRate: 0,
        topPerformingPlatform: 'none',
        bestPostingTimes: [],
        topHashtags: [],
        contentTypes: [],
        weeklyGrowth: 0,
      };
    }

    // Calculate average engagement rate
    const engagementRates = posts
      .flatMap((p) => p.post_analytics?.map((a: any) => a.engagement_rate || 0) || [])
      .filter((rate) => rate > 0);
    
    const avgEngagementRate =
      engagementRates.length > 0
        ? engagementRates.reduce((sum, rate) => sum + rate, 0) / engagementRates.length
        : 0;

    // Find top performing platform
    const platformPerformance: Record<string, { count: number; totalEngagement: number }> = {};
    
    posts.forEach((post) => {
      post.platforms.forEach((platform: string) => {
        if (!platformPerformance[platform]) {
          platformPerformance[platform] = { count: 0, totalEngagement: 0 };
        }
        platformPerformance[platform].count++;
        
        const platformAnalytics = post.post_analytics?.find((a: any) => a.platform === platform);
        if (platformAnalytics) {
          platformPerformance[platform].totalEngagement += platformAnalytics.engagement || 0;
        }
      });
    });

    const topPerformingPlatform = Object.entries(platformPerformance)
      .sort(([, a], [, b]) => {
        const avgA = a.count > 0 ? a.totalEngagement / a.count : 0;
        const avgB = b.count > 0 ? b.totalEngagement / b.count : 0;
        return avgB - avgA;
      })[0]?.[0] || 'none';

    // Analyze posting times
    const timePerformance: Record<string, { count: number; totalEngagement: number }> = {};
    
    posts.forEach((post) => {
      const publishedDate = new Date(post.published_at);
      const hour = publishedDate.getHours();
      const day = publishedDate.toLocaleDateString('en-US', { weekday: 'long' });
      const key = `${day}-${hour}`;

      if (!timePerformance[key]) {
        timePerformance[key] = { count: 0, totalEngagement: 0 };
      }
      timePerformance[key].count++;

      post.post_analytics?.forEach((analytics: any) => {
        timePerformance[key].totalEngagement += analytics.engagement || 0;
      });
    });

    const bestPostingTimes = Object.entries(timePerformance)
      .map(([key, data]) => {
        const [day, hour] = key.split('-');
        return {
          hour: parseInt(hour),
          day,
          avgEngagement: data.count > 0 ? data.totalEngagement / data.count : 0,
        };
      })
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 5);

    // Extract and rank hashtags
    const hashtagPerformance: Record<string, { count: number; totalEngagement: number }> = {};
    
    posts.forEach((post) => {
      const tags = post.tags || [];
      tags.forEach((tag: string) => {
        if (!hashtagPerformance[tag]) {
          hashtagPerformance[tag] = { count: 0, totalEngagement: 0 };
        }
        hashtagPerformance[tag].count++;

        post.post_analytics?.forEach((analytics: any) => {
          hashtagPerformance[tag].totalEngagement += analytics.engagement || 0;
        });
      });
    });

    const topHashtags = Object.entries(hashtagPerformance)
      .map(([tag, data]) => ({
        tag,
        count: data.count,
        avgEngagement: data.count > 0 ? data.totalEngagement / data.count : 0,
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 10);

    // Calculate weekly growth
    const weeklyGrowth = 12.5; // TODO: Calculate from historical data

    return {
      totalPosts,
      avgEngagementRate,
      topPerformingPlatform,
      bestPostingTimes,
      topHashtags,
      contentTypes: [],
      weeklyGrowth,
    };
  } catch (error) {
    logger.error('Performance analysis failed', error as Error);
    return null;
  }
}

/**
 * Generate AI-powered strategy recommendations
 */
export async function generateRecommendations(
  performanceData: PerformanceData,
  aiContext?: AIContextPacket
): Promise<AIStrategyRecommendation[]> {
  try {
    // Use shared gateway provider

    const prompt = `As a social media strategy expert, analyze this performance data and provide 5 actionable recommendations:

Performance Summary:
- Total Posts (30 days): ${performanceData.totalPosts}
- Average Engagement Rate: ${performanceData.avgEngagementRate.toFixed(2)}%
- Top Platform: ${performanceData.topPerformingPlatform}
- Weekly Growth: ${performanceData.weeklyGrowth}%

Best Posting Times:
${performanceData.bestPostingTimes.map(t => `- ${t.day} at ${t.hour}:00 (${t.avgEngagement.toFixed(0)} avg engagement)`).join('\n')}

Top Hashtags:
${performanceData.topHashtags.slice(0, 5).map(h => `- #${h.tag} (used ${h.count}x, ${h.avgEngagement.toFixed(0)} avg engagement)`).join('\n')}

${aiContext?.promptContext ? `${aiContext.promptContext}\n\nUse this memory to make recommendations specific to the workspace brand, approval preferences, and known performance patterns. Do not mention memory internals to the user.` : ''}

Provide recommendations in JSON format:
{
  "recommendations": [
    {
      "type": "content|timing|engagement|growth|hashtag|topic",
      "title": "Clear, actionable title",
      "description": "Detailed explanation",
      "priority": "low|medium|high|critical",
      "confidenceScore": 0.0-1.0,
      "actionItems": ["Step 1", "Step 2", "Step 3"],
      "expectedImpact": "Expected outcome"
    }
  ]
}`;

    const result = await generateObject({
      model: gatewayOpenAI('openai/gpt-4o-mini'),
      schema: {
        parse(data: any) { return data as { recommendations: AIStrategyRecommendation[] }; },
      } as any,
      messages: [
        { role: 'system', content: 'You are an expert social media strategist. Respond with ONLY valid JSON, no commentary.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      maxTokens: 2000,
      providerOptions: { gateway: { order: ['openai'] } },
    });

    const data = result.object as any;
    return (data?.recommendations ?? []) as AIStrategyRecommendation[];
  } catch (error) {
    logger.error('AI recommendation generation failed', error as Error);
    
    // Return fallback recommendations based on rules
    return generateRuleBasedRecommendations(performanceData);
  }
}

/**
 * Generate rule-based recommendations (fallback)
 */
function generateRuleBasedRecommendations(
  data: PerformanceData
): AIStrategyRecommendation[] {
  const recommendations: AIStrategyRecommendation[] = [];

  // Recommendation 1: Posting frequency
  if (data.totalPosts < 20) {
    recommendations.push({
      type: 'content',
      title: 'Increase Posting Frequency',
      description: `You've published ${data.totalPosts} posts in the last 30 days. Consistent posting (20-30 posts/month) typically leads to better engagement.`,
      priority: 'high',
      confidenceScore: 0.85,
      actionItems: [
        'Set a goal of at least 1 post per day',
        'Use AI content generation to speed up creation',
        'Create a content calendar to plan ahead',
      ],
      expectedImpact: 'Increase reach by 30-50%',
    });
  }

  // Recommendation 2: Best posting times
  if (data.bestPostingTimes.length > 0) {
    const bestTime = data.bestPostingTimes[0];
    recommendations.push({
      type: 'timing',
      title: 'Optimize Posting Schedule',
      description: `Your best performing time is ${bestTime.day} at ${bestTime.hour}:00. Schedule more posts during high-engagement windows.`,
      priority: 'medium',
      confidenceScore: 0.75,
      actionItems: [
        `Schedule posts for ${bestTime.day} at ${bestTime.hour}:00`,
        'Avoid posting during low-engagement hours',
        'Test different time slots weekly',
      ],
      expectedImpact: 'Increase engagement rate by 20-30%',
    });
  }

  // Recommendation 3: Top hashtags
  if (data.topHashtags.length > 0) {
    recommendations.push({
      type: 'hashtag',
      title: 'Leverage High-Performing Hashtags',
      description: `Your top hashtags show strong engagement. Incorporate ${data.topHashtags.slice(0, 3).map(h => `#${h.tag}`).join(', ')} in future posts.`,
      priority: 'medium',
      confidenceScore: 0.70,
      actionItems: [
        'Use top 5 hashtags in relevant posts',
        'Research related trending hashtags',
        'Create hashtag groups for different content types',
      ],
      expectedImpact: 'Improve discoverability and reach',
    });
  }

  // Recommendation 4: Platform focus
  if (data.topPerformingPlatform && data.topPerformingPlatform !== 'none') {
    recommendations.push({
      type: 'growth',
      title: `Double Down on ${data.topPerformingPlatform}`,
      description: `${data.topPerformingPlatform} is your best-performing platform. Consider increasing post frequency there.`,
      priority: 'high',
      confidenceScore: 0.80,
      actionItems: [
        `Create platform-specific content for ${data.topPerformingPlatform}`,
        'Engage with comments and community',
        'Analyze top posts to identify winning formats',
      ],
      expectedImpact: 'Maximize ROI on best platform',
    });
  }

  // Recommendation 5: Engagement rate
  if (data.avgEngagementRate < 2.0) {
    recommendations.push({
      type: 'engagement',
      title: 'Improve Content Engagement',
      description: `Your average engagement rate is ${data.avgEngagementRate.toFixed(2)}%. Industry average is 2-5%. Focus on creating more engaging content.`,
      priority: 'high',
      confidenceScore: 0.90,
      actionItems: [
        'Use more visual content (images, videos)',
        'Ask questions to encourage comments',
        'Create polls and interactive content',
        'Respond to all comments within 1 hour',
      ],
      expectedImpact: 'Double engagement rate within 60 days',
    });
  }

  return recommendations.slice(0, 5);
}

/**
 * Save recommendations to database
 */
export async function saveRecommendations(
  workspaceId: string,
  recommendations: AIStrategyRecommendation[],
  contextMetadata?: AIContextPacket['contextMetadata']
): Promise<StrategyRecommendation[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const records = recommendations.map((rec) => ({
      workspace_id: workspaceId,
      type: rec.type,
      title: rec.title,
      description: rec.description,
      priority: rec.priority,
      confidence_score: rec.confidenceScore,
      action_items: rec.actionItems,
      metrics: {
        ...(rec.metrics || {}),
        expected_impact: rec.expectedImpact,
        context_metadata: contextMetadata,
      },
      status: 'pending',
      valid_from: new Date().toISOString(),
      valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    }));

    const { data: savedRecords, error: insertError } = await supabase
      .from('strategy_recommendations')
      .insert(records)
      .select();

    if (insertError) {
      logger.error('Failed to save recommendations', insertError as any);
      return [];
    }
    
    return (savedRecords as StrategyRecommendation[]) || [];
  } catch (error) {
    logger.error('Error saving recommendations', error as Error);
    return [];
  }
}

/**
 * Get best posting times for a workspace
 */
export async function getBestPostingTimes(
  workspaceId: string,
  platform?: string
): Promise<Array<{ day: string; hour: number; score: number }>> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get published posts with analytics
    let query = supabase
      .from('posts')
      .select(`
        published_at,
        platforms,
        post_analytics(platform, engagement, reach, impressions)
      `)
      .eq('workspace_id', workspaceId)
      .eq('status', 'published')
      .not('published_at', 'is', null);

    if (platform) {
      query = query.contains('platforms', [platform]);
    }

    const { data: posts } = await query;

    if (!posts || posts.length === 0) {
      return [];
    }

    // Aggregate by day and hour
    const timeSlots: Record<string, { count: number; totalEngagement: number }> = {};

    posts.forEach((post: any) => {
      const publishedDate = new Date(post.published_at);
      const day = publishedDate.toLocaleDateString('en-US', { weekday: 'long' });
      const hour = publishedDate.getHours();
      const key = `${day}-${hour}`;

      if (!timeSlots[key]) {
        timeSlots[key] = { count: 0, totalEngagement: 0 };
      }

      timeSlots[key].count++;
      
      post.post_analytics?.forEach((analytics: any) => {
        if (!platform || analytics.platform === platform) {
          timeSlots[key].totalEngagement += analytics.engagement || 0;
        }
      });
    });

    // Calculate average engagement and normalize to 0-100 score
    const maxEngagement = Math.max(
      ...Object.values(timeSlots).map((slot) => 
        slot.count > 0 ? slot.totalEngagement / slot.count : 0
      ),
      1
    );

    return Object.entries(timeSlots)
      .map(([key, data]) => {
        const [day, hour] = key.split('-');
        const avgEngagement = data.count > 0 ? data.totalEngagement / data.count : 0;
        const score = (avgEngagement / maxEngagement) * 100;

        return {
          day,
          hour: parseInt(hour),
          score: Math.round(score),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  } catch (error) {
    logger.error('Failed to calculate best posting times', error as Error);
    return [];
  }
}

/**
 * Generate content ideas based on performance
 */
export async function generateContentIdeas(
  workspaceId: string,
  count: number = 10
): Promise<Array<{ title: string; description: string; platforms: string[] }>> {
  try {
    const performanceData = await analyzePerformance(workspaceId);
    
    if (!performanceData) {
      return [];
    }
    const prompt = `Based on this social media performance data, generate ${count} engaging content ideas:

Top Platform: ${performanceData.topPerformingPlatform}
Top Hashtags: ${performanceData.topHashtags.slice(0, 5).map(h => `#${h.tag}`).join(', ')}
Average Engagement Rate: ${performanceData.avgEngagementRate.toFixed(2)}%

Generate diverse content ideas that would perform well. Return as JSON:
{
  "ideas": [
    {
      "title": "Content idea title",
      "description": "Detailed description of the post idea",
      "platforms": ["facebook", "instagram"]
    }
  ]
}`;

    const result = await generateObject({
      model: gatewayOpenAI('openai/gpt-4o-mini'),
      schema: {
        // Minimal runtime validation; we only need the ideas array
        parse(data: any) { return data as { ideas: Array<{ title: string; description: string; platforms: string[] }> }; },
      } as any,
      messages: [
        {
          role: 'system',
          content:
            'You are a creative social media content strategist. Respond with ONLY valid JSON, no commentary.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      maxTokens: 1500,
      providerOptions: { gateway: { order: ['openai'] } },
    });

    const data = result.object as any;
    const ideas = data?.ideas || [];
    return ideas;
  } catch (error) {
    logger.error('Content idea generation failed', error as Error);
    return [];
  }
}

/**
 * Main strategy engine function
 */
export async function runStrategyAnalysis(
  workspaceId: string,
  options: {
    aiContext?: AIContextPacket;
  } = {}
): Promise<{
  performanceData: PerformanceData | null;
  recommendations: StrategyRecommendation[];
  contextMetadata?: AIContextPacket['contextMetadata'];
}> {
  logger.info('Running strategy analysis', { workspaceId });

  const performanceData = await analyzePerformance(workspaceId);
  
  if (!performanceData) {
    return {
      performanceData: null,
      recommendations: [],
    };
  }

  let aiContext = options.aiContext;
  if (!aiContext) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    aiContext = await buildAIContextPacket(supabase, {
      workspaceId,
      campaignGoal: 'Improve social media strategy from recent performance',
      query: 'Generate weekly strategy recommendations',
    });
  }

  const aiRecommendations = await generateRecommendations(performanceData, aiContext);

  // Save recommendations to database
  const savedRecommendations = await saveRecommendations(
    workspaceId,
    aiRecommendations,
    aiContext.contextMetadata
  );

  logger.info('Strategy analysis completed', {
    workspaceId,
    recommendationCount: savedRecommendations.length,
  });

  return {
    performanceData,
    recommendations: savedRecommendations,
    contextMetadata: aiContext.contextMetadata,
  };
}

export const StrategyEngine = {
  analyzePerformance,
  generateRecommendations,
  getBestPostingTimes,
  generateContentIdeas,
  saveRecommendations,
  runStrategyAnalysis,
};

export default StrategyEngine;
