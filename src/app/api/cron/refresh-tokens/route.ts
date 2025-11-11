/**
 * Cron Job: Refresh Expiring Tokens
 * Runs daily at 2 AM to refresh Facebook/Instagram tokens expiring within 7 days
 * 
 * Triggered by: Vercel Cron
 * Schedule: 0 2 * * * (daily at 2 AM)
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withCronVerification, cronSuccessResponse, cronErrorResponse } from '@/lib/cron-verification';
import { refreshMetaToken } from '@/lib/oauth/token-refresh';

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

    // Get all Facebook and Instagram accounts expiring within 7 days
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const { data: accounts, error: fetchError } = await supabase
      .from('social_accounts')
      .select('id, account_name, platform, token_expires_at')
      .in('platform', ['facebook', 'instagram'])
      .eq('is_active', true)
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
        const result = await refreshMetaToken(account.id);
        
        results.push({
          accountId: account.id,
          accountName: account.account_name,
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
        results.push({
          accountId: account.id,
          accountName: account.account_name,
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

