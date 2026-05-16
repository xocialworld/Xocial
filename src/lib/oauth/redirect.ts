import type { NextRequest } from 'next/server';

const DEFAULT_REDIRECT = '/x';

export function getOAuthAppOrigin(request: NextRequest) {
  const requestOrigin = request.nextUrl.origin;
  const metaOAuthOrigin = process.env.META_OAUTH_REDIRECT_ORIGIN?.trim();
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (metaOAuthOrigin) {
    return metaOAuthOrigin.replace(/\/+$/, '');
  }

  if (
    process.env.NODE_ENV !== 'production' &&
    /^https?:\/\//i.test(requestOrigin)
  ) {
    return requestOrigin;
  }

  return configuredOrigin || requestOrigin || 'http://localhost:3000';
}

export function sanitizeOAuthRedirect(
  redirectUrl: string | null | undefined,
  origin: string,
  fallback = DEFAULT_REDIRECT
) {
  if (!redirectUrl) return fallback;

  try {
    if (redirectUrl.startsWith('/')) {
      if (redirectUrl.startsWith('//')) return fallback;
      return redirectUrl;
    }

    const parsed = new URL(redirectUrl);
    if (parsed.origin !== origin) return fallback;

    return `${parsed.pathname}${parsed.search}${parsed.hash}` || fallback;
  } catch {
    return fallback;
  }
}

export function buildOAuthRedirectUrl(
  redirectUrl: string | null | undefined,
  origin: string,
  params: Record<string, string | number | null | undefined>
) {
  const safeRedirect = sanitizeOAuthRedirect(redirectUrl, origin);
  const url = new URL(safeRedirect, origin);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  return url;
}
