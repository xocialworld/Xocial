import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, APIError } from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { logger } from '@/lib/logger';
import {
  exchangeInstagramLoginCode,
  exchangeInstagramLongLivedToken,
  getInstagramLoginAccountInfo,
} from '@/lib/oauth/instagram';
import { verifyOAuthState } from '@/lib/oauth/state-manager';
import { encryptToken } from '@/lib/encryption';
import { buildOAuthRedirectUrl, getOAuthAppOrigin } from '@/lib/oauth/redirect';

/**
 * GET /api/auth/instagram/callback
 * Handle Instagram API with Instagram Login callback.
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
    const errorReason = searchParams.get('error_reason');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      throw new APIError(
        400,
        errorDescription || errorReason || `Instagram OAuth error: ${error}`,
        'OAUTH_ERROR'
      );
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

    if (!process.env.INSTAGRAM_CLIENT_ID || !process.env.INSTAGRAM_CLIENT_SECRET) {
      throw new APIError(500, 'Instagram Login is not configured', 'CONFIGURATION_ERROR');
    }

    if (!process.env.ENCRYPTION_KEY) {
      throw new APIError(500, 'Encryption key is not configured', 'CONFIGURATION_ERROR');
    }

    const workspaceId = stateVerification.workspaceId;
    if (!workspaceId) {
      throw new APIError(
        400,
        'Workspace context is missing from OAuth state. Please restart the connection from the selected workspace.',
        'WORKSPACE_REQUIRED'
      );
    }

    const config = {
      clientId: process.env.INSTAGRAM_CLIENT_ID!,
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET!,
      redirectUri: `${origin}/api/auth/instagram/callback`,
    };

    logger.info('[Instagram Login Callback] Starting callback processing');
    const shortLivedToken = await exchangeInstagramLoginCode(config, code);
    const longLivedToken = await exchangeInstagramLongLivedToken(
      { clientSecret: config.clientSecret },
      shortLivedToken.access_token
    );
    const accountInfo = await getInstagramLoginAccountInfo(longLivedToken.access_token);

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
      usage.social_profiles_count + 1 > limits.max_social_profiles
    ) {
      throw new APIError(
        402,
        `Connecting this Instagram account would exceed your ${limits.plan} social account limit`,
        'PLAN_LIMIT_EXCEEDED',
        {
          current: usage.social_profiles_count,
          adding: 1,
          limit: limits.max_social_profiles,
        }
      );
    }

    const encryptedLongLivedToken = encryptToken(longLivedToken.access_token);
    const expiresAt = new Date(
      Date.now() + (longLivedToken.expires_in || 5184000) * 1000
    ).toISOString();

    const { data: account, error: databaseError } = await workspaceSupabase
      .from('social_accounts')
      .upsert(
        {
          workspace_id: workspaceId,
          platform: 'instagram',
          assigned_user_id: user.id,
          account_id: accountInfo.id || shortLivedToken.user_id,
          account_name: accountInfo.name || accountInfo.username,
          account_handle: accountInfo.username,
          account_avatar: accountInfo.profile_picture_url,
          follower_count: accountInfo.followers_count || 0,
          access_token: encryptedLongLivedToken,
          refresh_token: encryptedLongLivedToken,
          token_expires_at: expiresAt,
          connected_at: new Date().toISOString(),
          is_active: true,
          metadata: {
            connected_via: 'instagram_login',
            account_type: accountInfo.account_type,
            followers_count: accountInfo.followers_count,
            follows_count: accountInfo.follows_count,
            media_count: accountInfo.media_count,
            followsCount: accountInfo.follows_count,
            mediaCount: accountInfo.media_count,
            permissions: shortLivedToken.permissions || [],
          },
        },
        {
          onConflict: 'workspace_id,platform,account_id',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (databaseError) {
      logger.error('[Instagram Login Callback] Error storing account:', databaseError);
      throw new APIError(500, 'Failed to store Instagram account', 'DATABASE_ERROR');
    }

    logger.info('[Instagram Login Callback] Successfully stored account', {
      accountId: account?.id,
      instagramAccountId: accountInfo.id,
    });

    const successUrl = buildOAuthRedirectUrl(callbackRedirectUrl, origin, {
      success: 'instagram_connected',
      accounts: 1,
      connection: 'instagram_login',
    });

    return NextResponse.redirect(successUrl.toString());
  } catch (error) {
    logger.error('[Instagram Login Callback] Error:', error as Error);

    const errorMessage =
      error instanceof APIError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Failed to connect Instagram account';

    const errorUrl = buildOAuthRedirectUrl(callbackRedirectUrl, origin, {
      error: errorMessage,
    });

    return NextResponse.redirect(errorUrl.toString());
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
