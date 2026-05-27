import { NextRequest, NextResponse } from 'next/server';
import { getTwitterApiModeSummary } from '@/lib/twitter-api-mode';

/**
 * GET /api/dev/twitter-config
 * Debug endpoint to check Twitter OAuth configuration
 */
export async function GET(request: NextRequest) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const apiMode = getTwitterApiModeSummary(appUrl);

    return NextResponse.json({
        configured: {
            clientId: !!process.env.TWITTER_CLIENT_ID,
            clientSecret: !!process.env.TWITTER_CLIENT_SECRET,
            appUrl: !!process.env.NEXT_PUBLIC_APP_URL,
            encryptionKey: !!process.env.ENCRYPTION_KEY,
        },
        xApiMode: apiMode,
        values: {
            appUrl,
            callbackUrl: `${appUrl}/api/auth/twitter/callback`,
            clientIdPrefix: process.env.TWITTER_CLIENT_ID?.substring(0, 10) + '...',
        },
        instructions: {
            step1: 'Go to https://developer.twitter.com/en/portal/dashboard',
            step2: 'Select your app',
            step3: 'Go to "User authentication settings"',
            step4: `Add this callback URL: ${appUrl}/api/auth/twitter/callback`,
            step5: 'For local development, prefer http://127.0.0.1:3000/api/auth/twitter/callback',
            step6: 'Make sure it matches EXACTLY (including http/https)',
            step7: 'Keep TWITTER_API_MODE=no-spend until X API credits are added',
        },
    });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
