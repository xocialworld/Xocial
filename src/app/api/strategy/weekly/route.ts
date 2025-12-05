import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleAPIError, APIError } from '@/lib/api-middleware';

export const dynamic = 'force-dynamic';

export async function GET() {
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

async function generateWeeklyRecommendations(workspaceId: string) {
  const { runStrategyAnalysis } = await import('@/lib/ai/strategy-engine');
  const { recommendations } = await runStrategyAnalysis(workspaceId);
  
  // Map to expected format for backward compatibility
  return recommendations.map(rec => ({
    title: rec.title,
    description: rec.description,
    priority: rec.priority,
    actionItems: rec.action_items || [],
    expectedImpact: rec.metrics?.expected_impact || '',
    type: rec.type,
    confidence: rec.confidence_score
  }));
}

