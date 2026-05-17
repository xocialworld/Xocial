import { getFacebookAuthUrl } from '../facebook';
import {
  exchangeInstagramLongLivedToken,
  getInstagramAuthUrl,
  getInstagramFacebookAuthUrl,
} from '../instagram';
import { sanitizeOAuthRedirect } from '../redirect';

describe('Meta OAuth helpers', () => {
  it('builds Instagram Professional Account OAuth with Instagram business scopes', () => {
    const authUrl = new URL(
      getInstagramAuthUrl(
        {
          clientId: 'instagram-client-id',
          clientSecret: 'instagram-client-secret',
          redirectUri: 'http://localhost:3000/api/auth/instagram/callback',
        },
        'state-value'
      )
    );

    const scopes = authUrl.searchParams.get('scope')?.split(',') || [];
    expect(authUrl.origin).toBe('https://www.instagram.com');
    expect(authUrl.pathname).toBe('/oauth/authorize');
    expect(authUrl.searchParams.get('client_id')).toBe('instagram-client-id');
    expect(authUrl.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3000/api/auth/instagram/callback'
    );
    expect(scopes).toEqual(
      expect.arrayContaining([
        'instagram_business_basic',
        'instagram_business_content_publish',
        'instagram_business_manage_comments',
        'instagram_business_manage_insights',
      ])
    );
  });

  it('builds Instagram via Facebook Page Login for Business with config ID', () => {
    const authUrl = new URL(
      getInstagramFacebookAuthUrl(
        {
          clientId: 'facebook-app-id',
          clientSecret: 'facebook-app-secret',
          redirectUri: 'http://localhost:3000/api/auth/instagram/facebook/callback',
          configurationId: 'ig-facebook-config',
        },
        'state-value'
      )
    );

    expect(authUrl.origin).toBe('https://www.facebook.com');
    expect(authUrl.pathname).toBe('/v24.0/dialog/oauth');
    expect(authUrl.searchParams.get('client_id')).toBe('facebook-app-id');
    expect(authUrl.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3000/api/auth/instagram/facebook/callback'
    );
    expect(authUrl.searchParams.get('config_id')).toBe('ig-facebook-config');
    expect(authUrl.searchParams.get('override_default_response_type')).toBe('true');
    expect(authUrl.searchParams.has('scope')).toBe(false);
  });

  it('builds Facebook Page Login for Business with config ID and without raw scopes', () => {
    const authUrl = new URL(
      getFacebookAuthUrl(
        {
          clientId: 'facebook-app-id',
          clientSecret: 'facebook-app-secret',
          redirectUri: 'http://localhost:3000/api/auth/facebook/callback',
          configurationId: 'fb-login-config',
        },
        'state-value'
      )
    );

    const scopes = authUrl.searchParams.get('scope')?.split(',') || [];
    expect(authUrl.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3000/api/auth/facebook/callback'
    );
    expect(authUrl.searchParams.get('config_id')).toBe('fb-login-config');
    expect(authUrl.searchParams.get('override_default_response_type')).toBe('true');
    expect(authUrl.searchParams.has('scope')).toBe(false);
  });

  it('builds classic Facebook Page login without Instagram scopes when no config ID is configured', () => {
    const authUrl = new URL(
      getFacebookAuthUrl(
        {
          clientId: 'facebook-app-id',
          clientSecret: 'facebook-app-secret',
          redirectUri: 'http://localhost:3000/api/auth/facebook/callback',
        },
        'state-value'
      )
    );

    const scopes = authUrl.searchParams.get('scope')?.split(',') || [];
    expect(scopes).toEqual(
      expect.arrayContaining([
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_posts',
        'pages_read_user_content',
        'pages_manage_engagement',
      ])
    );
    expect(scopes).not.toContain('instagram_content_publish');
  });

  it('sanitizes OAuth redirects to same-app paths only', () => {
    expect(sanitizeOAuthRedirect('/settings?tab=integrations', 'https://www.xocial.world')).toBe(
      '/settings?tab=integrations'
    );
    expect(
      sanitizeOAuthRedirect(
        'https://www.xocial.world/x?filter=instagram',
        'https://www.xocial.world'
      )
    ).toBe('/x?filter=instagram');
    expect(sanitizeOAuthRedirect('https://evil.example/x', 'https://www.xocial.world')).toBe('/x');
    expect(sanitizeOAuthRedirect('//evil.example/x', 'https://www.xocial.world')).toBe('/x');
  });

  it('exchanges Instagram short-lived tokens with a query-string GET request', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'long-lived-token',
        token_type: 'bearer',
        expires_in: 5184000,
      }),
    } as Response);

    await expect(
      exchangeInstagramLongLivedToken(
        { clientSecret: 'instagram-client-secret' },
        'short-lived-token'
      )
    ).resolves.toEqual({
      access_token: 'long-lived-token',
      token_type: 'bearer',
      expires_in: 5184000,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0];
    const url = new URL(String(requestUrl));

    expect(requestInit).toBeUndefined();
    expect(url.origin).toBe('https://graph.instagram.com');
    expect(url.pathname).toBe('/access_token');
    expect(url.searchParams.get('grant_type')).toBe('ig_exchange_token');
    expect(url.searchParams.get('client_secret')).toBe('instagram-client-secret');
    expect(url.searchParams.get('access_token')).toBe('short-lived-token');

    fetchMock.mockRestore();
  });
});
