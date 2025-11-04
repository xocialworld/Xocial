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
      .eq('recommendation_type', 'insights')
      .gt('expires_at', new Date().toISOString())
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (cachedData?.data) {
      return NextResponse.json({ data: cachedData.data });
    }

    // Generate performance insights
    const insights = await generatePerformanceInsights(supabase, workspaceMember.workspace_id);

    // Cache the results
    await supabase.from('strategy_cache').insert({
      workspace_id: workspaceMember.workspace_id,
      recommendation_type: 'insights',
      data: insights,
      generated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day cache
    });

    return NextResponse.json({ data: insights });
  } catch (error) {
    return handleAPIError(error);
  }
}

async function generatePerformanceInsights(supabase: any, workspaceId: string) {
  // Fetch recent posts and their performance
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  // For now, return mock insights
  // In production, this would analyze actual data and trends
  const insights = [
    {
      metric: 'Total Engagement',
      value: 12500,
      change: 23,
      trend: 'up' as const,
      insight: 'Your engagement rate has increased significantly over the past 30 days, driven primarily by video content.',
      recommendation: 'Continue focusing on video content and consider increasing posting frequency from 3 to 5 times per week.',
    },
    {
      metric: 'Follower Growth',
      value: 847,
      change: 15,
      trend: 'up' as const,
      insight: 'Your follower growth is steady, with spikes after posting user-generated content.',
      recommendation: 'Launch a UGC campaign with a branded hashtag to accelerate growth. Target 1,000+ new followers this month.',
    },
    {
      metric: 'Average Reach',
      value: 8420,
      change: -8,
      trend: 'down' as const,
      insight: 'Reach has decreased slightly, possibly due to algorithm changes or posting time inconsistency.',
      recommendation: 'Stick to consistent posting times (Tuesday/Thursday 10 AM) and increase engagement with comments to boost algorithm favor.',
    },
    {
      metric: 'Click-Through Rate',
      value: 340,
      change: 45,
      trend: 'up' as const,
      insight: 'Your CTR has improved dramatically after adding clear CTAs to your posts.',
      recommendation: 'Continue using direct CTAs in every post. Test different CTA placements (beginning vs. end of caption).',
    },
    {
      metric: 'Response Rate',
      value: 89,
      change: 2,
      trend: 'stable' as const,
      insight: 'Your response rate to comments and DMs is excellent and stable.',
      recommendation: 'Maintain current response times (under 2 hours). Consider implementing automated responses for FAQs.',
    },
  ];

  return insights;
}

