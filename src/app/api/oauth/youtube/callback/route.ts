import { NextRequest, NextResponse } from 'next/server';
import { getUserWorkspace } from '@/lib/api-middleware';
import {
  exchangeYouTubeCode,
  getYouTubeChannels,
} from '@/lib/oauth/youtube';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

/**
 * GET /api/oauth/youtube/callback
 * Handle YouTube/Google OAuth callback
 */
export async function GET(request: NextRequest) {
  try {
    // Get user ID from OAuth cookie
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    console.log('[YouTube Callback] All cookies:', allCookies.map(c => c.name));
    
    const userId = cookieStore.get('oauth_user_youtube')?.value;
    console.log('[YouTube Callback] User ID from cookie:', userId);
    
    if (!userId) {
      console.error('[YouTube Callback] No user ID found in cookie');
      const loginUrl = new URL('/auth/login', process.env.NEXT_PUBLIC_APP_URL);
      loginUrl.searchParams.set('error', 'Session expired. Please try connecting again.');
      return NextResponse.redirect(loginUrl);
    }
    
    // Create Supabase client
    const supabase = await createClient();
    
    // Create a user object from the stored ID
    const user = { id: userId };
    
    // Clear the OAuth cookies
    cookieStore.delete('oauth_user_youtube');
    cookieStore.delete('oauth_state_youtube');

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('[YouTube Callback] OAuth error:', error);
      const accountsUrl = new URL('/x', process.env.NEXT_PUBLIC_APP_URL);
      accountsUrl.searchParams.set('error', `YouTube OAuth error: ${error}`);
      return NextResponse.redirect(accountsUrl);
    }

    if (!code) {
      console.error('[YouTube Callback] No authorization code');
      const accountsUrl = new URL('/x', process.env.NEXT_PUBLIC_APP_URL);
      accountsUrl.searchParams.set('error', 'Authorization code is missing');
      return NextResponse.redirect(accountsUrl);
    }

    console.log('[YouTube Callback] Exchanging code for token...');

    // Exchange code for access token
    const config = {
      clientId: process.env.YOUTUBE_CLIENT_ID!,
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET!,
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/youtube/callback`,
    };

    const tokenResponse = await exchangeYouTubeCode(config, code);
    console.log('[YouTube Callback] Token exchange successful, fetching channels...');

    // Get user's YouTube channels
    const channels = await getYouTubeChannels(tokenResponse.access_token);
    console.log('[YouTube Callback] Found channels:', channels.length);

    if (channels.length === 0) {
      const accountsUrl = new URL('/x', process.env.NEXT_PUBLIC_APP_URL);
      accountsUrl.searchParams.set('error', 'No YouTube channels found for this account');
      return NextResponse.redirect(accountsUrl);
    }

    // Get user's workspace
    const workspace = await getUserWorkspace(user.id);

    // Store each channel as a separate social account
    const accounts = await Promise.all(
      channels.map(async (channel) => {
        console.log('[YouTube Callback] Storing channel:', channel.snippet.title);
        
        const { data, error } = await supabase
          .from('social_accounts')
          .upsert(
            {
              workspace_id: workspace.id,
              platform: 'youtube',
              platform_user_id: channel.id,
              account_name: channel.snippet.title,
              account_handle: channel.snippet.customUrl || channel.snippet.title,
              profile_picture_url:
                channel.snippet.thumbnails.high?.url ||
                channel.snippet.thumbnails.medium?.url ||
                channel.snippet.thumbnails.default?.url,
              follower_count: channel.statistics
                ? parseInt(channel.statistics.subscriberCount)
                : 0,
              access_token: tokenResponse.access_token,
              refresh_token: tokenResponse.refresh_token,
              token_expires_at: new Date(
                Date.now() + tokenResponse.expires_in * 1000
              ).toISOString(),
              is_active: true,
              metadata: {
                description: channel.snippet.description,
                statistics: channel.statistics,
                brandingSettings: channel.brandingSettings,
                viewCount: channel.statistics?.viewCount,
                videoCount: channel.statistics?.videoCount,
              },
            },
            {
              onConflict: 'workspace_id,platform,platform_user_id',
            }
          )
          .select()
          .single();

        if (error) {
          console.error('[YouTube Callback] Error storing channel:', error);
          throw error;
        }
        
        return data;
      })
    );

    console.log('[YouTube Callback] Successfully stored', accounts.length, 'channel(s)');

    // Redirect to accounts page with success message
    const accountsUrl = new URL('/x', process.env.NEXT_PUBLIC_APP_URL);
    accountsUrl.searchParams.set(
      'success',
      `Successfully connected ${accounts.length} YouTube channel${accounts.length > 1 ? 's' : ''}`
    );
    return NextResponse.redirect(accountsUrl);

  } catch (error: any) {
    console.error('[YouTube Callback] Unexpected error:', error);
    const accountsUrl = new URL('/x', process.env.NEXT_PUBLIC_APP_URL);
    accountsUrl.searchParams.set(
      'error',
      error.message || 'Failed to connect YouTube account'
    );
    return NextResponse.redirect(accountsUrl);
  }
}
