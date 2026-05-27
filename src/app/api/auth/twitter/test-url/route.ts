import { NextRequest, NextResponse } from 'next/server';
import { generatePKCE, getTwitterAuthUrl } from '@/lib/platforms/twitter';
import { generateState } from '@/lib/oauth/state-manager';
import { OAUTH_CONFIG } from '@/lib/oauth/oauth-config';
import { getTwitterApiModeSummary } from '@/lib/twitter-api-mode';

/**
 * GET /api/auth/twitter/test-url
 * Test endpoint to verify the exact Twitter OAuth URL being generated
 * 
 * This does NOT initiate OAuth - it just shows what URL would be generated
 */
export async function GET(request: NextRequest) {
    const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin || 'http://localhost:3000';
    const redirectUri = `${origin}/api/auth/twitter/callback`;
    const apiMode = getTwitterApiModeSummary(origin);

    // Check if Twitter is configured
    if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
        return NextResponse.json({
            error: 'Twitter OAuth is not configured',
            hasClientId: !!process.env.TWITTER_CLIENT_ID,
            hasClientSecret: !!process.env.TWITTER_CLIENT_SECRET,
        }, { status: 500 });
    }

    // Generate PKCE
    const pkce = generatePKCE();

    // Generate state
    const state = generateState();

    // Generate the auth URL
    const authUrl = getTwitterAuthUrl(
        {
            clientId: process.env.TWITTER_CLIENT_ID,
            clientSecret: process.env.TWITTER_CLIENT_SECRET,
            redirectUri,
        },
        state,
        pkce.challenge
    );

    // Parse the URL to show all parameters
    const url = new URL(authUrl);
    const params: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
        params[key] = value;
    });

    return NextResponse.json({
        message: 'This is the URL that would be used for Twitter OAuth',
        note: 'This endpoint does NOT initiate OAuth - it just shows the URL for debugging',
        fullUrl: authUrl,
        urlParts: {
            origin: url.origin,
            pathname: url.pathname,
            parameters: params,
        },
        config: {
            clientId: process.env.TWITTER_CLIENT_ID,
            clientIdLength: process.env.TWITTER_CLIENT_ID.length,
            redirectUri,
            scopes: OAUTH_CONFIG.twitter.scopes,
            authEndpoint: OAUTH_CONFIG.twitter.endpoints.auth,
        },
        xApiMode: {
            ...apiMode,
            note: 'This route does not call live X API endpoints and is safe for no-spend setup checks.',
        },
        pkce: {
            challengeLength: pkce.challenge.length,
            verifierLength: pkce.verifier.length,
        },
        state: {
            value: state,
            length: state.length,
        },
        verification: {
            stateHasColon: state.includes(':'),
            clientIdHasColon: process.env.TWITTER_CLIENT_ID.includes(':'),
            callbackUses127001: redirectUri.startsWith('http://127.0.0.1:3000/'),
            includesRequiredScopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access', 'media.write']
                .every((scope) => OAUTH_CONFIG.twitter.scopes.includes(scope)),
        },
    }, { status: 200 });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
