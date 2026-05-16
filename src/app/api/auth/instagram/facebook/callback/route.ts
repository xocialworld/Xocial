import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, APIError } from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { logger } from '@/lib/logger';
import { exchangeInstagramCode, getInstagramBusinessAccounts } from '@/lib/oauth/instagram';
import { exchangeForLongLivedToken, getFacebookPages } from '@/lib/oauth/facebook';
import { verifyOAuthState } from '@/lib/oauth/state-manager';
import { encryptToken } from '@/lib/encryption';
import { buildOAuthRedirectUrl, getOAuthAppOrigin } from '@/lib/oauth/redirect';

/**
 * GET /api/auth/instagram/facebook/callback
 * Handle Instagram via Facebook Page OAuth callback.
 */
export async function GET(request: NextRequest) {
  const origin = getOAuthAppOrigin(request);
  let callbackRedirectUrl: string | undefined;

  try {
    const { user } = await requireAuth(request);

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      throw new APIError(400, `Instagram via Facebook OAuth error: ${error}`, 'OAUTH_ERROR');
    }

    if (!code) {
      throw new APIError(400, 'Authorization code is missing', 'MISSING_CODE');
    }

    if (!state) {
      throw new APIError(400, 'State parameter is missing', 'MISSING_STATE');
    }

    const stateVerification = await verifyOAuthState(user.id, 'instagram', state);
    if (!stateVerification.valid) {
      throw new APIError(
        403,
        `OAuth state verification failed: ${stateVerification.error}`,
        'INVALID_STATE'
      );
    }
    callbackRedirectUrl = stateVerification.redirectUrl;

    const instagramClientId = process.env.FACEBOOK_APP_ID;
    const instagramClientSecret = process.env.FACEBOOK_APP_SECRET;

    if (!instagramClientId || !instagramClientSecret) {
      throw new APIError(
        500,
        'Instagram via Facebook OAuth is not configured',
        'CONFIGURATION_ERROR'
      );
    }

    const config = {
      clientId: instagramClientId,
      clientSecret: instagramClientSecret,
      redirectUri: `${origin}/api/auth/instagram/facebook/callback`,
    };

    if (!process.env.ENCRYPTION_KEY) {
      throw new APIError(500, 'Encryption key is not configured', 'CONFIGURATION_ERROR');
    }

    logger.info('[Instagram via Facebook Callback] Starting callback processing');
    const tokenResponse = await exchangeInstagramCode(config, code);

    const longLivedToken = await exchangeForLongLivedToken(
      config.clientId,
      config.clientSecret,
      tokenResponse.access_token
    );

    const pages = await getFacebookPages(longLivedToken.access_token);
    logger.info(`[Instagram via Facebook Callback] Found ${pages.length} Facebook pages`);

    if (pages.length === 0) {
      throw new APIError(
        404,
        'No Facebook Pages were returned. The Instagram account must be linked to a Facebook Page you can manage.',
        'NO_PAGES'
      );
    }

    const workspaceId = stateVerification.workspaceId;
    if (!workspaceId) {
      throw new APIError(
        400,
        'Workspace context is missing from OAuth state. Please restart the connection from the selected workspace.',
        'WORKSPACE_REQUIRED'
      );
    }

    const instagramAccounts = [];
    for (const page of pages) {
      try {
        const igAccount = await getInstagramBusinessAccounts(page.access_token, page.id);
        if (igAccount) {
          instagramAccounts.push({
            ...igAccount,
            pageId: page.id,
            pageAccessToken: page.access_token,
            pageName: page.name,
            pageTasks: page.tasks || [],
          });
        }
      } catch (error) {
        logger.warn(
          `[Instagram via Facebook Callback] No Instagram account for page ${page.name}:`,
          {
            error: error as Error,
          }
        );
      }
    }

    if (instagramAccounts.length === 0) {
      throw new APIError(
        404,
        'No linked Instagram Professional accounts were found. Link a Business or Creator Instagram account to a Facebook Page or use Instagram Professional Account login.',
        'NO_INSTAGRAM_ACCOUNTS'
      );
    }

    const {
      userClient: workspaceSupabase,
      usage,
      limits,
    } = await requireWorkspaceContext(request, {
      workspaceId,
      roles: ['owner', 'admin', 'manager'],
    });

    if (
      limits.max_social_profiles !== null &&
      limits.max_social_profiles !== undefined &&
      usage.social_profiles_count + instagramAccounts.length > limits.max_social_profiles
    ) {
      throw new APIError(
        402,
        `Connecting these Instagram accounts would exceed your ${limits.plan} social account limit`,
        'PLAN_LIMIT_EXCEEDED',
        {
          current: usage.social_profiles_count,
          adding: instagramAccounts.length,
          limit: limits.max_social_profiles,
        }
      );
    }

    const accounts = await Promise.all(
      instagramAccounts.map(async (igAccount) => {
        const encryptedAccessToken = encryptToken(igAccount.pageAccessToken);
        const encryptedUserToken = encryptToken(longLivedToken.access_token);

        const { data, error } = await workspaceSupabase
          .from('social_accounts')
          .upsert(
            {
              workspace_id: workspaceId,
              platform: 'instagram',
              assigned_user_id: user.id,
              account_id: igAccount.id,
              account_name: igAccount.name || igAccount.username,
              account_handle: igAccount.username,
              account_avatar: igAccount.profile_picture_url,
              follower_count: igAccount.followers_count || 0,
              access_token: encryptedAccessToken,
              refresh_token: encryptedUserToken,
              token_expires_at: new Date(
                Date.now() + (longLivedToken.expires_in || 5184000) * 1000
              ).toISOString(),
              connected_at: new Date().toISOString(),
              is_active: true,
              metadata: {
                followers_count: igAccount.followers_count,
                follows_count: igAccount.follows_count,
                media_count: igAccount.media_count,
                followsCount: igAccount.follows_count,
                mediaCount: igAccount.media_count,
                facebook_page_id: igAccount.pageId,
                facebook_page_name: igAccount.pageName,
                facebook_page_tasks: igAccount.pageTasks,
                connected_via: 'facebook_login',
              },
            },
            {
              onConflict: 'workspace_id,platform,account_id',
              ignoreDuplicates: false,
            }
          )
          .select()
          .single();

        if (error) {
          logger.error('[Instagram via Facebook Callback] Error storing account:', error);
          throw new APIError(500, 'Failed to store Instagram account', 'DATABASE_ERROR');
        }

        return data;
      })
    );

    const successUrl = buildOAuthRedirectUrl(callbackRedirectUrl, origin, {
      success: 'instagram_connected',
      accounts: accounts.length,
      connection: 'facebook_page',
    });

    return NextResponse.redirect(successUrl.toString());
  } catch (error) {
    logger.error('[Instagram via Facebook Callback] Error:', error as Error);

    const errorMessage =
      error instanceof APIError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Failed to connect Instagram account through Facebook Page';

    const errorUrl = buildOAuthRedirectUrl(callbackRedirectUrl, origin, {
      error: errorMessage,
    });

    return NextResponse.redirect(errorUrl.toString());
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
