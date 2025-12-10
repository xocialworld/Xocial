/**
 * Engagement Reply API
 * POST /api/engagement/reply
 * 
 * Reply to comments/mentions from social platforms
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            social_account_id,
            platform,
            comment_id,
            reply_text,
            parent_post_id,
        } = body;

        if (!social_account_id || !platform || !reply_text?.trim()) {
            return NextResponse.json(
                { error: 'social_account_id, platform, and reply_text are required' },
                { status: 400 }
            );
        }

        // Fetch social account with tokens
        const { data: account, error: accountError } = await supabase
            .from('social_accounts')
            .select('*, workspace:workspaces!inner(id)')
            .eq('id', social_account_id)
            .single();

        if (accountError || !account) {
            return NextResponse.json(
                { error: 'Social account not found' },
                { status: 404 }
            );
        }

        // Verify membership
        const { data: membership } = await supabase
            .from('workspace_members')
            .select('role')
            .eq('workspace_id', account.workspace_id)
            .eq('user_id', user.id)
            .single();

        if (!membership) {
            return NextResponse.json(
                { error: 'Not a member of this workspace' },
                { status: 403 }
            );
        }

        // Send reply based on platform
        let replyResult: { success: boolean; id?: string; error?: string };

        switch (platform) {
            case 'instagram':
                replyResult = await replyToInstagram(account, comment_id, reply_text);
                break;
            case 'facebook':
                replyResult = await replyToFacebook(account, comment_id, reply_text);
                break;
            case 'twitter':
                replyResult = await replyToTwitter(account, comment_id || parent_post_id, reply_text);
                break;
            case 'youtube':
                replyResult = await replyToYouTube(account, comment_id, reply_text);
                break;
            case 'linkedin':
                replyResult = await replyToLinkedIn(account, comment_id, reply_text);
                break;
            default:
                return NextResponse.json(
                    { error: `Reply not supported for platform: ${platform}` },
                    { status: 400 }
                );
        }

        if (!replyResult.success) {
            return NextResponse.json(
                { error: replyResult.error || 'Failed to send reply' },
                { status: 500 }
            );
        }

        // Store reply in database for records
        const { error: insertError } = await supabase.from('engagement_replies').insert({
            social_account_id,
            platform,
            original_comment_id: comment_id,
            reply_text: reply_text.trim(),
            platform_reply_id: replyResult.id,
            replied_by: user.id,
            replied_at: new Date().toISOString(),
        });

        if (insertError) {
            // Table might not exist yet, log and continue
            console.log('Could not store reply record:', insertError.message);
        }

        return NextResponse.json({
            success: true,
            reply_id: replyResult.id,
            message: 'Reply sent successfully',
        });

    } catch (error) {
        console.error('Engagement reply error:', error);
        return NextResponse.json(
            { error: 'Failed to send reply' },
            { status: 500 }
        );
    }
}

async function replyToInstagram(
    account: any,
    commentId: string,
    replyText: string
): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const accessToken = account.access_token;

        if (!accessToken) {
            return { success: false, error: 'No access token available' };
        }

        // Instagram Graph API - Reply to comment
        const response = await fetch(
            `https://graph.facebook.com/v18.0/${commentId}/replies`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: replyText,
                    access_token: accessToken,
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error('Instagram reply error:', data);
            return { success: false, error: data.error?.message || 'Failed to reply' };
        }

        return { success: true, id: data.id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

async function replyToFacebook(
    account: any,
    commentId: string,
    replyText: string
): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const accessToken = account.access_token;

        if (!accessToken) {
            return { success: false, error: 'No access token available' };
        }

        // Facebook Graph API - Reply to comment
        const response = await fetch(
            `https://graph.facebook.com/v18.0/${commentId}/comments`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: replyText,
                    access_token: accessToken,
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error('Facebook reply error:', data);
            return { success: false, error: data.error?.message || 'Failed to reply' };
        }

        return { success: true, id: data.id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

async function replyToTwitter(
    account: any,
    tweetId: string,
    replyText: string
): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const accessToken = account.access_token;

        if (!accessToken) {
            return { success: false, error: 'No access token available' };
        }

        // Twitter API v2 - Create tweet as reply
        const response = await fetch('https://api.twitter.com/2/tweets', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: replyText,
                reply: {
                    in_reply_to_tweet_id: tweetId,
                },
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Twitter reply error:', data);
            return { success: false, error: data.detail || 'Failed to reply' };
        }

        return { success: true, id: data.data?.id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

async function replyToYouTube(
    account: any,
    commentId: string,
    replyText: string
): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const accessToken = account.access_token;

        if (!accessToken) {
            return { success: false, error: 'No access token available' };
        }

        // YouTube Data API - Insert comment reply
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/comments?part=snippet`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    snippet: {
                        parentId: commentId,
                        textOriginal: replyText,
                    },
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error('YouTube reply error:', data);
            return { success: false, error: data.error?.message || 'Failed to reply' };
        }

        return { success: true, id: data.id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

async function replyToLinkedIn(
    account: any,
    commentId: string,
    replyText: string
): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const accessToken = account.access_token;

        if (!accessToken) {
            return { success: false, error: 'No access token available' };
        }

        // LinkedIn API - Reply to comment
        // Note: LinkedIn's API for comment replies is complex and may require additional setup
        const authorUrn = `urn:li:person:${account.platform_user_id}`;

        const response = await fetch(
            `https://api.linkedin.com/v2/socialActions/${commentId}/comments`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'X-Restli-Protocol-Version': '2.0.0',
                },
                body: JSON.stringify({
                    actor: authorUrn,
                    message: {
                        text: replyText,
                    },
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error('LinkedIn reply error:', data);
            return { success: false, error: data.message || 'Failed to reply' };
        }

        return { success: true, id: data.id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
