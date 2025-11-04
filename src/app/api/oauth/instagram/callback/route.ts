import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  getUserWorkspace,
  APIError,
} from '@/lib/api-middleware';
import { exchangeFacebookCode, getFacebookLongLivedToken, getFacebookPages } from '@/lib/oauth/facebook';
import { getInstagramBusinessAccounts } from '@/lib/oauth/instagram';

/**
 * GET /api/oauth/instagram/callback
 * Handle Instagram OAuth callback (via Facebook)
 * Instagram Business accounts are accessed through Facebook Graph API
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    throw new APIError(400, `Instagram OAuth error: ${error}`, 'OAUTH_ERROR');
  }

  if (!code) {
    throw new APIError(400, 'Authorization code is missing', 'MISSING_CODE');
  }

  // Exchange code for access token (using Facebook OAuth)
  const config = {
    clientId: process.env.FACEBOOK_APP_ID!,
    clientSecret: process.env.FACEBOOK_APP_SECRET!,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/instagram/callback`,
  };

  const tokenResponse = await exchangeFacebookCode(config, code);
  const longLivedToken = await getFacebookLongLivedToken(config, tokenResponse.access_token);

  // Get Facebook pages
  const pages = await getFacebookPages(longLivedToken.access_token);

  // Get user's workspace
  const workspace = await getUserWorkspace(user.id);

  // For each page, check if it has an Instagram Business account
  const accounts = [];
  for (const page of pages) {
    try {
      const igAccount = await getInstagramBusinessAccounts(
        page.access_token,
        page.id
      );

      if (igAccount) {
        const { data, error } = await supabase
          .from('social_accounts')
          .upsert(
            {
              workspace_id: workspace.id,
              platform: 'instagram',
              account_id: igAccount.id,
              account_name: igAccount.name || igAccount.username,
              account_handle: igAccount.username,
              account_avatar: igAccount.profile_picture_url,
              follower_count: igAccount.followers_count || 0,
              access_token: page.access_token,
              token_expires_at: new Date(
                Date.now() + longLivedToken.expires_in * 1000
              ).toISOString(),
              is_active: true,
              metadata: {
                facebook_page_id: page.id,
                facebook_page_name: page.name,
              },
            },
            {
              onConflict: 'workspace_id,platform,account_id',
            }
          )
          .select()
          .single();

        if (error) throw error;
        accounts.push(data);
      }
    } catch (err) {
      console.error(`Failed to get Instagram account for page ${page.id}:`, err);
      // Continue with other pages
    }
  }

  if (accounts.length === 0) {
    throw new APIError(
      404,
      'No Instagram Business accounts found. Please ensure you have an Instagram Business account connected to your Facebook page.',
      'NO_INSTAGRAM_ACCOUNTS'
    );
  }

  return successResponse({
    message: 'Instagram accounts connected successfully',
    accounts,
  });
});

