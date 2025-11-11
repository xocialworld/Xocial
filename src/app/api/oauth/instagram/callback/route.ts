import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getUserWorkspace } from '@/lib/api-middleware';
import {
  exchangeFacebookCode,
  getFacebookLongLivedToken,
  getFacebookPages,
} from '@/lib/oauth/facebook';
import { getInstagramBusinessAccounts } from '@/lib/oauth/instagram';

/**
 * GET /api/oauth/instagram/callback
 * Handle Instagram OAuth callback (via Facebook)
 * Instagram Business accounts are accessed through Facebook Graph API
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    console.log('[Instagram Callback] All cookies:', allCookies.map((c) => c.name));

    const userId = cookieStore.get('oauth_user_instagram')?.value;
    console.log('[Instagram Callback] User ID from cookie:', userId);

    if (!userId) {
      console.error('[Instagram Callback] No user ID found in cookie');
      const loginUrl = new URL('/auth/login', process.env.NEXT_PUBLIC_APP_URL);
      loginUrl.searchParams.set('error', 'Session expired. Please try connecting again.');
      return NextResponse.redirect(loginUrl);
    }

    const cookieSupabase = await createClient();
    const user = { id: userId };
    cookieStore.delete('oauth_user_instagram');

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      const accountsUrl = new URL('/x', process.env.NEXT_PUBLIC_APP_URL);
      accountsUrl.searchParams.set('error', `Instagram OAuth error: ${error}`);
      return NextResponse.redirect(accountsUrl);
    }

    if (!code) {
      const accountsUrl = new URL('/x', process.env.NEXT_PUBLIC_APP_URL);
      accountsUrl.searchParams.set('error', 'Authorization code is missing');
      return NextResponse.redirect(accountsUrl);
    }

    const config = {
      clientId: process.env.FACEBOOK_APP_ID!,
      clientSecret: process.env.FACEBOOK_APP_SECRET!,
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/instagram/callback`,
    };

    const tokenResponse = await exchangeFacebookCode(config, code);
    const longLivedToken = await getFacebookLongLivedToken(
      config,
      tokenResponse.access_token
    );

    const pages = await getFacebookPages(longLivedToken.access_token);
    console.log(
      '[Instagram Callback] Pages fetched:',
      pages.length,
      pages.map((page) => ({ id: page.id, name: page.name }))
    );

    if (pages.length === 0) {
      const accountsUrl = new URL('/x', process.env.NEXT_PUBLIC_APP_URL);
      accountsUrl.searchParams.set(
        'error',
        'No Facebook pages were returned. Ensure you selected at least one page during the permission dialog and that the user is a page admin.'
      );
      return NextResponse.redirect(accountsUrl);
    }

    const workspace = await getUserWorkspace(user.id);

    const accounts = [];
    for (const page of pages) {
      try {
        const igAccount = await getInstagramBusinessAccounts(page.access_token, page.id);

        if (!igAccount) {
          console.warn(
            '[Instagram Callback] No Instagram business account linked to page:',
            page.id
          );
          continue;
        }

        console.log(
          '[Instagram Callback] Instagram account found:',
          igAccount.id,
          igAccount.username
        );

        const { data, error: upsertError } = await cookieSupabase
          .from('social_accounts')
          .upsert(
            {
              workspace_id: workspace.id,
              platform: 'instagram',
              account_id: igAccount.id,
              account_name: igAccount.name || igAccount.username,
              account_handle: igAccount.username,
              account_avatar: igAccount.profile_picture_url,
              follower_count: igAccount.followers_count || 0,
              access_token: page.access_token,
              token_expires_at: new Date(
                Date.now() + longLivedToken.expires_in * 1000
              ).toISOString(),
              is_active: true,
              metadata: {
                facebook_page_id: page.id,
                facebook_page_name: page.name,
              },
            },
            {
              onConflict: 'workspace_id,platform,account_id',
            }
          )
          .select()
          .single();

        if (upsertError) {
          console.error(
            '[Instagram Callback] Failed to upsert Instagram account:',
            igAccount.id,
            upsertError
          );
          throw upsertError;
        }

        accounts.push(data);
      } catch (err) {
        console.error(
          `[Instagram Callback] Failed to process Instagram account for page ${page.id}:`,
          err
        );
      }
    }

    if (accounts.length === 0) {
      const accountsUrl = new URL('/x', process.env.NEXT_PUBLIC_APP_URL);
      accountsUrl.searchParams.set(
        'error',
        'No Instagram Business accounts were linked to the selected pages. Convert the Instagram account to Business/Creator and link it to the Facebook page.'
      );
      return NextResponse.redirect(accountsUrl);
    }

    const accountsUrl = new URL('/x', process.env.NEXT_PUBLIC_APP_URL);
    accountsUrl.searchParams.set(
      'success',
      `${accounts.length} Instagram account(s) connected successfully`
    );
    return NextResponse.redirect(accountsUrl);
  } catch (error) {
    console.error('Instagram OAuth callback error:', error);
    const accountsUrl = new URL('/x', process.env.NEXT_PUBLIC_APP_URL);
    accountsUrl.searchParams.set(
      'error',
      error instanceof Error ? error.message : 'Failed to connect Instagram account'
    );
    return NextResponse.redirect(accountsUrl);
  }
}

