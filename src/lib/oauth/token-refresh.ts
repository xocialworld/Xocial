/**
 * Token Refresh Utilities
 * Handles automatic refresh of expiring Facebook/Instagram tokens
 */

import { createClient } from '@/lib/supabase/server';
import { decryptToken, encryptToken } from '@/lib/encryption';
import { getFacebookLongLivedToken, getFacebookPages } from './facebook';

export interface TokenRefreshResult {
  success: boolean;
  expiresAt?: Date;
  error?: string;
}

function decryptTokenIfNeeded(token: string): string {
  try {
    return decryptToken(token);
  } catch {
    // Legacy integrations stored plaintext tokens. Keep refresh compatible so the
    // refreshed value can be rewritten encrypted below.
    return token;
  }
}

function normalizeMetadata(metadata: any): Record<string, any> {
  if (!metadata) return {};
  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata) || {};
    } catch {
      return {};
    }
  }
  return typeof metadata === 'object' ? metadata : {};
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
    .select('access_token, refresh_token, platform, metadata, account_id')
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
    
    const currentUserToken = account.refresh_token
      ? decryptTokenIfNeeded(account.refresh_token)
      : decryptTokenIfNeeded(account.access_token);
    const newTokenData = await getFacebookLongLivedToken(config, currentUserToken);
    
    const expiresAt = new Date(Date.now() + (newTokenData.expires_in || 5184000) * 1000);
    const encryptedUserToken = encryptToken(newTokenData.access_token);
    
    const updatedAt = new Date().toISOString();
    const pages = await getFacebookPages(newTokenData.access_token);
    const metadata = normalizeMetadata(account.metadata);
    const pageId =
      account.platform === 'facebook'
        ? account.account_id
        : metadata.facebook_page_id;
    const matchingPage = pages.find((page) => page.id === pageId);

    if (pageId && !matchingPage?.access_token) {
      return {
        success: false,
        error: 'Linked Facebook Page was not returned by Meta during token refresh',
      };
    }

    const encryptedPageToken = matchingPage?.access_token
      ? encryptToken(matchingPage.access_token)
      : encryptToken(newTokenData.access_token);

    // Update the primary account
    await supabase
      .from('social_accounts')
      .update({
        access_token: encryptedPageToken,
        refresh_token: encryptedUserToken,
        token_expires_at: expiresAt.toISOString(),
        updated_at: updatedAt,
      })
      .eq('id', accountId);

    // If this account is linked to a Facebook Page, update the sibling accounts that share the page token
    if (pageId) {
      await supabase
        .from('social_accounts')
        .update({
          access_token: encryptedPageToken,
          refresh_token: encryptedUserToken,
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
      expiresAt,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}
