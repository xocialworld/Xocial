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
      .eq('recommendation_type', 'best_times')
      .gt('expires_at', new Date().toISOString())
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (cachedData?.data) {
      return NextResponse.json({ data: cachedData.data });
    }

    // Generate best times analysis
    const bestTimes = await analyzeBestTimes(supabase, workspaceMember.workspace_id);

    // Cache the results
    await supabase.from('strategy_cache').insert({
      workspace_id: workspaceMember.workspace_id,
      recommendation_type: 'best_times',
      data: bestTimes,
      generated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return NextResponse.json({ data: bestTimes });
  } catch (error) {
    return handleAPIError(error);
  }
}

async function analyzeBestTimes(supabase: any, workspaceId: string) {
  // Fetch posts with engagement data
  const { data: posts } = await supabase
    .from('posts')
    .select('*, platforms')
    .eq('workspace_id', workspaceId)
    .gte('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  // For now, return mock data
  // In production, this would analyze actual post performance
  const platforms = ['facebook', 'instagram', 'twitter', 'linkedin'];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const bestTimes: any[] = [];

  for (const platform of platforms) {
    // Generate 3-5 best times per platform
    const times = [
      { day: 'Tuesday', hour: 10, score: 85, confidence: 92 },
      { day: 'Wednesday', hour: 14, score: 82, confidence: 88 },
      { day: 'Thursday', hour: 9, score: 78, confidence: 85 },
      { day: 'Monday', hour: 11, score: 75, confidence: 80 },
      { day: 'Friday', hour: 15, score: 70, confidence: 75 },
    ];

    times.forEach((time) => {
      bestTimes.push({
        platform,
        dayOfWeek: time.day,
        hour: time.hour,
        engagementScore: time.score,
        confidence: time.confidence,
      });
    });
  }

  return bestTimes;
}

