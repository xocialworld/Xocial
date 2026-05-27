/**
 * Cron Job: Refresh Expiring Tokens
 * Runs daily at 2 AM to refresh tokens for all platforms expiring within 7 days
 * 
 * Triggered by: Vercel Cron
 * Schedule: 0 2 * * * (daily at 2 AM)
 * 
 * Platforms supported: Facebook, Instagram, YouTube, LinkedIn, Twitter, TikTok
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withCronVerification, cronSuccessResponse, cronErrorResponse } from '@/lib/cron-verification';
import { refreshMetaToken } from '@/lib/oauth/token-refresh';
import { refreshYouTubeToken } from '@/lib/oauth/youtube';
import { refreshTwitterToken } from '@/lib/platforms/twitter';
import { refreshLinkedInToken } from '@/lib/oauth/linkedin';
import { encryptToken, decryptToken } from '@/lib/encryption';
import { logger } from '@/lib/logger';
import { isTwitterNoSpendMode } from '@/lib/twitter-api-mode';

/**
 * GET /api/cron/refresh-tokens
 * Refreshes expiring Facebook tokens
 */
export const GET = withCronVerification(async (request: NextRequest) => {
  const startTime = Date.now();

  try {
    console.log('[Cron: Refresh Tokens] Starting token refresh job');

    // Create Supabase client with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get all accounts with tokens expiring within 7 days (all platforms)
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const { data: accounts, error: fetchError } = await supabase
      .from('social_accounts')
      .select('id, account_name, platform, token_expires_at, access_token, refresh_token')
      .in('platform', ['facebook', 'instagram', 'youtube', 'linkedin', 'twitter', 'tiktok'])
      .eq('is_active', true)
      .not('refresh_token', 'is', null)
      .lt('token_expires_at', sevenDaysFromNow.toISOString());

    if (fetchError) {
      console.error('[Cron: Refresh Tokens] Error fetching accounts:', fetchError);
      return cronErrorResponse('Failed to fetch accounts', fetchError);
    }

    if (!accounts || accounts.length === 0) {
      console.log('[Cron: Refresh Tokens] No tokens need refreshing');
      return cronSuccessResponse({
        message: 'No tokens need refreshing',
        refreshed: 0,
        duration: Date.now() - startTime,
      });
    }

    console.log(`[Cron: Refresh Tokens] Found ${accounts.length} accounts to refresh`);

    const results = [];

    for (const account of accounts) {
      const accountStartTime = Date.now();

      try {
        console.log(
          `[Cron: Refresh Tokens] Refreshing token for ${account.platform} account ${account.id}`
        );

        let result;

        // Handle different platforms
        if (account.platform === 'facebook' || account.platform === 'instagram') {
          result = await refreshMetaToken(account.id);
        } else if (account.platform === 'youtube') {
          // Decrypt refresh token
          const decryptedRefreshToken = decryptToken(account.refresh_token);

          // Refresh YouTube token
          const config = {
            clientId: process.env.YOUTUBE_CLIENT_ID!,
            clientSecret: process.env.YOUTUBE_CLIENT_SECRET!,
            redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/youtube/callback`,
          };

          const tokenResponse = await refreshYouTubeToken(config, decryptedRefreshToken);

          // Encrypt new tokens
          const encryptedAccessToken = encryptToken(tokenResponse.access_token);
          const encryptedRefreshToken = tokenResponse.refresh_token
            ? encryptToken(tokenResponse.refresh_token)
            : account.refresh_token;

          // Update in database
          const { error: updateError } = await supabase
            .from('social_accounts')
            .update({
              access_token: encryptedAccessToken,
              refresh_token: encryptedRefreshToken,
              token_expires_at: new Date(
                Date.now() + tokenResponse.expires_in * 1000
              ).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', account.id);

          if (updateError) throw updateError;

          result = { success: true, platform: 'youtube' };
        } else if (account.platform === 'twitter') {
          if (isTwitterNoSpendMode()) {
            result = {
              success: true,
              platform: 'twitter',
              skipped: true,
              reason: 'TWITTER_API_MODE is no-spend',
            };
          } else {
            const tokenResponse = await refreshTwitterToken(
              {
                clientId: process.env.TWITTER_CLIENT_ID!,
                clientSecret: process.env.TWITTER_CLIENT_SECRET!,
                redirectUri: '',
              },
              decryptToken(account.refresh_token)
            );

            const { error: updateError } = await supabase
              .from('social_accounts')
              .update({
                access_token: encryptToken(tokenResponse.access_token),
                refresh_token: tokenResponse.refresh_token
                  ? encryptToken(tokenResponse.refresh_token)
                  : account.refresh_token,
                token_expires_at: new Date(
                  Date.now() + tokenResponse.expires_in * 1000
                ).toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', account.id);

            if (updateError) throw updateError;

            result = { success: true, platform: 'twitter' };
          }
        } else if (account.platform === 'linkedin') {
          const tokenResponse = await refreshLinkedInToken(
            {
              clientId: process.env.LINKEDIN_CLIENT_ID!,
              clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
              redirectUri: '',
            },
            decryptToken(account.refresh_token)
          );

          const { error: updateError } = await supabase
            .from('social_accounts')
            .update({
              access_token: encryptToken(tokenResponse.access_token),
              refresh_token: tokenResponse.refresh_token
                ? encryptToken(tokenResponse.refresh_token)
                : account.refresh_token,
              token_expires_at: new Date(
                Date.now() + tokenResponse.expires_in * 1000
              ).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', account.id);

          if (updateError) throw updateError;

          result = { success: true, platform: 'linkedin' };
        } else {
          // Platform not yet implemented for token refresh
          result = { success: false, error: `Token refresh not implemented for ${account.platform}` };
        }

        results.push({
          accountId: account.id,
          accountName: account.account_name,
          platform: account.platform,
          ...result,
          duration: Date.now() - accountStartTime,
        });

        if (result.success) {
          console.log(`[Cron: Refresh Tokens] Successfully refreshed token for ${account.account_name}`);
        } else {
          console.error(`[Cron: Refresh Tokens] Failed to refresh token for ${account.account_name}:`, result.error);
        }
      } catch (error: any) {
        console.error(`[Cron: Refresh Tokens] Error refreshing account ${account.id}:`, error);

        // Mark account as inactive if refresh fails
        await supabase
          .from('social_accounts')
          .update({
            is_active: false,
            metadata: {
              token_refresh_error: error.message,
              token_refresh_failed_at: new Date().toISOString(),
            },
          })
          .eq('id', account.id);

        results.push({
          accountId: account.id,
          accountName: account.account_name,
          platform: account.platform,
          success: false,
          error: error.message,
          duration: Date.now() - accountStartTime,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    const totalDuration = Date.now() - startTime;

    console.log(`[Cron: Refresh Tokens] Completed: ${successCount} succeeded, ${failureCount} failed in ${totalDuration}ms`);

    return cronSuccessResponse({
      message: 'Token refresh completed',
      refreshed: successCount,
      failed: failureCount,
      total: accounts.length,
      duration: totalDuration,
      results,
    });
  } catch (error: any) {
    console.error('[Cron: Refresh Tokens] Fatal error:', error);
    return cronErrorResponse('Fatal error during token refresh', {
      error: error.message,
      stack: error.stack,
    });
  }
});

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
