import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { refreshYouTubeToken } from '@/lib/oauth/youtube';
import { encryptToken, decryptToken } from '@/lib/encryption';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/refresh-youtube-tokens
 * Cron job to refresh YouTube access tokens that are about to expire
 * Should run every hour
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Find YouTube accounts with tokens expiring in the next 2 hours
    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    
    const { data: accounts, error: fetchError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('platform', 'youtube')
      .eq('is_active', true)
      .not('refresh_token', 'is', null)
      .lt('token_expires_at', twoHoursFromNow);

    if (fetchError) {
      logger.error('Failed to fetch YouTube accounts for token refresh', fetchError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!accounts || accounts.length === 0) {
      logger.info('No YouTube tokens need refreshing');
      return NextResponse.json({
        message: 'No tokens need refreshing',
        refreshed: 0,
      });
    }

    logger.info(`Found ${accounts.length} YouTube accounts needing token refresh`);

    const config = {
      clientId: process.env.YOUTUBE_CLIENT_ID!,
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET!,
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/youtube/callback`,
    };

    // Refresh tokens for each account
    const results = await Promise.allSettled(
      accounts.map(async (account) => {
        try {
          // Decrypt the refresh token
          const decryptedRefreshToken = decryptToken(account.refresh_token);

          // Request new access token
          const tokenResponse = await refreshYouTubeToken(config, decryptedRefreshToken);

          // Encrypt the new access token
          const encryptedAccessToken = encryptToken(tokenResponse.access_token);

          // Encrypt new refresh token if provided (Google may rotate it)
          const encryptedRefreshToken = tokenResponse.refresh_token
            ? encryptToken(tokenResponse.refresh_token)
            : account.refresh_token; // Keep existing if not rotated

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

          if (updateError) {
            throw updateError;
          }

          logger.info(`Refreshed token for YouTube account: ${account.account_name}`);
          return { success: true, accountId: account.id };
        } catch (error: any) {
          logger.error(
            `Failed to refresh token for YouTube account: ${account.account_name}`,
            error
          );
          
          // If token refresh fails, mark account as inactive
          await supabase
            .from('social_accounts')
            .update({
              is_active: false,
              metadata: {
                ...account.metadata,
                token_refresh_error: error.message,
                token_refresh_failed_at: new Date().toISOString(),
              },
            })
            .eq('id', account.id);

          return { success: false, accountId: account.id, error: error.message };
        }
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    logger.info(`Token refresh complete: ${successful} successful, ${failed} failed`);

    return NextResponse.json({
      message: 'Token refresh complete',
      refreshed: successful,
      failed,
      total: accounts.length,
    });
  } catch (error: any) {
    logger.error('Token refresh cron job failed', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
