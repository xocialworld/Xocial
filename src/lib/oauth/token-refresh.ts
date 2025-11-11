/**
 * Token Refresh Utilities
 * Handles automatic refresh of expiring Facebook/Instagram tokens
 */

import { createClient } from '@/lib/supabase/server';
import { getFacebookLongLivedToken } from './facebook';

export interface TokenRefreshResult {
  success: boolean;
  newToken?: string;
  expiresAt?: Date;
  error?: string;
}

/**
 * Check if Facebook token is expired or expiring soon (within 7 days)
 */
export async function isFacebookTokenExpiring(
  accountId: string
): Promise<boolean> {
  const supabase = await createClient();
  
  const { data: account } = await supabase
    .from('social_accounts')
    .select('token_expires_at')
    .eq('id', accountId)
    .single();
  
  if (!account?.token_expires_at) return false;
  
  const expiresAt = new Date(account.token_expires_at);
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  
  return expiresAt < sevenDaysFromNow;
}

/**
 * Refresh Facebook access token
 * Exchanges current token for a new long-lived token (60 days)
 */
export async function refreshMetaToken(
  accountId: string
): Promise<TokenRefreshResult> {
  const supabase = await createClient();
  
  // Get current token
  const { data: account } = await supabase
    .from('social_accounts')
    .select('access_token, platform, metadata, account_id')
    .eq('id', accountId)
    .single();
  
  if (!account || !['facebook', 'instagram'].includes(account.platform)) {
    return { success: false, error: 'Account not found or unsupported platform' };
  }
  
  try {
    // Exchange for new long-lived token
    const config = {
      clientId: process.env.FACEBOOK_APP_ID!,
      clientSecret: process.env.FACEBOOK_APP_SECRET!,
      redirectUri: '', // Not needed for token refresh
    };
    
    const newTokenData = await getFacebookLongLivedToken(
      config,
      account.access_token
    );
    
    const expiresAt = new Date(Date.now() + newTokenData.expires_in * 1000);
    
    const updatedAt = new Date().toISOString();

    // Update the primary account
    await supabase
      .from('social_accounts')
      .update({
        access_token: newTokenData.access_token,
        token_expires_at: expiresAt.toISOString(),
        updated_at: updatedAt,
      })
      .eq('id', accountId);

    // If this account is linked to a Facebook Page, update the sibling accounts that share the page token
    const pageId =
      account.platform === 'facebook'
        ? account.account_id
        : account.metadata?.facebook_page_id;

    if (pageId) {
      await supabase
        .from('social_accounts')
        .update({
          access_token: newTokenData.access_token,
          token_expires_at: expiresAt.toISOString(),
          updated_at: updatedAt,
        })
        .eq('is_active', true)
        .neq('id', accountId)
        .or(
          [
            `and(platform.eq.facebook,account_id.eq.${pageId})`,
            `and(platform.eq.instagram,metadata->>facebook_page_id.eq.${pageId})`,
          ].join(',')
        );
    }
    
    return {
      success: true,
      newToken: newTokenData.access_token,
      expiresAt,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

