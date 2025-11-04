import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleAPIError, APIError } from '@/lib/api-middleware';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new APIError(401, 'Unauthorized');
    }

    // Get user's workspace
    const { data: workspaceMember, error: workspaceError } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single();

    if (workspaceError || !workspaceMember) {
      throw new APIError(404, 'No workspace found');
    }

    // Check cache first
    const { data: cachedData } = await supabase
      .from('strategy_cache')
      .select('data')
      .eq('workspace_id', workspaceMember.workspace_id)
      .eq('recommendation_type', 'weekly')
      .gt('expires_at', new Date().toISOString())
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (cachedData?.data) {
      return NextResponse.json({ data: cachedData.data });
    }

    // Generate new recommendations using AI
    const recommendations = await generateWeeklyRecommendations(
      supabase,
      workspaceMember.workspace_id
    );

    // Cache the results
    await supabase.from('strategy_cache').insert({
      workspace_id: workspaceMember.workspace_id,
      recommendation_type: 'weekly',
      data: recommendations,
      generated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return NextResponse.json({ data: recommendations });
  } catch (error) {
    return handleAPIError(error);
  }
}

async function generateWeeklyRecommendations(supabase: any, workspaceId: string) {
  // Fetch recent analytics data
  const { data: recentPosts } = await supabase
    .from('posts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(50);

  // For now, return mock recommendations
  // In production, this would use OpenAI API to analyze the data
  const recommendations = [
    {
      title: 'Increase Video Content',
      description: 'Your audience engagement is 3x higher on video posts compared to images. Consider posting more video content.',
      priority: 'high' as const,
      actionItems: [
        'Create 2-3 short-form videos per week',
        'Repurpose existing blog content into video format',
        'Experiment with Instagram Reels and TikTok',
      ],
      expectedImpact: '+45% engagement rate within 2 weeks',
    },
    {
      title: 'Optimize Posting Schedule',
      description: 'Your best engagement times are not aligned with your current posting schedule.',
      priority: 'high' as const,
      actionItems: [
        'Schedule posts for Tuesday and Thursday at 10 AM',
        'Avoid posting on weekends for business content',
        'Use scheduling tool to maintain consistency',
      ],
      expectedImpact: '+30% reach improvement',
    },
    {
      title: 'Leverage User-Generated Content',
      description: 'Posts featuring customer testimonials and reviews get 2x more engagement.',
      priority: 'medium' as const,
      actionItems: [
        'Create a branded hashtag campaign',
        'Encourage customers to share their experiences',
        'Feature 1-2 customer stories per week',
      ],
      expectedImpact: '+25% follower growth rate',
    },
    {
      title: 'Improve Caption Length',
      description: 'Your shorter captions (50-100 words) perform better than longer ones.',
      priority: 'low' as const,
      actionItems: [
        'Keep captions concise and impactful',
        'Lead with the most important information',
        'Use line breaks for readability',
      ],
      expectedImpact: '+15% comment rate',
    },
  ];

  return recommendations;
}

