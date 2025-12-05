import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-middleware';
import { syncYouTubeChannel } from '@/lib/youtube-sync';

/**
 * POST /api/accounts/youtube/sync
 * Sync YouTube channel statistics
 */
export async function POST(request: NextRequest) {
    try {
        const { user } = await requireAuth(request);
        const { accountId } = await request.json();

        if (!accountId) {
            return NextResponse.json(
                { error: 'Account ID is required' },
                { status: 400 }
            );
        }

        console.log('[YouTube Sync] Syncing channel for account:', accountId);

        const stats = await syncYouTubeChannel(accountId);

        console.log('[YouTube Sync] Successfully synced channel stats:', stats);

        return NextResponse.json({
            success: true,
            data: stats,
        });
    } catch (error) {
        console.error('[YouTube Sync] Error:', error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to sync YouTube channel',
            },
            { status: 500 }
        );
    }
}

// Ensure Node.js runtime for encryption
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
