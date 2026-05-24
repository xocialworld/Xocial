import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { env, isFeatureEnabled } from '@/lib/env';
import { isDemoPublishEnabled } from '@/lib/demo-guards';

type ReadinessStatus = 'pass' | 'warn' | 'fail';

type ReadinessCheck = {
  id: string;
  label: string;
  status: ReadinessStatus;
  message: string;
  detail?: Record<string, unknown>;
};

const RECENT_JOB_WINDOW_MS = 15 * 60 * 1000;

function addCheck(
  checks: ReadinessCheck[],
  id: string,
  label: string,
  status: ReadinessStatus,
  message: string,
  detail?: Record<string, unknown>
) {
  checks.push({ id, label, status, message, ...(detail ? { detail } : {}) });
}

function isSchemaUnavailable(error: any) {
  const message = String(error?.message || '');
  return (
    error?.code === '42P01' ||
    error?.code === '42703' ||
    error?.code === 'PGRST205' ||
    message.includes('Could not find the table') ||
    message.includes('Could not find the')
  );
}

function platformCredentialsConfigured(platform: string) {
  switch (platform) {
    case 'facebook':
      return isFeatureEnabled.facebook();
    case 'instagram':
      return isFeatureEnabled.instagram() || isFeatureEnabled.facebook();
    case 'twitter':
      return isFeatureEnabled.twitter();
    case 'linkedin':
      return isFeatureEnabled.linkedin();
    case 'youtube':
      return isFeatureEnabled.youtube();
    case 'tiktok':
      return isFeatureEnabled.tiktok();
    default:
      return false;
  }
}

