/**
 * AI Insights API
 * GET, POST /api/analytics/ai-insights
 * 
 * Fetch and generate AI-powered analytics insights
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Fetch AI insights for a workspace
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const workspaceId = searchParams.get('workspace_id');
        const insightType = searchParams.get('type');
        const limit = parseInt(searchParams.get('limit') || '10', 10);

        if (!workspaceId) {
            return NextResponse.json(
                { error: 'workspace_id is required' },
                { status: 400 }
            );
        }

        // Verify membership
        const { data: membership } = await supabase
            .from('workspace_members')
            .select('role')
            .eq('workspace_id', workspaceId)
            .eq('user_id', user.id)
            .single();

        if (!membership) {
            return NextResponse.json(
                { error: 'Not a member of this workspace' },
                { status: 403 }
            );
        }

        // Build query
        let query = supabase
            .from('ai_insights')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('generated_at', { ascending: false })
            .limit(limit);

        if (insightType) {
            query = query.eq('insight_type', insightType);
        }

        // Filter out expired insights
        query = query.or('expires_at.is.null,expires_at.gt.now()');

        const { data: insights, error } = await query;

        if (error) {
            console.error('Fetch insights error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch insights' },
                { status: 500 }
            );
        }

        return NextResponse.json({ insights });

    } catch (error) {
        console.error('AI insights GET error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch insights' },
            { status: 500 }
        );
    }
}

// POST - Generate new AI insight
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { workspace_id, insight_type, period_start, period_end } = body;

        if (!workspace_id || !insight_type) {
            return NextResponse.json(
                { error: 'workspace_id and insight_type are required' },
                { status: 400 }
            );
        }

        // Verify membership
        const { data: membership } = await supabase
            .from('workspace_members')
            .select('role')
            .eq('workspace_id', workspace_id)
            .eq('user_id', user.id)
            .single();

        if (!membership) {
            return NextResponse.json(
                { error: 'Not a member of this workspace' },
                { status: 403 }
            );
        }

        // Fetch analytics data based on insight type
        let analyticsData: any = {};
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Get daily metrics
        const { data: dailyMetrics } = await supabase
            .from('daily_metrics_summary')
            .select('*')
            .eq('workspace_id', workspace_id)
            .gte('date', weekAgo.toISOString())
            .order('date', { ascending: false });

        analyticsData.daily_metrics = dailyMetrics || [];

        // Get top posts
        const { data: topPosts } = await supabase
            .from('posts')
            .select('id, content, platforms, created_at')
            .eq('workspace_id', workspace_id)
            .eq('status', 'published')
            .order('created_at', { ascending: false })
            .limit(10);

        analyticsData.recent_posts = topPosts || [];

        // Generate insight using AI
        let insightContent: { title: string; content: string } = {
            title: '',
            content: '',
        };

        try {
            // Call AI API for insights generation
            const aiResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'analytics_insight',
                    context: {
                        insight_type,
                        period: { start: period_start || weekAgo.toISOString(), end: period_end || now.toISOString() },
                        metrics: analyticsData.daily_metrics,
                        posts_count: analyticsData.recent_posts.length,
                    },
                }),
            });

            if (aiResponse.ok) {
                const aiData = await aiResponse.json();
                insightContent = {
                    title: aiData.title || `${insight_type} Summary`,
                    content: aiData.content || aiData.text || 'No insights available for this period.',
                };
            }
        } catch (aiError) {
            console.error('AI generation error:', aiError);
            // Fallback to template-based insights
            insightContent = generateFallbackInsight(insight_type, analyticsData);
        }

        // Save insight to database
        const { data: insight, error: insertError } = await supabase
            .from('ai_insights')
            .insert({
                workspace_id,
                insight_type,
                title: insightContent.title,
                content: insightContent.content,
                period_start: period_start || weekAgo.toISOString(),
                period_end: period_end || now.toISOString(),
                metadata: { generated_by: user.id, data_points: analyticsData.daily_metrics?.length || 0 },
                expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // Expires in 24 hours
            })
            .select()
            .single();

        if (insertError) {
            console.error('Insert insight error:', insertError);
            return NextResponse.json(
                { error: 'Failed to save insight' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            insight,
            success: true,
        });

    } catch (error) {
        console.error('AI insights POST error:', error);
        return NextResponse.json(
            { error: 'Failed to generate insight' },
            { status: 500 }
        );
    }
}

function generateFallbackInsight(type: string, data: any): { title: string; content: string } {
    const metrics = data.daily_metrics || [];
    const postsCount = data.recent_posts?.length || 0;

    const totalImpressions = metrics.reduce((sum: number, m: any) => sum + (m.total_impressions || 0), 0);
    const totalEngagements = metrics.reduce((sum: number, m: any) => sum + (m.total_engagements || 0), 0);

    switch (type) {
        case 'daily_summary':
            return {
                title: 'Daily Performance Summary',
                content: `Today you've reached ${totalImpressions.toLocaleString()} impressions with ${totalEngagements.toLocaleString()} total engagements across your connected platforms.`,
            };
        case 'weekly_summary':
            return {
                title: 'Weekly Performance Review',
                content: `This week you published ${postsCount} posts, generating ${totalImpressions.toLocaleString()} impressions and ${totalEngagements.toLocaleString()} engagements. ${totalEngagements > 100 ? 'Great engagement this week!' : 'Consider posting more engaging content to boost engagement.'}`,
            };
        case 'recommendation':
            return {
                title: 'Content Recommendation',
                content: `Based on your recent performance, we recommend focusing on content that drives engagement. Your best-performing content appears to resonate well with your audience.`,
            };
        default:
            return {
                title: 'Analytics Insight',
                content: 'Continue monitoring your performance to identify trends and opportunities.',
            };
    }
}
