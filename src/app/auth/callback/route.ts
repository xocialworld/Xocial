import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  
  if (!code) {
    logger.warn('OAuth callback missing code', { path: requestUrl.pathname });
    return NextResponse.redirect(new URL('/auth/login?error=Google%20sign-in%20failed', requestUrl.origin));
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL('/x', requestUrl.origin));
}
