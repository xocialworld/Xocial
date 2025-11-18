import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  getUserWorkspace,
  APIError,
} from '@/lib/api-middleware';
import {
  exchangeLinkedInCode,
  getLinkedInProfile,
  getLinkedInOrganizations,
} from '@/lib/oauth/linkedin';
import { verifyOAuthState } from '@/lib/oauth/state-manager';

/**
 * GET /api/oauth/linkedin/callback
 * Handle LinkedIn OAuth callback
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    throw new APIError(
      400,
      `LinkedIn OAuth error: ${errorDescription || error}`,
      'OAUTH_ERROR'
    );
  }

  if (!code) {
    throw new APIError(400, 'Authorization code is missing', 'MISSING_CODE');
  }

  // Verify state parameter for CSRF protection
  if (!state) {
    throw new APIError(400, 'State parameter is missing', 'MISSING_STATE');
  }

  const stateVerification = await verifyOAuthState(user.id, 'linkedin', state);
  if (!stateVerification.valid) {
    throw new APIError(
      403,
      `OAuth state verification failed: ${stateVerification.error}`,
      'INVALID_STATE'
    );
  }

  // Exchange code for access token
  const config = {
    clientId: process.env.LINKEDIN_CLIENT_ID!,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/linkedin/callback`,
  };

  const tokenResponse = await exchangeLinkedInCode(config, code);

  // Get user profile
  const profile = await getLinkedInProfile(tokenResponse.access_token);

  // Get user's workspace
  const workspace = await getUserWorkspace(user.id);

  // Store personal LinkedIn account
  const { data: personalAccount, error: personalError } = await supabase
    .from('social_accounts')
    .upsert(
      {
        workspace_id: workspace.id,
        platform: 'linkedin',
        account_id: profile.sub,
        account_name: profile.name,
        account_handle: profile.email?.split('@')[0] || profile.name,
        account_avatar: profile.picture,
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token,
        token_expires_at: new Date(
          Date.now() + tokenResponse.expires_in * 1000
        ).toISOString(),
        is_active: true,
        metadata: {
          email: profile.email,
          locale: profile.locale,
        },
      },
      {
        onConflict: 'workspace_id,platform,account_id',
      }
    )
    .select()
    .single();

  if (personalError) throw personalError;

  const accounts = [personalAccount];

  // Try to get organization pages (if user has admin access)
  try {
    const organizations = await getLinkedInOrganizations(tokenResponse.access_token);

    if (organizations.length > 0) {
      const orgAccounts = await Promise.all(
        organizations.map(async (org) => {
          const { data, error } = await supabase
            .from('social_accounts')
            .upsert(
              {
                workspace_id: workspace.id,
                platform: 'linkedin',
                account_id: org.id,
                account_name: org.localizedName,
                account_handle: org.vanityName || org.localizedName,
                account_avatar: org.logoV2?.original,
                access_token: tokenResponse.access_token,
                refresh_token: tokenResponse.refresh_token,
                token_expires_at: new Date(
                  Date.now() + tokenResponse.expires_in * 1000
                ).toISOString(),
                is_active: true,
                metadata: {
                  type: 'organization',
                  urn: `urn:li:organization:${org.id}`,
                },
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

      accounts.push(...orgAccounts);
    }
  } catch (orgError) {
    // Organizations might not be available if user doesn't have admin access
    console.warn('Could not fetch LinkedIn organizations:', orgError);
  }

  return successResponse({
    message: `LinkedIn account${accounts.length > 1 ? 's' : ''} connected successfully`,
    accounts,
  });
});

