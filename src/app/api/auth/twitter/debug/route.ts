import { NextRequest, NextResponse } from 'next/server';
import { OAUTH_CONFIG } from '@/lib/oauth/oauth-config';

/**
 * GET /api/auth/twitter/debug
 * Debug endpoint to verify Twitter OAuth configuration
 * 
 * This endpoint is safe to access and will show:
 * - Whether env vars are configured
 * - The expected callback URL that must be set in Twitter Developer Portal
 * - OAuth configuration details (no secrets)
 */
export async function GET(request: NextRequest) {
    const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin || 'http://localhost:3000';
    const callbackUrl = `${origin}/api/auth/twitter/callback`;

    const hasClientId = !!process.env.TWITTER_CLIENT_ID;
    const hasClientSecret = !!process.env.TWITTER_CLIENT_SECRET;
    const hasEncryptionKey = !!process.env.ENCRYPTION_KEY;
    const hasAppUrl = !!process.env.NEXT_PUBLIC_APP_URL;

    // Safe preview of client ID (first 10 chars only)
    const clientIdPreview = process.env.TWITTER_CLIENT_ID
        ? process.env.TWITTER_CLIENT_ID.substring(0, 10) + '...'
        : '[NOT SET]';

    const config = {
        status: hasClientId && hasClientSecret && hasEncryptionKey ? 'CONFIGURED' : 'MISSING_CONFIG',
        environment: {
            hasClientId,
            hasClientSecret,
            hasEncryptionKey,
            hasAppUrl,
            clientIdPreview,
            appUrl: process.env.NEXT_PUBLIC_APP_URL || '[NOT SET - using request origin]',
            requestOrigin: request.nextUrl.origin,
        },
        oauth: {
            authEndpoint: OAUTH_CONFIG.twitter.endpoints.auth,
            tokenEndpoint: OAUTH_CONFIG.twitter.endpoints.token,
            userEndpoint: OAUTH_CONFIG.twitter.endpoints.user,
            scopes: OAUTH_CONFIG.twitter.scopes,
        },
        callback: {
            url: callbackUrl,
            instructions: [
                'The callback URL above MUST be set EXACTLY in your Twitter Developer Portal',
                '1. Go to: https://developer.twitter.com/en/portal/dashboard',
                '2. Select your app',
                '3. Click "Settings" or "User authentication settings"',
                '4. Under "Callback URI / Redirect URL", add: ' + callbackUrl,
                '5. Make sure OAuth 2.0 is enabled',
                '6. Required scopes: tweet.read, tweet.write, users.read, offline.access',
            ],
        },
        troubleshooting: {
            commonIssues: [
                {
                    issue: 'Redirect URI mismatch',
                    solution: `Ensure the callback URL in Twitter Developer Portal is exactly: ${callbackUrl}`,
                },
                {
                    issue: 'Session not persisting after redirect',
                    solution: 'Ensure cookies are being properly set. Check if NEXT_PUBLIC_APP_URL matches your actual domain.',
                },
                {
                    issue: 'PKCE verifier missing',
                    solution: 'The OAuth state might have expired (10 min timeout). Try connecting again.',
                },
                {
                    issue: 'Invalid client credentials',
                    solution: 'Verify TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET are correct and for the right app.',
                },
            ],
        },
    };

    return NextResponse.json(config, { status: 200 });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
