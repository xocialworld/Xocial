import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  if (client) {
    return client;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Supabase credentials missing. Check .env.local");
    }
  }

  client = createBrowserClient(
    supabaseUrl || '',
    supabaseAnonKey || '',
    {
      auth: {
        // Explicitly use PKCE flow — ensures code_verifier is stored in
        // cookies (not just memory) so it survives cross-tab/redirect
        flowType: 'pkce',
        // Store auth state in cookies so it works across SSR and client
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    }
  );

  return client;
}
