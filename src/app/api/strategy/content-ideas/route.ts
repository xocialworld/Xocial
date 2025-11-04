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
      .eq('recommendation_type', 'content_ideas')
      .gt('expires_at', new Date().toISOString())
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (cachedData?.data) {
      return NextResponse.json({ data: cachedData.data });
    }

    // Generate content ideas
    const contentIdeas = await generateContentIdeas(supabase, workspaceMember.workspace_id);

    // Cache the results
    await supabase.from('strategy_cache').insert({
      workspace_id: workspaceMember.workspace_id,
      recommendation_type: 'content_ideas',
      data: contentIdeas,
      generated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days cache
    });

    return NextResponse.json({ data: contentIdeas });
  } catch (error) {
    return handleAPIError(error);
  }
}

async function generateContentIdeas(supabase: any, workspaceId: string) {
  // Fetch workspace industry/niche
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', workspaceId)
    .single();

  // For now, return mock content ideas
  // In production, this would use OpenAI API to generate personalized ideas
  const ideas = [
    {
      id: '1',
      title: 'Behind-the-Scenes: A Day in the Life',
      description: 'Share authentic behind-the-scenes content showing your team at work. This humanizes your brand and builds trust with your audience.',
      platforms: ['instagram', 'facebook', 'linkedin'],
      topic: 'Company Culture',
      trending: true,
      estimatedEngagement: 'High (8-12% engagement rate)',
    },
    {
      id: '2',
      title: 'Customer Success Story Feature',
      description: 'Highlight a customer who achieved great results using your product/service. Include before/after or specific metrics.',
      platforms: ['linkedin', 'twitter', 'facebook'],
      topic: 'Social Proof',
      trending: false,
      estimatedEngagement: 'Very High (12-18% engagement rate)',
    },
    {
      id: '3',
      title: 'Industry Trend Analysis',
      description: 'Share your expert perspective on a trending topic in your industry. Position yourself as a thought leader.',
      platforms: ['linkedin', 'twitter'],
      topic: 'Thought Leadership',
      trending: true,
      estimatedEngagement: 'Medium (5-8% engagement rate)',
    },
    {
      id: '4',
      title: 'Quick Tips Tuesday',
      description: 'Create a weekly series of actionable tips related to your niche. Keep it concise and valuable.',
      platforms: ['twitter', 'instagram', 'linkedin'],
      topic: 'Educational',
      trending: false,
      estimatedEngagement: 'High (9-13% engagement rate)',
    },
    {
      id: '5',
      title: 'User-Generated Content Campaign',
      description: 'Launch a hashtag campaign encouraging customers to share their experiences with your brand.',
      platforms: ['instagram', 'tiktok', 'twitter'],
      topic: 'Community Building',
      trending: true,
      estimatedEngagement: 'Very High (15-20% engagement rate)',
    },
    {
      id: '6',
      title: 'Interactive Poll or Quiz',
      description: 'Engage your audience with a fun, relevant poll or quiz. This boosts algorithm visibility and provides valuable insights.',
      platforms: ['twitter', 'instagram', 'linkedin'],
      topic: 'Engagement',
      trending: false,
      estimatedEngagement: 'High (10-15% engagement rate)',
    },
  ];

  return ideas;
}

