import { NextRequest, NextResponse } from 'next/server';
import {
	requireAuth,
	getUserWorkspace,
	APIError,
} from '@/lib/api-middleware';
import {
  exchangeYouTubeCode,
  getYouTubeChannels,
} from '@/lib/oauth/youtube';
import { verifyOAuthState } from '@/lib/oauth/state-manager';
import { encryptToken } from '@/lib/encryption';

/**
 * GET /api/oauth/youtube/callback
 * Handle YouTube/Google OAuth callback
 */
export async function GET(request: NextRequest) {
	try {
		const { user, supabase } = await requireAuth(request);

		const searchParams = request.nextUrl.searchParams;
		const code = searchParams.get('code');
		const state = searchParams.get('state');
		const error = searchParams.get('error');

		if (error) {
			throw new APIError(400, `YouTube OAuth error: ${error}`, 'OAUTH_ERROR');
		}

		if (!code) {
			throw new APIError(400, 'Authorization code is missing', 'MISSING_CODE');
		}

		// Verify state parameter for CSRF protection
		if (!state) {
			throw new APIError(400, 'State parameter is missing', 'MISSING_STATE');
		}

		const stateVerification = await verifyOAuthState(user.id, 'youtube', state);
		if (!stateVerification.valid) {
			throw new APIError(
				403,
				`OAuth state verification failed: ${stateVerification.error}`,
				'INVALID_STATE'
			);
		}

    const origin = request.nextUrl.origin || (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
    const config = {
      clientId: process.env.YOUTUBE_CLIENT_ID!,
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET!,
      redirectUri: `${origin}/api/oauth/youtube/callback`,
    };

		const tokenResponse = await exchangeYouTubeCode(config, code);

		// Get user's YouTube channels
		const channels = await getYouTubeChannels(tokenResponse.access_token);

		if (channels.length === 0) {
			throw new APIError(404, 'No YouTube channels found for this account', 'NO_CHANNELS');
		}

		// Get user's workspace
		const workspace = await getUserWorkspace(user.id);

		// Store each channel as a separate social account with encrypted tokens
		const accounts = await Promise.all(
			channels.map(async (channel) => {
				// Encrypt tokens before storing
				const encryptedAccessToken = encryptToken(tokenResponse.access_token);
				const encryptedRefreshToken = tokenResponse.refresh_token
					? encryptToken(tokenResponse.refresh_token)
					: null;

				const { data, error } = await supabase
					.from('social_accounts')
					.upsert(
						{
							workspace_id: workspace.id,
							platform: 'youtube',
							account_id: channel.id,
							account_name: channel.snippet.title,
							account_handle: channel.snippet.customUrl || channel.snippet.title,
							account_avatar:
								channel.snippet.thumbnails.high?.url ||
								channel.snippet.thumbnails.medium?.url ||
								channel.snippet.thumbnails.default?.url,
							follower_count: channel.statistics
								? parseInt(channel.statistics.subscriberCount)
								: 0,
							access_token: encryptedAccessToken,
							refresh_token: encryptedRefreshToken,
							token_expires_at: new Date(
								Date.now() + tokenResponse.expires_in * 1000
							).toISOString(),
							is_active: true,
							metadata: {
								description: channel.snippet.description,
								statistics: channel.statistics,
								brandingSettings: channel.brandingSettings,
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

		// Redirect back to the UI with success message
    const appUrl = request.nextUrl.origin || (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
		const redirectPath = stateVerification.redirectUrl || '/x';
		const redirectUrl = new URL(redirectPath, appUrl);
		redirectUrl.searchParams.set(
			'success',
			`YouTube channel${accounts.length > 1 ? 's' : ''} connected successfully`
		);
		return NextResponse.redirect(redirectUrl);
	} catch (error) {
		// Redirect back to the UI with error message
    const appUrl = request.nextUrl.origin || (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
		const redirectUrl = new URL('/x', appUrl);
		redirectUrl.searchParams.set(
			'error',
			error instanceof Error ? error.message : 'Failed to connect YouTube account'
		);
		return NextResponse.redirect(redirectUrl);
	}
}

// Ensure Node.js runtime (required for crypto used by encryption utilities)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

