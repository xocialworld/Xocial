import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIError } from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { logger } from '@/lib/logger';
import { generateState, storeOAuthState } from '@/lib/oauth/state-manager';
import { getYouTubeAuthUrl } from '@/lib/oauth/youtube';
import { getFacebookAuthUrl } from '@/lib/oauth/facebook';
import { getLinkedInAuthUrl } from '@/lib/oauth/linkedin';
import { getTikTokAuthUrl } from '@/lib/oauth/tiktok';
import { generatePKCE, getTwitterAuthUrl } from '@/lib/platforms/twitter';
import { getInstagramAuthUrl, getInstagramFacebookAuthUrl } from '@/lib/oauth/instagram';
import { OAUTH_CONFIG, OAuthPlatform } from '@/lib/oauth/oauth-config';
import {
  buildOAuthRedirectUrl,
  getOAuthAppOrigin,
  sanitizeOAuthRedirect,
} from '@/lib/oauth/redirect';
import {
  assertTwitterLiveApiEnabled,
  isTwitterApiCreditsRequiredError,
  TWITTER_CREDITS_REQUIRED_CODE,
} from '@/lib/twitter-api-mode';
import {
  applyDevAdminPlanOverride,
  getConfiguredDevAdminPlan,
  type EntitlementUser,
} from '@/lib/dev-admin-entitlements';

function getFallbackLimitsForPlan(plan: string) {
  if (plan === 'enterprise') {
    return {
      plan,
      max_social_profiles: 999,
      max_workspaces: 999,
      max_users: 999,
      max_scheduled_posts: null,
      ai_enabled: true,
      advanced_analytics: true,
      approval_workflows: true,
      engagement_inbox: true,
      custom_branding: true,
    };
  }

  return {
    plan,
    max_social_profiles: 3,
    max_workspaces: 1,
    max_users: 1,
    max_scheduled_posts: 10,
    ai_enabled: false,
    advanced_analytics: false,
    approval_workflows: false,
    engagement_inbox: false,
    custom_branding: false,
  };
}

async function getEntitlementUser(serviceClient: any, user: EntitlementUser): Promise<EntitlementUser> {
  if (user.email || !user.id) {
    return user;
  }

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: profile?.email ?? user.email ?? null,
  };
}

async function applyAuthConnectPlanOverride(
  serviceClient: any,
  user: EntitlementUser,
  limits: Record<string, any>
) {
  const entitlementUser = await getEntitlementUser(serviceClient, user);
  const effectivePlan = applyDevAdminPlanOverride(limits.plan ?? 'free', entitlementUser);

  if (effectivePlan === limits.plan) {
    return {
      limits,
      entitlementUser,
      devAdminPlan: getConfiguredDevAdminPlan(entitlementUser),
    };
  }

  const { data: planLimits } = await serviceClient
    .from('plan_limits')
    .select('*')
    .eq('plan', effectivePlan)
    .maybeSingle();

  return {
    limits: {
      ...limits,
      ...(planLimits ?? getFallbackLimitsForPlan(effectivePlan)),
      plan: effectivePlan,
    },
    entitlementUser,
    devAdminPlan: getConfiguredDevAdminPlan(entitlementUser),
  };
}