async function countQuery(query: any) {
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { serviceClient, workspaceId } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager'],
    allowOnboardingFallback: true,
  });
  const checks: ReadinessCheck[] = [];
  const now = new Date();

  addCheck(
    checks,
    'environment',
    'Core environment',
    env.NEXT_PUBLIC_SUPABASE_URL &&
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      env.SUPABASE_SERVICE_ROLE_KEY
      ? 'pass'
      : 'fail',
    env.NEXT_PUBLIC_SUPABASE_URL &&
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      env.SUPABASE_SERVICE_ROLE_KEY
      ? 'Supabase URL, anon key, and service role key are configured.'
      : 'Supabase credentials are incomplete.'
  );

  const appUrl = env.NEXT_PUBLIC_APP_URL || '';
  const productionAppUrlLooksLocal =
    env.NODE_ENV === 'production' && (/localhost|127\.0\.0\.1/.test(appUrl) || !appUrl);
  addCheck(
    checks,
    'app_url',
    'Public app URL',
    productionAppUrlLooksLocal ? 'fail' : appUrl ? 'pass' : 'warn',
    productionAppUrlLooksLocal
      ? 'Production app URL points to localhost or is missing, which breaks OAuth redirects.'
      : appUrl
        ? `Public app URL is set to ${appUrl}.`
        : 'Public app URL is not configured; local development will work but OAuth may fail.'
  );

  addCheck(
    checks,
    'ai',
    'AI generation',
    isFeatureEnabled.ai() ? 'pass' : 'warn',
    isFeatureEnabled.ai()
      ? 'AI credentials are configured.'
      : 'No AI Gateway or OpenAI key is configured; AI composer features will be unavailable.'
  );

  addCheck(
    checks,
    'demo_publish',
    'Demo publish guard',
    env.NODE_ENV === 'production' && isDemoPublishEnabled() ? 'fail' : 'pass',
    env.NODE_ENV === 'production' && isDemoPublishEnabled()
      ? 'DEMO_PUBLISH is enabled in production. Disable it before investor demos or real publishing.'
      : 'Production demo publish mode is disabled.'
  );

  addCheck(
    checks,
    'cron_secret',
    'Cron authentication',
    env.NODE_ENV === 'production' && !env.CRON_SECRET ? 'fail' : env.CRON_SECRET ? 'pass' : 'warn',
    env.CRON_SECRET
      ? 'Cron secret is configured.'
      : 'Cron secret is missing. Development can run manual scheduler checks, but production cron must be protected.'
  );

  try {
    const { data: bucket, error } = await serviceClient.storage.getBucket('media');
    addCheck(
      checks,
      'media_storage',
      'Media storage',
      error || !bucket ? 'warn' : 'pass',
      error || !bucket
        ? 'Media bucket could not be verified. Uploads may fail until storage is configured.'
        : 'Media bucket exists and is reachable.',
      error ? { error: error.message } : undefined
    );
  } catch (error: any) {
    addCheck(
      checks,
      'media_storage',
      'Media storage',
      'warn',
      error.message || 'Storage check failed.'
    );
  }

  try {
    const { data: accounts, error } = await serviceClient
      .from('social_accounts')
      .select(
        'id, platform, account_name, is_active, token_expires_at, last_sync_error, last_publish_error, health_status'
      )
      .eq('workspace_id', workspaceId)
      .eq('is_active', true);

    if (error) throw error;

    const activeAccounts = accounts || [];
    const activePlatforms = Array.from(
      new Set(activeAccounts.map((account: any) => account.platform))
    );
    const missingCredentialPlatforms = activePlatforms.filter(
      (platform) => !platformCredentialsConfigured(platform)
    );
    const expiresSoonAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const expiredOrExpiring = activeAccounts.filter((account: any) => {
      if (!account.token_expires_at) return false;
      const expiresAt = new Date(account.token_expires_at);
      return expiresAt <= expiresSoonAt;
    });
    const healthErrors = activeAccounts.filter(
      (account: any) => account.last_sync_error || account.last_publish_error
    );

    addCheck(
      checks,
      'connected_accounts',
      'Connected social accounts',
      activeAccounts.length > 0 ? 'pass' : 'warn',
      activeAccounts.length > 0
        ? `${activeAccounts.length} active social account${activeAccounts.length === 1 ? '' : 's'} connected.`
        : 'No active social accounts are connected in this workspace.',
      { platforms: activePlatforms }
    );

    addCheck(
      checks,
      'platform_credentials',
      'Platform credentials',
      missingCredentialPlatforms.length === 0 ? 'pass' : 'fail',
      missingCredentialPlatforms.length === 0
        ? 'OAuth credentials exist for all active connected platforms.'
        : `Missing OAuth credentials for: ${missingCredentialPlatforms.join(', ')}.`,
      { missingCredentialPlatforms }
    );

    addCheck(
      checks,
      'token_health',
      'Token health',
      expiredOrExpiring.length === 0 && healthErrors.length === 0 ? 'pass' : 'warn',
      expiredOrExpiring.length === 0 && healthErrors.length === 0
        ? 'Connected account tokens and recent account health look usable.'
        : `${expiredOrExpiring.length} token${expiredOrExpiring.length === 1 ? '' : 's'} expire within 24 hours and ${healthErrors.length} account${healthErrors.length === 1 ? '' : 's'} have recent sync/publish errors.`,
      {
        expiringAccountIds: expiredOrExpiring.map((account: any) => account.id),
        accountsWithErrors: healthErrors.map((account: any) => account.id),
      }
    );
  } catch (error: any) {
    addCheck(
      checks,
      'connected_accounts',
      'Connected social accounts',
      isSchemaUnavailable(error) ? 'fail' : 'warn',
      error.message || 'Unable to verify connected social accounts.'
    );
  }

  try {
    const dueScheduledCount = await countQuery(
      serviceClient
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'scheduled')
        .lte('scheduled_at', now.toISOString())
    );

    const { data: lastJob, error: lastJobError } = await serviceClient
      .from('job_runs')
      .select(
        'id, status, started_at, finished_at, processed_count, succeeded_count, failed_count, error_message'
      )
      .eq('job_type', 'publish_scheduled')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastJobError && !isSchemaUnavailable(lastJobError)) throw lastJobError;

    const lastJobAgeMs = lastJob?.started_at
      ? Date.now() - new Date(lastJob.started_at).getTime()
      : Number.POSITIVE_INFINITY;
    const schedulerFresh = lastJob && lastJobAgeMs <= RECENT_JOB_WINDOW_MS;
    const schedulerStatus: ReadinessStatus =
      dueScheduledCount > 0 && !schedulerFresh ? 'fail' : schedulerFresh ? 'pass' : 'warn';

    addCheck(
      checks,
      'scheduler',
      'Scheduled publishing worker',
      schedulerStatus,
      schedulerStatus === 'pass'
        ? `Scheduler has run recently with status ${lastJob?.status || 'unknown'}.`
        : dueScheduledCount > 0
          ? `${dueScheduledCount} scheduled post${dueScheduledCount === 1 ? '' : 's'} are due, but no recent scheduler run was recorded.`
          : 'No recent scheduler run was recorded. Run the cron endpoint manually in development or configure Vercel cron for production.',
      {
        dueScheduledCount,
        lastJob,
      }
    );

    const recentFailedJobs = await countQuery(
      serviceClient
        .from('job_runs')
        .select('id', { count: 'exact', head: true })
        .eq('job_type', 'publish_scheduled')
        .eq('status', 'failed')
        .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    );

    addCheck(
      checks,
      'scheduler_failures',
      'Scheduler failures',
      recentFailedJobs === 0 ? 'pass' : 'warn',
      recentFailedJobs === 0
        ? 'No failed scheduled publishing jobs in the last 24 hours.'
        : `${recentFailedJobs} scheduled publishing job${recentFailedJobs === 1 ? '' : 's'} failed in the last 24 hours.`,
      { recentFailedJobs }
    );
  } catch (error: any) {
    addCheck(
      checks,
      'scheduler',
      'Scheduled publishing worker',
      isSchemaUnavailable(error) ? 'fail' : 'warn',
      isSchemaUnavailable(error)
        ? 'Scheduler evidence tables are missing. Apply the latest database migration.'
        : error.message || 'Unable to verify scheduler health.'
    );
  }

  try {
    const failedAttempts = await countQuery(
      serviceClient
        .from('post_publish_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'failed')
        .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    );

    addCheck(
      checks,
      'publish_evidence',
      'Publish evidence',
      failedAttempts === 0 ? 'pass' : 'warn',
      failedAttempts === 0
        ? 'No failed publish attempts were recorded in the last 24 hours.'
        : `${failedAttempts} failed platform publish attempt${failedAttempts === 1 ? '' : 's'} were recorded in the last 24 hours.`,
      { failedAttempts }
    );
  } catch (error: any) {
    addCheck(
      checks,
      'publish_evidence',
      'Publish evidence',
      isSchemaUnavailable(error) ? 'fail' : 'warn',
      isSchemaUnavailable(error)
        ? 'Publish attempt evidence table is missing. Apply the latest database migration.'
        : error.message || 'Unable to verify publish evidence.'
    );
  }

  const summary = {
    passed: checks.filter((check) => check.status === 'pass').length,
    warnings: checks.filter((check) => check.status === 'warn').length,
    failures: checks.filter((check) => check.status === 'fail').length,
    readyForDemo: checks.every((check) => check.status !== 'fail'),
  };

  return successResponse(
    {
      generatedAt: now.toISOString(),
      summary,
      checks,
    },
    { workspaceId }
  );
});

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
