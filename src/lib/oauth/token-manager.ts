import { createClient } from '@supabase/supabase-js';
import { decryptToken, encryptToken } from '@/lib/encryption';
import { refreshTwitterToken } from '@/lib/platforms/twitter';
import { refreshLinkedInToken } from './linkedin';
import { refreshTikTokToken } from './tiktok';
import { OAUTH_CONFIG } from './oauth-config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Refresh access token if expired or about to expire
 */
export async function refreshAccessToken(
    platform: string,
    refreshToken: string,
    expiresAt?: string
): Promise<{ accessToken: string; newRefreshToken?: string; expiresAt: Date } | null> {
    // Check if token is expired or expiring soon (within 5 minutes)
    if (expiresAt) {
        const expiryDate = new Date(expiresAt);
        const now = new Date();
        const fiveMinutes = 5 * 60 * 1000;

        if (expiryDate.getTime() - now.getTime() > fiveMinutes) {
            return null; // Token is still valid
        }
    }

    try {
        switch (platform) {
            case 'twitter':
                const twitterConfig = {
                    clientId: process.env.TWITTER_CLIENT_ID!,
                    clientSecret: process.env.TWITTER_CLIENT_SECRET!,
                    redirectUri: '', // Not needed for refresh
                };
                const twitterTokens = await refreshTwitterToken(twitterConfig, refreshToken);
                return {
                    accessToken: twitterTokens.access_token,
                    newRefreshToken: twitterTokens.refresh_token,
                    expiresAt: new Date(Date.now() + (twitterTokens.expires_in || 7200) * 1000),
                };

            case 'linkedin':
                const linkedinConfig = {
                    clientId: process.env.LINKEDIN_CLIENT_ID!,
                    clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
                    redirectUri: '',
                };
                const linkedinTokens = await refreshLinkedInToken(linkedinConfig, refreshToken);
                return {
                    accessToken: linkedinTokens.access_token,
                    newRefreshToken: linkedinTokens.refresh_token,
                    expiresAt: new Date(Date.now() + (linkedinTokens.expires_in || 5184000) * 1000),
                };

            case 'tiktok':
                const tiktokConfig = {
                    clientKey: process.env.TIKTOK_CLIENT_KEY!,
                    clientSecret: process.env.TIKTOK_CLIENT_SECRET!,
                    redirectUri: '',
                };
                const tiktokTokens = await refreshTikTokToken(tiktokConfig, refreshToken);
                return {
                    accessToken: tiktokTokens.access_token,
                    newRefreshToken: tiktokTokens.refresh_token,
                    expiresAt: new Date(Date.now() + (tiktokTokens.expires_in || 86400) * 1000),
                };

            // Facebook/Instagram long-lived tokens don't typically need refresh in the same way,
            // or use a different flow. YouTube handles it via Google library usually.
            default:
                console.warn(`Token refresh not implemented for ${platform}`);
                return null;
        }
    } catch (error) {
        console.error(`Failed to refresh token for ${platform}:`, error);
        throw error;
    }
}

/**
 * Get valid access token for an account (refreshes if needed)
 */
export async function getValidAccessToken(
    accountId: string
): Promise<string> {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: account, error } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('id', accountId)
        .single();

    if (error || !account) {
        throw new Error('Account not found');
    }

    const accessToken = decryptToken(account.access_token);
    const refreshToken = account.refresh_token ? decryptToken(account.refresh_token) : null;

    if (!refreshToken) {
        return accessToken; // Can't refresh without refresh token
    }

    const refreshed = await refreshAccessToken(
        account.platform,
        refreshToken,
        account.token_expires_at
    );

    if (refreshed) {
        // Update database with new tokens
        await supabase
            .from('social_accounts')
            .update({
                access_token: encryptToken(refreshed.accessToken),
                refresh_token: refreshed.newRefreshToken ? encryptToken(refreshed.newRefreshToken) : account.refresh_token,
                token_expires_at: refreshed.expiresAt.toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', accountId);

        return refreshed.accessToken;
    }

    return accessToken;
}
