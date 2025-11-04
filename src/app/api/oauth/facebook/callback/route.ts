import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  getUserWorkspace,
  APIError,
} from '@/lib/api-middleware';
import {
  exchangeFacebookCode,
  getFacebookLongLivedToken,
  getFacebookProfile,
  getFacebookPages,
} from '@/lib/oauth/facebook';

/**
 * GET /api/oauth/facebook/callback
 * Handle Facebook OAuth callback
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    throw new APIError(400, `Facebook OAuth error: ${error}`, 'OAUTH_ERROR');
  }

  if (!code) {
    throw new APIError(400, 'Authorization code is missing', 'MISSING_CODE');
  }

  // TODO: Verify state parameter matches what was stored in session

  // Exchange code for access token
  const config = {
    clientId: process.env.FACEBOOK_APP_ID!,
    clientSecret: process.env.FACEBOOK_APP_SECRET!,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/facebook/callback`,
  };

  const tokenResponse = await exchangeFacebookCode(config, code);

  // Get long-lived token
  const longLivedToken = await getFacebookLongLivedToken(
    config,
    tokenResponse.access_token
  );

  // Get user profile
  const profile = await getFacebookProfile(longLivedToken.access_token);

  // Get user's pages
  const pages = await getFacebookPages(longLivedToken.access_token);

  // Get user's workspace
  const workspace = await getUserWorkspace(user.id);

  // Store each page as a separate social account
  const accounts = await Promise.all(
    pages.map(async (page) => {
      const { data, error } = await supabase
        .from('social_accounts')
        .upsert(
          {
            workspace_id: workspace.id,
            platform: 'facebook',
            account_id: page.id,
            account_name: page.name,
            access_token: page.access_token,
            token_expires_at: new Date(
              Date.now() + longLivedToken.expires_in * 1000
            ).toISOString(),
            is_active: true,
          },
          {
            onConflict: 'workspace_id,platform,account_id',
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    })
  );

  return successResponse({
    message: 'Facebook pages connected successfully',
    accounts,
  });
});

