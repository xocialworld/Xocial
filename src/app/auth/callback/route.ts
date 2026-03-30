import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getAppURL } from '@/lib/url';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  // Use getAppURL() for consistent redirect origin (works on both localhost and Vercel)
  const appOrigin = getAppURL().replace(/\/$/, '');

  if (!code) {
    logger.warn('OAuth callback missing code', { path: requestUrl.pathname });
    return NextResponse.redirect(new URL('/auth/login?error=Google%20sign-in%20failed:%20No%20code%20provided', appOrigin));
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      logger.error('OAuth callback error exchanging code for session', error, { path: requestUrl.pathname });
      return NextResponse.redirect(new URL(`/auth/login?error=Authentication%20failed:%20${encodeURIComponent(error.message)}`, appOrigin));
    }
  } catch (err) {
    logger.error('OAuth callback unexpected error', err as Error, { path: requestUrl.pathname });
    return NextResponse.redirect(new URL('/auth/login?error=An%20unexpected%20error%20occurred', appOrigin));
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL('/x', appOrigin));
}
