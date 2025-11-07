import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  APIError,
  getUserWorkspace,
} from '@/lib/api-middleware';
import { getFacebookProfile } from '@/lib/oauth/facebook';

type ProfileStatus =
  | 'live'
  | 'cache'
  | 'expired_token'
  | 'missing_token'
  | 'error'
  | 'not_connected';

interface StoredProfile {
  id: string | null;
  name: string | null;
  email: string | null;
  pictureUrl: string | null;
  syncedAt: string | null;
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);
  const workspace = await getUserWorkspace(user.id);

  const { data: accounts, error } = await supabase
    .from('social_accounts')
    .select('id, account_name, metadata, connected_at')
    .eq('workspace_id', workspace.id)
    .eq('platform', 'facebook')
    .eq('is_active', true)
    .order('connected_at', { ascending: false })
    .limit(1);

  if (error) {
    throw new APIError(500, error.message, 'DATABASE_ERROR');
  }

  const account = accounts?.[0];

  if (!account) {
    return successResponse({
      connected: false,
      status: 'not_connected' as ProfileStatus,
      needsReconnect: false,
      profile: null,
      account: null,
      tokenExpiresAt: null,
    });
  }

  const metadata = (account as any).metadata ?? {};
  const storedProfileRaw = metadata.user_profile ?? null;
  const storedProfile: StoredProfile | null = storedProfileRaw
    ? {
        id: storedProfileRaw.id ?? null,
        name: storedProfileRaw.name ?? null,
        email: storedProfileRaw.email ?? null,
        pictureUrl: storedProfileRaw.picture_url ?? null,
        syncedAt: storedProfileRaw.synced_at ?? storedProfileRaw.syncedAt ?? null,
      }
    : null;

  const userToken = metadata.user_token?.access_token as string | undefined;
  const userTokenExpiresAt = metadata.user_token?.expires_at as string | undefined;
  const tokenExpired =
    !!userTokenExpiresAt && new Date(userTokenExpiresAt).getTime() <= Date.now();

  let profile: StoredProfile | null = storedProfile;
  let status: ProfileStatus = storedProfile ? 'cache' : 'missing_token';
  let needsReconnect = false;
  let message: string | undefined;

  if (userToken && !tokenExpired) {
    try {
      const liveProfile = await getFacebookProfile(userToken);
      const syncedAt = new Date().toISOString();

      profile = {
        id: liveProfile.id ?? null,
        name: liveProfile.name ?? null,
        email: liveProfile.email ?? null,
        pictureUrl: liveProfile.picture?.data?.url ?? null,
        syncedAt,
      };
      status = 'live';

      const updatedMetadata = {
        ...metadata,
        user_profile: {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          picture_url: profile.pictureUrl,
          synced_at: profile.syncedAt,
        },
      };

      await supabase
        .from('social_accounts')
        .update({
          metadata: updatedMetadata,
          updated_at: syncedAt,
        })
        .eq('id', account.id);
    } catch (err: any) {
      needsReconnect = true;
      status = storedProfile ? 'cache' : 'error';
      message =
        err?.message || 'Failed to refresh Facebook profile details. Please reconnect.';
    }
  } else {
    needsReconnect = true;
    if (!userToken) {
      status = storedProfile ? 'cache' : 'missing_token';
      message =
        'Facebook user token not found. Reconnect Facebook to refresh profile information.';
    } else if (tokenExpired) {
      status = storedProfile ? 'cache' : 'expired_token';
      message =
        'Facebook user token has expired. Reconnect Facebook to refresh profile information.';
    }
  }

  return successResponse({
    connected: Boolean(profile),
    status,
    needsReconnect,
    profile,
    account: {
      id: account.id,
      name: account.account_name,
    },
    tokenExpiresAt: userTokenExpiresAt ?? null,
    tokenExpired,
    message,
  });
});

