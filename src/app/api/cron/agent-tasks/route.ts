import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  withCronVerification,
  cronSuccessResponse,
  cronErrorResponse,
} from '@/lib/cron-verification';
import { processDueAgentTasks } from '@/lib/intelligence/tasks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export const GET = withCronVerification(async (request: NextRequest) => {
  const startTime = Date.now();

  try {
    const limit = Number(request.nextUrl.searchParams.get('limit') || 10);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const result = await processDueAgentTasks(supabase, {
      limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 25) : 10,
    });

    return cronSuccessResponse({
      message: 'Agent task worker completed',
      ...result,
      duration: Date.now() - startTime,
    });
  } catch (error: any) {
    return cronErrorResponse('Fatal error during agent task processing', {
      error: error?.message || String(error),
      stack: error?.stack,
    });
  }
});
