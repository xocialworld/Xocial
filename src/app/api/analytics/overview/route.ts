import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

    // Basic rate limiting to protect analytics endpoints
    const limited = checkRateLimit(`${user.id}:analytics:overview`, 60, 60_000);
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

    // Calculate date ranges for comparison
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    const prevFromDate = new Date(fromDate);
    prevFromDate.setDate(prevFromDate.getDate() - daysDiff);

    // Fetch metrics from materialized view
    const { data: summaryRows, error: metricsError } = await supabase
      .from('daily_metrics_summary')
      .select('*')
      .eq('workspace_id', workspace.id)
      .gte('metric_date', prevFromDate.toISOString()) // Fetch all history needed in one go if possible, or split
      .lte('metric_date', to);

    if (metricsError) {
      throw new Error(metricsError.message);
    }

    // Helper filter
    const filterByDate = (rows: any[], startDate: Date, endDate: Date) =>
      rows.filter(r => {
        const d = new Date(r.metric_date);
        return d >= startDate && d <= endDate;
      });

    const currentRows = filterByDate(summaryRows || [], fromDate, toDate);
    const prevRows = filterByDate(summaryRows || [], prevFromDate, fromDate); // fromDate is exclusive in logic usually? Original used lte(to)

    // Helper aggregator
    const aggregate = (rows: any[]) => ({
      engagement: rows.reduce((acc, r) => acc + (r.engagement || 0), 0),
      impressions: rows.reduce((acc, r) => acc + (r.impressions || 0), 0),
      posts: rows.reduce((acc, r) => acc + (r.post_count || 0), 0),
      likes: rows.reduce((acc, r) => acc + (r.likes || 0), 0),
      comments: rows.reduce((acc, r) => acc + (r.comments || 0), 0),
      shares: rows.reduce((acc, r) => acc + (r.shares || 0), 0),
    });

    const currentStats = aggregate(currentRows);
    const prevStats = aggregate(prevRows);

    // Followers Logic (Keep existing logic or improve if history table exists)
    // Get current period metrics for followers
    const { data: currentAccounts } = await supabase
      .from('social_accounts')
      .select('follower_count')
      .eq('workspace_id', workspace.id);

    const totalFollowers = currentAccounts?.reduce((sum, acc) => sum + (acc.follower_count || 0), 0) || 0;

    // Try to get historical follower counts
    let prevFollowers = totalFollowers;
    try {
      const { data: historyData } = await supabase
        .from('social_account_history')
        .select('follower_count, recorded_at')
        .eq('workspace_id', workspace.id)
        .gte('recorded_at', prevFromDate.toISOString())
        .lt('recorded_at', fromDate.toISOString())
        .order('recorded_at', { ascending: false })
        .limit(1);

      if (historyData && historyData.length > 0) {
        prevFollowers = historyData[0].follower_count || totalFollowers;
      }
    } catch {
      // Table might not exist yet
    }

    // Calculate rates
    const avgEngagementRate = currentStats.posts > 0 && totalFollowers > 0
      ? (currentStats.engagement / totalFollowers) * 100
      : 0;

    const prevEngagementRate = prevStats.posts > 0 && prevFollowers > 0 // Use prevFollowers if available, else totalFollowers
      ? (prevStats.engagement / (prevFollowers > 0 ? prevFollowers : totalFollowers)) * 100
      : 0;

    // Calculate percentage changes
    const calculateChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    const followersChange = calculateChange(totalFollowers, prevFollowers);
    const engagementChange = calculateChange(currentStats.engagement, prevStats.engagement);
    const engagementRateChange = calculateChange(avgEngagementRate, prevEngagementRate);
    const postsChange = calculateChange(currentStats.posts, prevStats.posts);

    // Calculate sparkline data
    const sparklineMap = new Map<string, {
      impressions: number;
      engagement: number;
      followers: number;
      posts: number;
    }>();

    // Initialize map
    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      sparklineMap.set(d.toISOString().split('T')[0], {
        impressions: 0,
        engagement: 0,
        followers: totalFollowers,
        posts: 0,
      });
    }

    // Populate with data from summaryRows (current period)
    currentRows.forEach(row => {
      const date = new Date(row.metric_date).toISOString().split('T')[0];
      const entry = sparklineMap.get(date);
      if (entry) {
        entry.engagement += (row.engagement || 0);
        entry.impressions += (row.impressions || 0);
        entry.posts += (row.post_count || 0);
      }
    });

    const sparklineData = Array.from(sparklineMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({
        date,
        ...data,
        engagementRate: data.followers > 0 ? (data.engagement / data.followers) * 100 : 0,
      }));

    const metrics = {
      totalFollowers,
      followersChange,
      totalEngagement: currentStats.engagement,
      engagementChange,
      avgEngagementRate,
      engagementRateChange,
      totalPosts: currentStats.posts,
      postsChange,
      sparklineData,
    };

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('Analytics overview error', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics overview' },
      { status: 500 }
    );
  }
}

