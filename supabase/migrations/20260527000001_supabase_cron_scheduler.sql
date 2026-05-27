-- Xocial free production scheduler.
-- Uses Supabase pg_cron + pg_net to call the deployed cron endpoints without
-- depending on Vercel Pro minute-level Cron Jobs.
--
-- Required Vault secrets, installed by scripts/install-supabase-scheduler.ts:
--   xocial_app_url
--   xocial_cron_secret

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

CREATE OR REPLACE FUNCTION public.xocial_scheduler_http_get(
  path text,
  timeout_milliseconds integer DEFAULT 55000
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, vault, pg_temp
AS $$
DECLARE
  app_url text;
  cron_secret text;
  request_id bigint;
BEGIN
  SELECT decrypted_secret
    INTO app_url
  FROM vault.decrypted_secrets
  WHERE name = 'xocial_app_url'
  LIMIT 1;

  SELECT decrypted_secret
    INTO cron_secret
  FROM vault.decrypted_secrets
  WHERE name = 'xocial_cron_secret'
  LIMIT 1;

  IF app_url IS NULL OR btrim(app_url) = '' THEN
    RAISE EXCEPTION 'Missing Supabase Vault secret: xocial_app_url';
  END IF;

  IF cron_secret IS NULL OR btrim(cron_secret) = '' THEN
    RAISE EXCEPTION 'Missing Supabase Vault secret: xocial_cron_secret';
  END IF;

  SELECT net.http_get(
    url := regexp_replace(app_url, '/+$', '') || path,
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || cron_secret,
      'User-Agent',
      'Xocial Supabase Cron'
    ),
    timeout_milliseconds := timeout_milliseconds
  )
  INTO request_id;

  RETURN request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.xocial_scheduler_http_get(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.xocial_scheduler_http_get(text, integer) TO postgres;
GRANT EXECUTE ON FUNCTION public.xocial_scheduler_http_get(text, integer) TO service_role;

SELECT cron.unschedule('xocial-publish-due-posts')
WHERE EXISTS (
  SELECT 1
  FROM cron.job
  WHERE jobname = 'xocial-publish-due-posts'
);

SELECT cron.schedule(
  'xocial-publish-scheduled-posts',
  '* * * * *',
  $$SELECT public.xocial_scheduler_http_get('/api/cron/publish', 55000);$$
);

SELECT cron.schedule(
  'xocial-process-agent-tasks',
  '* * * * *',
  $$SELECT public.xocial_scheduler_http_get('/api/cron/agent-tasks?limit=10', 55000);$$
);

SELECT cron.schedule(
  'xocial-sync-metrics',
  '*/30 * * * *',
  $$SELECT public.xocial_scheduler_http_get('/api/cron/sync-metrics', 55000);$$
);

SELECT cron.schedule(
  'xocial-refresh-tokens',
  '17 * * * *',
  $$SELECT public.xocial_scheduler_http_get('/api/cron/refresh-tokens', 55000);$$
);

SELECT cron.schedule(
  'xocial-daily-tasks',
  '0 6 * * *',
  $$SELECT public.xocial_scheduler_http_get('/api/cron/daily-tasks', 55000);$$
);
