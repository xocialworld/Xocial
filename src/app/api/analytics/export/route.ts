/**
 * Analytics Export API
 * Export analytics data to CSV or JSON
 * GET /api/analytics/export?format=csv|json&dateRange=30
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  getUserWorkspace,
  APIError,
} from '@/lib/api-middleware';
import { logger } from '@/lib/logger';

/**
 * Convert data to CSV format
 */
function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  // Get headers from first object
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');

  // Convert rows
  const csvRows = data.map((row) => {
    return headers
      .map((header) => {
        const value = row[header];
        // Escape commas and quotes
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(',');
  });

  return [csvHeaders, ...csvRows].join('\n');
}

/**
 * GET /api/analytics/export
 * Export analytics data
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);
  
  const workspace = await getUserWorkspace(user.id, supabase);
  
  // Get query parameters
  const searchParams = request.nextUrl.searchParams;
  const format = searchParams.get('format') || 'csv';
  const dateRange = parseInt(searchParams.get('dateRange') || '30');
  const platform = searchParams.get('platform');

  logger.info('Analytics export requested', {
    userId: user.id,
    workspaceId: workspace.id,
    exportFormat: format,
    dateRange,
    platform,
  });

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - dateRange);

  // Fetch analytics data
  let query = supabase
    .from('post_analytics')
    .select(`
      *,
      posts!inner(
        id,
        content,
        status,
        published_at,
        platforms,
        workspace_id
      )
    `)
    .eq('posts.workspace_id', workspace.id)
    .gte('fetched_at', startDate.toISOString())
    .lte('fetched_at', endDate.toISOString())
    .order('fetched_at', { ascending: false });

  if (platform) {
    query = query.eq('platform', platform);
  }

  const { data: analytics, error } = await query;

  if (error) {
    throw new APIError(500, error.message, 'DATABASE_ERROR');
  }

  if (!analytics || analytics.length === 0) {
    throw new APIError(404, 'No data to export', 'NO_DATA');
  }

  // Transform data for export
  const exportData = analytics.map((item: any) => ({
    date: new Date(item.fetched_at).toLocaleDateString(),
    platform: item.platform,
    post_content: item.posts.content?.text || item.posts.content || '',
    published_at: item.posts.published_at ? new Date(item.posts.published_at).toLocaleString() : '',
    impressions: item.impressions || 0,
    reach: item.reach || 0,
    engagement: item.engagement || 0,
    likes: item.likes || 0,
    comments: item.comments || 0,
    shares: item.shares || 0,
    saves: item.saves || 0,
    clicks: item.clicks || 0,
    video_views: item.video_views || 0,
    engagement_rate: item.engagement_rate || 0,
  }));

  // Return based on format
  if (format === 'json') {
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="analytics-export-${Date.now()}.json"`,
      },
    });
  }

  // CSV format
  const csv = convertToCSV(exportData);
  
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="analytics-export-${Date.now()}.csv"`,
    },
  });
});

export const dynamic = 'force-dynamic';
