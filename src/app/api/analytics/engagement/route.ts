import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { format, eachDayOfInterval, parseISO } from 'date-fns';
import { checkRateLimit, getWorkspaceFromRequest } from '@/lib/api-middleware';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Rate limit engagement analytics
    const limited = checkRateLimit(`${user.id}:analytics:engagement`, 60, 60_000);
    if (!limited) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!from || !to) {
      return NextResponse.json(
        { error: 'Missing date range parameters' },
        { status: 400 }
      );
    }

    const workspace = await getWorkspaceFromRequest(user.id, request, supabase);

    // Get all posts with analytics in the date range
    const { data: posts } = await supabase
      .from('posts')
      .select('published_at, post_analytics(likes, comments, shares, recorded_at)')
      .eq('workspace_id', workspace.id)
      .gte('published_at', from)
      .lte('published_at', to)
      .eq('status', 'published')
      .order('published_at', { ascending: true });

    // Create date range array
    const dateRange = eachDayOfInterval({
      start: parseISO(from),
      end: parseISO(to),
    });

    // Initialize engagement data structure
    const engagementMap = new Map<string, { likes: number; comments: number; shares: number }>();
    
    dateRange.forEach(date => {
      const dateKey = format(date, 'MMM dd');
      engagementMap.set(dateKey, { likes: 0, comments: 0, shares: 0 });
    });

    // Aggregate analytics by date
    posts?.forEach(post => {
      const publishedDate = format(parseISO(post.published_at), 'MMM dd');
      const analytics = post.post_analytics as any;
      
      if (analytics && Array.isArray(analytics)) {
        const current = engagementMap.get(publishedDate);
        if (current) {
          analytics.forEach((a: any) => {
            current.likes += a.likes || 0;
            current.comments += a.comments || 0;
            current.shares += a.shares || 0;
          });
        }
      }
    });

    // Convert map to array
    const engagementData = Array.from(engagementMap.entries()).map(([date, metrics]) => ({
      date,
      likes: metrics.likes,
      comments: metrics.comments,
      shares: metrics.shares,
      total: metrics.likes + metrics.comments + metrics.shares,
    }));

    return NextResponse.json({
      success: true,
      data: engagementData,
    });
  } catch (error) {
    logger.error('Engagement data error', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch engagement data' },
      { status: 500 }
    );
  }
}

