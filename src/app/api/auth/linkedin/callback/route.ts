import { NextRequest, NextResponse } from 'next/server';
import {
    requireAuth,
    getUserWorkspace,
    APIError,
} from '@/lib/api-middleware';
import { logger } from '@/lib/logger';
import {
    exchangeLinkedInCode,
    getLinkedInProfile,
    getLinkedInOrganizations,
} from '@/lib/oauth/linkedin';
import { verifyOAuthState } from '@/lib/oauth/state-manager';
import { encryptToken } from '@/lib/encryption';

/**
 * GET /api/auth/linkedin/callback
 * Handle LinkedIn OAuth 2.0 callback
 * SRS Pattern: /api/auth/{platform}/callback
 */
export async function GET(request: NextRequest) {
    try {
        const { user, supabase } = await requireAuth(request);

        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
            throw new APIError(400, `LinkedIn OAuth error: ${error}`, 'OAUTH_ERROR');
        }

        if (!code) {
            throw new APIError(400, 'Authorization code is missing', 'MISSING_CODE');
        }

        // Verify state parameter for CSRF protection
        if (!state) {
            throw new APIError(400, 'State parameter is missing', 'MISSING_STATE');
        }

        const stateVerification = await verifyOAuthState(user.id, 'linkedin', state);
        if (!stateVerification.valid) {
            throw new APIError(
                403,
                `OAuth state verification failed: ${stateVerification.error}`,
                'INVALID_STATE'
            );
        }

        const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin || 'http://localhost:3000';
        const config = {
            clientId: process.env.LINKEDIN_CLIENT_ID!,
            clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
            redirectUri: `${origin}/api/auth/linkedin/callback`,
        };

        if (!process.env.ENCRYPTION_KEY) {
            throw new APIError(500, 'Encryption key is not configured', 'CONFIGURATION_ERROR');
        }

        console.log('[LinkedIn Callback] Starting callback processing...');
        const tokenResponse = await exchangeLinkedInCode(config, code);
        console.log('[LinkedIn Callback] Token exchanged successfully');

        // Get LinkedIn user profile
        const profile = await getLinkedInProfile(tokenResponse.access_token);
        console.log(`[LinkedIn Callback] Found profile: ${profile.name}`);

        // Try to get organizations (company pages) - this may fail if user doesn't have org access
        let organizations: any[] = [];
        try {
            organizations = await getLinkedInOrganizations(tokenResponse.access_token);
            console.log(`[LinkedIn Callback] Found ${organizations.length} organizations`);
        } catch (error) {
            console.warn('[LinkedIn Callback] No organization access:', error);
        }

        // Get user's workspace context from state
        let workspaceId = stateVerification.workspaceId;

        if (!workspaceId) {
            console.warn('[LinkedIn Callback] No workspaceId in state, falling back to default workspace');
            const workspace = await getUserWorkspace(user.id, supabase);
            workspaceId = workspace.id;
        }

        console.log(`[LinkedIn Callback] Target workspace ID: ${workspaceId}`);

        // Encrypt tokens before storing
        const encryptedAccessToken = encryptToken(tokenResponse.access_token);
        const encryptedRefreshToken = tokenResponse.refresh_token
            ? encryptToken(tokenResponse.refresh_token)
            : null;

        // Store LinkedIn personal profile
        const { data: personalAccount, error: dbError } = await supabase
            .from('social_accounts')
            .upsert(
                {
                    workspace_id: workspaceId,
                    platform: 'linkedin',
                    assigned_user_id: user.id,
                    account_id: profile.sub,
                    account_name: profile.name,
                    account_handle: profile.name,
                    account_avatar: profile.picture,
                    follower_count: 0, // Personal profiles don't have public follower counts
                    access_token: encryptedAccessToken,
                    refresh_token: encryptedRefreshToken,
                    token_expires_at: new Date(
                        Date.now() + (tokenResponse.expires_in || 5184000) * 1000
                    ).toISOString(),
                    connected_at: new Date().toISOString(),
                    is_active: true,
                    metadata: {
                        email: profile.email,
                        type: 'personal',
                    },
                },
                {
                    onConflict: 'workspace_id,platform,account_id',
                    ignoreDuplicates: false,
                }
            )
            .select()
            .single();

        if (dbError) {
            console.error('[LinkedIn Callback] Error storing personal account:', dbError);
            throw new APIError(500, 'Failed to store LinkedIn account', 'DATABASE_ERROR');
        }

        // Store organization pages if available
        const orgAccounts = await Promise.all(
            organizations.map(async (org) => {
                const encryptedOrgToken = encryptToken(tokenResponse.access_token);
                const encryptedOrgRefreshToken = tokenResponse.refresh_token
                    ? encryptToken(tokenResponse.refresh_token)
                    : null;

                const { data, error } = await supabase
                    .from('social_accounts')
                    .upsert(
                        {
                            workspace_id: workspaceId,
                            platform: 'linkedin',
                            assigned_user_id: user.id,
                            account_id: org.id,
                            account_name: org.localizedName || org.name,
                            account_handle: org.vanityName || org.localizedName,
                            account_avatar: org.logoV2?.original,
                            follower_count: 0,
                            access_token: encryptedOrgToken,
                            refresh_token: encryptedOrgRefreshToken,
                            token_expires_at: new Date(
                                Date.now() + (tokenResponse.expires_in || 5184000) * 1000
                            ).toISOString(),
                            connected_at: new Date().toISOString(),
                            is_active: true,
                            metadata: {
                                type: 'organization',
                            },
                        },
                        {
                            onConflict: 'workspace_id,platform,account_id',
                            ignoreDuplicates: false,
                        }
                    )
                    .select()
                    .single();

                if (error) {
                    console.error('[LinkedIn Callback] Error storing organization:', error);
                }

                return data;
            })
        );

        const totalAccounts = 1 + orgAccounts.filter(Boolean).length;
        console.log(`[LinkedIn Callback] Successfully stored ${totalAccounts} accounts`);

        // Redirect to the original redirect URL with success message
        const redirectUrl = stateVerification.redirectUrl || '/x';
        const successUrl = new URL(redirectUrl, origin);
        successUrl.searchParams.set('success', 'linkedin_connected');
        successUrl.searchParams.set('accounts', totalAccounts.toString());

        return NextResponse.redirect(successUrl.toString());
    } catch (error) {
        console.error('[LinkedIn Callback] Error:', error);

        const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin || 'http://localhost:3000';
        const errorUrl = new URL('/x', origin);

        if (error instanceof APIError) {
            errorUrl.searchParams.set('error', error.message);
        } else if (error instanceof Error) {
            errorUrl.searchParams.set('error', error.message);
        } else {
            errorUrl.searchParams.set('error', 'Failed to connect LinkedIn account');
        }

        return NextResponse.redirect(errorUrl.toString());
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
