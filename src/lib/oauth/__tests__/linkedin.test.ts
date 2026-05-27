import {
  getLinkedInAuthUrl,
  getLinkedInScopes,
  hasLinkedInOrganizationAccess,
  hasLinkedInReadAccess,
  parseLinkedInScopes,
} from '../linkedin';

describe('LinkedIn OAuth helpers', () => {
  it('requests only self-serve member connect and publishing scopes by default', () => {
    const scopes = getLinkedInScopes({} as NodeJS.ProcessEnv);

    expect(scopes).toEqual(['openid', 'profile', 'email', 'w_member_social']);
    expect(scopes).not.toContain('rw_organization_admin');
    expect(scopes).not.toContain('r_member_postAnalytics');
  });

  it('adds organization scopes only when explicitly enabled', () => {
    const scopes = getLinkedInScopes({
      LINKEDIN_ENABLE_ORGANIZATION_ACCESS: 'true',
    } as NodeJS.ProcessEnv);

    expect(scopes).toEqual(
      expect.arrayContaining([
        'rw_organization_admin',
        'r_organization_social',
        'w_organization_social',
      ])
    );
  });

  it('adds member read and analytics scopes only when explicitly enabled', () => {
    const scopes = getLinkedInScopes({
      LINKEDIN_ENABLE_MEMBER_ANALYTICS: '1',
    } as NodeJS.ProcessEnv);

    expect(scopes).toEqual(expect.arrayContaining(['r_member_social', 'r_member_postAnalytics']));
  });

  it('trims, splits, and de-duplicates extra scopes', () => {
    expect(
      getLinkedInScopes({
        LINKEDIN_EXTRA_SCOPES: ' r_member_postAnalytics, r_member_postAnalytics w_organization_social_feed ',
      } as NodeJS.ProcessEnv)
    ).toEqual(
      expect.arrayContaining([
        'w_member_social',
        'r_member_postAnalytics',
        'w_organization_social_feed',
      ])
    );
  });

  it('builds an auth URL from the configured default scopes', () => {
    const authUrl = new URL(
      getLinkedInAuthUrl(
        {
          clientId: 'linkedin-client-id',
          clientSecret: 'linkedin-client-secret',
          redirectUri: 'https://www.xocial.world/api/auth/linkedin/callback',
        },
        'state-value',
        {} as NodeJS.ProcessEnv
      )
    );

    const scopes = authUrl.searchParams.get('scope')?.split(' ') || [];
    expect(authUrl.origin).toBe('https://www.linkedin.com');
    expect(authUrl.pathname).toBe('/oauth/v2/authorization');
    expect(authUrl.searchParams.get('client_id')).toBe('linkedin-client-id');
    expect(authUrl.searchParams.get('redirect_uri')).toBe(
      'https://www.xocial.world/api/auth/linkedin/callback'
    );
    expect(scopes).toEqual(['openid', 'profile', 'email', 'w_member_social']);
  });

  it('detects organization and read access from token scopes', () => {
    expect(parseLinkedInScopes('openid profile w_member_social')).toEqual([
      'openid',
      'profile',
      'w_member_social',
    ]);
    expect(
      hasLinkedInOrganizationAccess('rw_organization_admin r_organization_social w_organization_social')
    ).toBe(true);
    expect(hasLinkedInReadAccess('r_member_postAnalytics', 'personal')).toBe(true);
    expect(hasLinkedInReadAccess('w_member_social', 'personal')).toBe(false);
  });
});