/**
 * GET /api/auth/connect?platform=youtube&redirect=/x
 * Unified OAuth initiation endpoint for all platforms
 * Follows SRS pattern: /api/auth/connect
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const platform = searchParams.get('platform') as OAuthPlatform;
  const instagramConnection = searchParams.get('connection') || 'instagram_login';
  const appUrl = getOAuthAppOrigin(request);
  const redirectUrl = sanitizeOAuthRedirect(searchParams.get('redirect'), appUrl);

  if (!platform) {
    throw new APIError(400, 'Platform parameter is required', 'MISSING_PLATFORM');
  }

  if (!OAUTH_CONFIG[platform]) {
    throw new APIError(400, `Invalid platform: ${platform}`, 'INVALID_PLATFORM');
  }

  const { user, workspace, usage, limits, serviceClient } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager'],
  });
  const {
    limits: effectiveLimits,
    entitlementUser,
    devAdminPlan,
  } = await applyAuthConnectPlanOverride(serviceClient, user, limits);

  logger.info('[OAuth Connect] Plan gate resolved', {
    platform,
    userId: user.id,
    workspaceId: workspace.id,
    contextPlan: limits.plan,
    effectivePlan: effectiveLimits.plan,
    devAdminPlan,
    hasAuthEmail: !!user.email,
    hasProfileEmail: !!entitlementUser.email,
    socialProfilesCount: usage.social_profiles_count,
    socialProfilesLimit: effectiveLimits.max_social_profiles,
  });

  if (usage.social_profiles_count >= effectiveLimits.max_social_profiles) {
    throw new APIError(
      402,
      `Social account limit reached for your ${effectiveLimits.plan} plan`,
      'PLAN_LIMIT_EXCEEDED',
      {
        current: usage.social_profiles_count,
        limit: effectiveLimits.max_social_profiles,
        contextPlan: limits.plan,
        effectivePlan: effectiveLimits.plan,
        devAdminPlan,
      }
    );
  }

  // Generate and store state for CSRF protection
  const state = generateState();
  let pkce: { verifier: string; challenge: string } | undefined;

  // Generate PKCE for platforms that support it
  if (platform === 'twitter' || platform === 'tiktok') {
    pkce = generatePKCE();
  }

  // Store state in database
  await storeOAuthState(user.id, platform, state, redirectUrl, {
    pkceVerifier: pkce?.verifier,
    workspaceId: workspace.id,
  });

  // Get authorization URL for the platform
  let authUrl: string;
  try {
    switch (platform) {
      case 'youtube':
        if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
          throw new APIError(
            500,
            'YouTube OAuth is not configured',
            'YOUTUBE_OAUTH_NOT_CONFIGURED'
          );
        }
        authUrl = getYouTubeAuthUrl(
          {
            clientId: process.env.YOUTUBE_CLIENT_ID!,
            clientSecret: process.env.YOUTUBE_CLIENT_SECRET!,
            redirectUri: `${appUrl}/api/auth/youtube/callback`,
          },
          state
        );
        break;

      case 'facebook':
        if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
          throw new APIError(
            500,
            'Facebook OAuth is not configured',
            'FACEBOOK_OAUTH_NOT_CONFIGURED'
          );
        }
        authUrl = getFacebookAuthUrl(
          {
            clientId: process.env.FACEBOOK_APP_ID!,
            clientSecret: process.env.FACEBOOK_APP_SECRET!,
            redirectUri: `${appUrl}/api/auth/facebook/callback`,
            configurationId: process.env.FACEBOOK_LOGIN_CONFIG_ID,
          },
          state,
          false
        );
        break;

      case 'instagram':
        {
          if (instagramConnection === 'facebook_page') {
            const configId =
              process.env.INSTAGRAM_FACEBOOK_LOGIN_CONFIG_ID ||
              process.env.INSTAGRAM_LOGIN_CONFIG_ID;

            if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET || !configId) {
              throw new APIError(
                500,
                'Instagram via Facebook Page is not configured',
                'INSTAGRAM_FACEBOOK_LOGIN_NOT_CONFIGURED'
              );
            }

            authUrl = getInstagramFacebookAuthUrl(
              {
                clientId: process.env.FACEBOOK_APP_ID!,
                clientSecret: process.env.FACEBOOK_APP_SECRET!,
                redirectUri: `${appUrl}/api/auth/instagram/facebook/callback`,
                configurationId: configId,
              },
              state
            );
            break;
          }

          if (instagramConnection !== 'instagram_login') {
            throw new APIError(
              400,
              `Unsupported Instagram connection method: ${instagramConnection}`,
              'INVALID_INSTAGRAM_CONNECTION'
            );
          }

          if (!process.env.INSTAGRAM_CLIENT_ID || !process.env.INSTAGRAM_CLIENT_SECRET) {
            throw new APIError(
              500,
              'Instagram Login is not configured',
              'INSTAGRAM_LOGIN_NOT_CONFIGURED'
            );
          }

          authUrl = getInstagramAuthUrl(
            {
              clientId: process.env.INSTAGRAM_CLIENT_ID!,
              clientSecret: process.env.INSTAGRAM_CLIENT_SECRET!,
              redirectUri: `${appUrl}/api/auth/instagram/callback`,
            },
            state
          );
        }
        break;

      case 'twitter':
        assertTwitterLiveApiEnabled('starting live X OAuth connection');

        if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
          throw new APIError(
            500,
            'Twitter OAuth is not configured',
            'TWITTER_OAUTH_NOT_CONFIGURED'
          );
        }
        logger.info('[OAuth Connect] Initiating Twitter OAuth', {
          userId: user.id,
          redirectUri: `${appUrl}/api/auth/twitter/callback`,
          clientIdPrefix: process.env.TWITTER_CLIENT_ID.substring(0, 10) + '...',
          hasPkce: !!pkce,
          pkceChallengeLength: pkce?.challenge.length,
        });
        authUrl = getTwitterAuthUrl(
          {
            clientId: process.env.TWITTER_CLIENT_ID!,
            clientSecret: process.env.TWITTER_CLIENT_SECRET!,
            redirectUri: `${appUrl}/api/auth/twitter/callback`,
          },
          state,
          pkce!.challenge
        );
        logger.info('[OAuth Connect] Twitter auth URL generated', {
          authUrlLength: authUrl.length,
          authUrlPrefix: authUrl.substring(0, 60) + '...',
        });
        break;

      case 'linkedin':
        if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
          throw new APIError(
            500,
            'LinkedIn OAuth is not configured',
            'LINKEDIN_OAUTH_NOT_CONFIGURED'
          );
        }
        authUrl = getLinkedInAuthUrl(
          {
            clientId: process.env.LINKEDIN_CLIENT_ID!,
            clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
            redirectUri: `${appUrl}/api/auth/linkedin/callback`,
          },
          state
        );
        break;

      case 'tiktok':
        if (!process.env.TIKTOK_CLIENT_KEY || !process.env.TIKTOK_CLIENT_SECRET) {
          throw new APIError(500, 'TikTok OAuth is not configured', 'TIKTOK_OAUTH_NOT_CONFIGURED');
        }
        authUrl = getTikTokAuthUrl(
          {
            clientKey: process.env.TIKTOK_CLIENT_KEY!,
            clientSecret: process.env.TIKTOK_CLIENT_SECRET!,
            redirectUri: `${appUrl}/api/auth/tiktok/callback`,
          },
          state
        );
        break;
      default:
        throw new APIError(
          400,
          `Platform ${platform} is not yet implemented`,
          'PLATFORM_NOT_IMPLEMENTED'
        );
    }

    logger.info(`[OAuth Connect] Redirecting user ${user.id} to ${platform} OAuth`);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    logger.error(`[OAuth Connect] Error initiating ${platform} OAuth:`, error as Error);

    if (error instanceof APIError) {
      const errorUrl = buildOAuthRedirectUrl(redirectUrl, appUrl, {
        error: error.message,
        code: error.code,
        platform,
      });
      return NextResponse.redirect(errorUrl);
    }

    if (isTwitterApiCreditsRequiredError(error)) {
      const errorUrl = buildOAuthRedirectUrl(redirectUrl, appUrl, {
        error: error instanceof Error ? error.message : 'X API credits required',
        code: TWITTER_CREDITS_REQUIRED_CODE,
        platform,
      });
      return NextResponse.redirect(errorUrl);
    }

    throw new APIError(500, `Failed to initiate ${platform} OAuth flow`, 'OAUTH_INIT_FAILED');
  }
});

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
