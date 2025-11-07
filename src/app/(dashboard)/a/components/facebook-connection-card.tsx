'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Facebook as FacebookIcon, RefreshCw } from 'lucide-react';

type ProfileStatus =
  | 'live'
  | 'cache'
  | 'expired_token'
  | 'missing_token'
  | 'error'
  | 'not_connected';

interface FacebookProfile {
  id: string | null;
  name: string | null;
  email: string | null;
  pictureUrl: string | null;
  syncedAt: string | null;
}

interface FacebookProfileResponse {
  connected: boolean;
  status: ProfileStatus;
  needsReconnect: boolean;
  profile: FacebookProfile | null;
  account: {
    id: string;
    name: string;
  } | null;
  tokenExpiresAt: string | null;
  tokenExpired: boolean;
  message?: string;
}

const statusConfig: Record<
  ProfileStatus,
  { label: string; variant: 'success' | 'info' | 'warning' | 'error' | 'secondary' | 'default' }
> = {
  live: { label: 'Live', variant: 'success' },
  cache: { label: 'Cached', variant: 'info' },
  expired_token: { label: 'Expired Token', variant: 'warning' },
  missing_token: { label: 'Missing Token', variant: 'warning' },
  error: { label: 'Error', variant: 'error' },
  not_connected: { label: 'Not Connected', variant: 'secondary' },
};

function formatDateTime(value: string | null) {
  if (!value) return 'Not available';
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
}

function getInitials(name: string | null) {
  if (!name) return 'FB';
  const [first] = name.split(' ');
  return first ? first.charAt(0).toUpperCase() : 'FB';
}

export function FacebookConnectionCard() {
  const [data, setData] = useState<FacebookProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadProfile = useCallback(
    async (options: { isRefresh?: boolean } = {}) => {
      const { isRefresh = false } = options;

      if (!mountedRef.current) return;

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const response = await fetch('/api/facebook/profile', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });

        let payload: any = null;
        try {
          payload = await response.json();
        } catch (parseError) {
          // ignore parsing errors so we can surface a generic message
        }

        if (!response.ok || !payload?.success) {
          const message =
            payload?.error?.message ||
            payload?.data?.message ||
            `Failed to load Facebook profile (status ${response.status})`;
          throw new Error(message);
        }

        if (!mountedRef.current) return;
        setData(payload.data as FacebookProfileResponse);
      } catch (err: any) {
        if (!mountedRef.current) return;
        setError(err?.message || 'Failed to load Facebook profile');
      } finally {
        if (!mountedRef.current) return;

        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleRefresh = useCallback(() => {
    loadProfile({ isRefresh: true });
  }, [loadProfile]);

  const profile = data?.profile ?? null;
  const statusMeta = data ? statusConfig[data.status] ?? statusConfig.not_connected : null;

  return (
    <Card>
      <CardHeader className="space-y-3 md:flex-row md:items-start md:justify-between md:space-y-0">
        <div className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-xl">
            <span className="rounded-full bg-[#1877F2]/10 p-2">
              <FacebookIcon className="h-5 w-5 text-[#1877F2]" />
            </span>
            Facebook Connection
          </CardTitle>
          <CardDescription>
            Basic profile details fetched using the Facebook Graph API to confirm your connection.
          </CardDescription>
        </div>
        {!loading && !error && data && statusMeta && (
          <div className="flex items-center gap-2">
            <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
            {data.needsReconnect && <Badge variant="warning">Action Required</Badge>}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {loading && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-36" />
          </div>
        )}

        {!loading && error && (
          <div className="space-y-4">
            <div className="rounded-lg border border-error-200 bg-error-50 p-4 text-sm text-error-700">
              <p className="font-semibold">Unable to load Facebook connection</p>
              <p className="mt-1">{error}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                />
                {refreshing ? 'Refreshing...' : 'Try again'}
              </Button>
              <Link
                href="/x"
                className="text-sm font-medium text-primary-600 hover:underline"
              >
                Manage connections
              </Link>
            </div>
          </div>
        )}

        {!loading && !error && data && (!data.connected || !profile) && (
          <div className="space-y-4">
            <div className="rounded-lg border border-warning-200 bg-warning-50 p-4 text-sm text-warning-700">
              <p className="font-semibold">
                {data.status === 'not_connected'
                  ? 'Facebook is not connected yet.'
                  : 'We could not confirm the Facebook connection.'}
              </p>
              {data.message && <p className="mt-1 text-warning-600">{data.message}</p>}
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                />
                {refreshing ? 'Refreshing...' : 'Retry'}
              </Button>
              <Link
                href="/x"
                className="text-sm font-medium text-primary-600 hover:underline"
              >
                Connect Facebook
              </Link>
            </div>
          </div>
        )}

        {!loading && !error && data && profile && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                {profile.pictureUrl ? (
                  <AvatarImage src={profile.pictureUrl} alt={profile.name ?? 'Facebook user'} />
                ) : (
                  <AvatarFallback>{getInitials(profile.name)}</AvatarFallback>
                )}
              </Avatar>
              <div>
                <p className="text-lg font-semibold text-secondary-900">
                  {profile.name ?? 'Facebook User'}
                </p>
                <p className="text-sm text-secondary-600">
                  {profile.email ?? 'Email not provided by Facebook'}
                </p>
                <p className="text-xs text-secondary-500">
                  Graph ID: {profile.id ?? 'Unavailable'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 text-sm text-secondary-600 md:grid-cols-2">
              <div>
                <p className="font-semibold text-secondary-800">Workspace account</p>
                <p className="mt-1">{data.account?.name ?? '—'}</p>
              </div>
              <div>
                <p className="font-semibold text-secondary-800">Last profile sync</p>
                <p className="mt-1">{formatDateTime(profile.syncedAt)}</p>
              </div>
              <div>
                <p className="font-semibold text-secondary-800">Token expires</p>
                <p className="mt-1">
                  {formatDateTime(data.tokenExpiresAt)}
                  {data.tokenExpired && (
                    <span className="ml-2 text-warning-600">Expired</span>
                  )}
                </p>
              </div>
            </div>

            {data.message && (
              <div className="rounded-lg border border-warning-200 bg-warning-50 p-3 text-xs text-warning-700">
                {data.message}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Link
                href="/x"
                className="text-sm font-medium text-primary-600 hover:underline"
              >
                Manage connections
              </Link>
              {data.needsReconnect && (
                <span className="text-xs text-warning-600">
                  Reconnect Facebook from the accounts page to refresh the token.
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

