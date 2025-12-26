import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

/**
 * Supabase Admin Client
 * 
 * WARNING: This client bypasses Row Level Security (RLS).
 * Use only for system-level operations where the current user context
 * is insufficient or not available (e.g., sending notifications to other users).
 * 
 * NEVER expose this client to the client-side or use it for user-facing
 * operations that should be subject to RLS.
 */
export const createAdminClient = () => {
    return createClient(
        env.NEXT_PUBLIC_SUPABASE_URL!,
        env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );
};
