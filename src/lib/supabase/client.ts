import { createBrowserClient } from '@supabase/ssr';
import logger from '@/lib/logger';

function validateSupabaseConfig() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

  const isValidUrl = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url);
  if (!isValidUrl) {
    const msg = 'Invalid NEXT_PUBLIC_SUPABASE_URL. Expected https://<project-ref>.supabase.co';
    logger.error(msg, undefined, { url });
  }

  if (!key || key.length < 20) {
    const msg = 'Invalid NEXT_PUBLIC_SUPABASE_ANON_KEY.';
    logger.error(msg, undefined, { keyLength: key ? key.length : 0 });
  }
}

export function createClient() {
  validateSupabaseConfig();
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
