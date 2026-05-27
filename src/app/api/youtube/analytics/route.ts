import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandler,
  APIError,
} from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { decryptToken } from '@/lib/encryption';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/youtube/analytics
 * Fetch detailed YouTube Analytics for a video or channel
 * 
 * Query params:
 * - accountId: string (UUID of social_accounts record)
 * - videoId?: string (optional - for video-specific analytics)
 * - startDate?: string (ISO date, default: 30 days ago)
 * - endDate?: string (ISO date, default: today)
 * - metrics?: string (comma-separated metrics)
 * - dimensions?: string (comma-separated dimensions)
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user, userClient: supabase, workspace } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager', 'creator', 'analyst'],
  });
  
  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get('accountId');
  const videoId = searchParams.get('videoId');
  const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
  
  // Default metrics for comprehensive analytics
  const defaultMetrics = [
    'views',
    'estimatedMinutesWatched',
    'averageViewDuration',
    'averageViewPercentage',
    'subscribersGained',
    'subscribersLost',
    'likes',
    'dislikes',
    'comments',
    'shares',
    'annotationClickThroughRate',
    'annotationCloseRate',
    'cardClickRate',
    'cardTeaserClickRate',
  ].join(',');
  
  const metrics = searchParams.get('metrics') || defaultMetrics;
  const dimensions = searchParams.get('dimensions') || 'day';
  
  if (!accountId) {
    throw new APIError(400, 'accountId parameter is required', 'MISSING_ACCOUNT_ID');
  }
  
  // Get YouTube account
  const { data: account, error: accountError } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('id', accountId)
    .eq('workspace_id', workspace.id)
    .eq('platform', 'youtube')
    .eq('is_active', true)
    .single();
  
  if (accountError || !account) {
    throw new APIError(404, 'YouTube account not found', 'ACCOUNT_NOT_FOUND');
  }
  
  // Decrypt access token
  const accessToken = decryptToken(account.access_token);
  
  try {
    // Build YouTube Analytics API request
    const analyticsParams = new URLSearchParams({
      ids: `channel==${account.account_id}`,
      startDate,
      endDate,
      metrics,
      dimensions,
    });
    
    // Add video filter if videoId is provided
    if (videoId) {
      analyticsParams.append('filters', `video==${videoId}`);
    }
    
    // Fetch analytics from YouTube Analytics API
    const analyticsResponse = await fetch(
      `https://youtubeanalytics.googleapis.com/v2/reports?${analyticsParams.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      }
    );
    
    if (!analyticsResponse.ok) {
      const error = await analyticsResponse.json();
      throw new Error(error.error?.message || 'Failed to fetch YouTube analytics');
    }
    
    const analyticsData = await analyticsResponse.json();
    
    // Fetch additional demographics data
    const demographicsParams = new URLSearchParams({
      ids: `channel==${account.account_id}`,
      startDate,
      endDate,
      metrics: 'viewerPercentage',
      dimensions: 'ageGroup,gender',
    });
    
    if (videoId) {
      demographicsParams.append('filters', `video==${videoId}`);
    }
    
    const demographicsResponse = await fetch(
      `https://youtubeanalytics.googleapis.com/v2/reports?${demographicsParams.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      }
    );
    
    let demographics = null;
    if (demographicsResponse.ok) {
      demographics = await demographicsResponse.json();
    }
    
    // Fetch traffic sources data
    const trafficParams = new URLSearchParams({
      ids: `channel==${account.account_id}`,
      startDate,
      endDate,
      metrics: 'views',
      dimensions: 'insightTrafficSourceType',
      sort: '-views',
    });
    
    if (videoId) {
      trafficParams.append('filters', `video==${videoId}`);
    }
    
    const trafficResponse = await fetch(
      `https://youtubeanalytics.googleapis.com/v2/reports?${trafficParams.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      }
    );
    
    let trafficSources = null;
    if (trafficResponse.ok) {
      trafficSources = await trafficResponse.json();
    }
    
    // Fetch device type data
    const deviceParams = new URLSearchParams({
      ids: `channel==${account.account_id}`,
      startDate,
      endDate,
      metrics: 'views',
      dimensions: 'deviceType',
      sort: '-views',
    });
    
    if (videoId) {
      deviceParams.append('filters', `video==${videoId}`);
    }
    
    const deviceResponse = await fetch(
      `https://youtubeanalytics.googleapis.com/v2/reports?${deviceParams.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      }
    );
    
    let deviceTypes = null;
    if (deviceResponse.ok) {
      deviceTypes = await deviceResponse.json();
    }
    
    // Fetch geography data
    const geoParams = new URLSearchParams({
      ids: `channel==${account.account_id}`,
      startDate,
      endDate,
      metrics: 'views',
      dimensions: 'country',
      sort: '-views',
      maxResults: '20',
    });
    
    if (videoId) {
      geoParams.append('filters', `video==${videoId}`);
    }
    
    const geoResponse = await fetch(
      `https://youtubeanalytics.googleapis.com/v2/reports?${geoParams.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      }
    );
    
    let geography = null;
    if (geoResponse.ok) {
      geography = await geoResponse.json();
    }
    
    // Transform data into user-friendly format
    const transformedData = {
      overview: transformAnalyticsData(analyticsData),
      demographics: demographics ? transformDemographicsData(demographics) : null,
      trafficSources: trafficSources ? transformTrafficSourcesData(trafficSources) : null,
      deviceTypes: deviceTypes ? transformDeviceTypesData(deviceTypes) : null,
      geography: geography ? transformGeographyData(geography) : null,
      rawData: {
        columnHeaders: analyticsData.columnHeaders,
        rows: analyticsData.rows,
      },
    };
    
    logger.info(`Fetched YouTube analytics for account ${accountId}`, {
      userId: user.id,
      videoId,
      dateRange: `${startDate} to ${endDate}`,
    });
    
    return NextResponse.json({
      success: true,
      data: transformedData,
    });
  } catch (error: any) {
    logger.error(`Failed to fetch YouTube analytics: ${error.message}`, error, {
      userId: user.id,
      accountId,
      videoId,
    });
    
    throw new APIError(500, `Failed to fetch YouTube analytics: ${error.message}`, 'ANALYTICS_FAILED');
  }
});

/**
 * Transform analytics data into a more readable format
 */
function transformAnalyticsData(data: any) {
  if (!data.rows || data.rows.length === 0) {
    return {
      totalViews: 0,
      totalWatchTime: 0,
      averageViewDuration: 0,
      averageViewPercentage: 0,
      subscribersGained: 0,
      subscribersLost: 0,
      likes: 0,
      dislikes: 0,
      comments: 0,
      shares: 0,
      engagement: 0,
      timeSeries: [],
    };
  }
  
  const headers = data.columnHeaders.map((h: any) => h.name);
  const rows = data.rows;
  
  // Calculate totals and averages
  const totals: any = {};
  
  rows.forEach((row: any[]) => {
    row.forEach((value: any, index: number) => {
      const header = headers[index];
      if (header !== 'day' && typeof value === 'number') {
        if (!totals[header]) totals[header] = 0;
        totals[header] += value;
      }
    });
  });
  
  // Calculate averages for rate metrics
  const avgMetrics = ['averageViewDuration', 'averageViewPercentage'];
  avgMetrics.forEach(metric => {
    if (totals[metric]) {
      totals[metric] = totals[metric] / rows.length;
    }
  });
  
  // Calculate engagement rate
  const engagement = totals.likes + totals.comments + totals.shares;
  const engagementRate = totals.views > 0 ? (engagement / totals.views) * 100 : 0;
  
  // Transform time series data
  const timeSeries = rows.map((row: any[]) => {
    const dataPoint: any = {};
    row.forEach((value: any, index: number) => {
      dataPoint[headers[index]] = value;
    });
    return dataPoint;
  });
  
  return {
    totalViews: totals.views || 0,
    totalWatchTime: totals.estimatedMinutesWatched || 0,
    averageViewDuration: Math.round(totals.averageViewDuration || 0),
    averageViewPercentage: Math.round(totals.averageViewPercentage || 0),
    subscribersGained: totals.subscribersGained || 0,
    subscribersLost: totals.subscribersLost || 0,
    netSubscribers: (totals.subscribersGained || 0) - (totals.subscribersLost || 0),
    likes: totals.likes || 0,
    dislikes: totals.dislikes || 0,
    comments: totals.comments || 0,
    shares: totals.shares || 0,
    engagement,
    engagementRate: engagementRate.toFixed(2),
    timeSeries,
  };
}

/**
 * Transform demographics data
 */
function transformDemographicsData(data: any) {
  if (!data.rows || data.rows.length === 0) return null;
  
  const demographics: any = {
    ageGroups: {},
    genderDistribution: {},
  };
  
  data.rows.forEach((row: any[]) => {
    const [ageGroup, gender, percentage] = row;
    
    if (!demographics.ageGroups[ageGroup]) {
      demographics.ageGroups[ageGroup] = 0;
    }
    demographics.ageGroups[ageGroup] += percentage;
    
    if (!demographics.genderDistribution[gender]) {
      demographics.genderDistribution[gender] = 0;
    }
    demographics.genderDistribution[gender] += percentage;
  });
  
  return demographics;
}

/**
 * Transform traffic sources data
 */
function transformTrafficSourcesData(data: any) {
  if (!data.rows || data.rows.length === 0) return null;
  
  return data.rows.map((row: any[]) => ({
    source: row[0],
    views: row[1],
  }));
}

/**
 * Transform device types data
 */
function transformDeviceTypesData(data: any) {
  if (!data.rows || data.rows.length === 0) return null;
  
  return data.rows.map((row: any[]) => ({
    deviceType: row[0],
    views: row[1],
  }));
}

/**
 * Transform geography data
 */
function transformGeographyData(data: any) {
  if (!data.rows || data.rows.length === 0) return null;
  
  return data.rows.map((row: any[]) => ({
    country: row[0],
    views: row[1],
  }));
}

export const runtime = 'nodejs';
