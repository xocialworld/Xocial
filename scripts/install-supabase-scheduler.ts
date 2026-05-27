import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const MIGRATION_PATH = path.join(
  process.cwd(),
  'supabase/migrations/20260527000001_supabase_cron_scheduler.sql'
);

function getArgValue(name: string) {
  const prefix = `${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function getDatabaseUrl() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;

  if (!supabaseUrl || !dbPassword) {
    if (process.env.DATABASE_URL) {
      return process.env.DATABASE_URL;
    }

    requireEnv('NEXT_PUBLIC_SUPABASE_URL');
    requireEnv('SUPABASE_DB_PASSWORD');
  }

  const resolvedSupabaseUrl = supabaseUrl || requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const resolvedDbPassword = dbPassword || requireEnv('SUPABASE_DB_PASSWORD');
  const projectRef = new URL(resolvedSupabaseUrl).hostname.split('.')[0];

  if (!projectRef) {
    throw new Error('Unable to resolve Supabase project ref from NEXT_PUBLIC_SUPABASE_URL.');
  }

  return `postgresql://postgres:${encodeURIComponent(resolvedDbPassword)}@db.${projectRef}.supabase.co:5432/postgres?sslmode=require`;
}

function getPgClientConfig(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const sslMode = url.searchParams.get('sslmode');
  url.searchParams.delete('sslmode');

  return {
    connectionString: url.toString(),
    ssl: sslMode === 'disable' ? false : { rejectUnauthorized: false },
  };
}

async function upsertVaultSecret(
  client: Client,
  name: string,
  value: string,
  description: string
) {
  const existing = await client.query<{ id: string }>(
    'SELECT id FROM vault.decrypted_secrets WHERE name = $1 LIMIT 1',
    [name]
  );

  if (existing.rows[0]?.id) {
    await client.query('SELECT vault.update_secret($1::uuid, $2, $3, $4)', [
      existing.rows[0].id,
      value,
      name,
      description,
    ]);
    return 'updated';
  }

  await client.query('SELECT vault.create_secret($1, $2, $3)', [value, name, description]);
  return 'created';
}

async function main() {
  const explicitAppUrl = getArgValue('--app-url');
  const envAppUrl = process.env.SCHEDULER_TARGET_URL || process.env.NEXT_PUBLIC_APP_URL;
  const envAppUrlIsLocal = envAppUrl ? /localhost|127\.0\.0\.1/.test(envAppUrl) : false;
  const appUrl =
    explicitAppUrl || (envAppUrl && !envAppUrlIsLocal ? envAppUrl : 'https://www.xocial.world');
  const cronSecret = requireEnv('CRON_SECRET');
  const databaseUrl = getDatabaseUrl();
  const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');
  const smoke = process.argv.includes('--smoke');

  const client = new Client(getPgClientConfig(databaseUrl));

  await client.connect();

  try {
    await client.query('BEGIN');
    await client.query(migrationSql);
    const appSecretStatus = await upsertVaultSecret(
      client,
      'xocial_app_url',
      appUrl,
      'Base URL used by Supabase Cron to call Xocial scheduled workers.'
    );
    const cronSecretStatus = await upsertVaultSecret(
      client,
      'xocial_cron_secret',
      cronSecret,
      'Bearer token used by Supabase Cron to authenticate Xocial worker requests.'
    );
    await client.query('COMMIT');

    const jobs = await client.query<{
      jobid: number;
      jobname: string;
      schedule: string;
      active: boolean;
    }>(
      `
        SELECT jobid, jobname, schedule, active
        FROM cron.job
        WHERE jobname LIKE 'xocial-%'
        ORDER BY jobname
      `
    );

    console.log(
      JSON.stringify(
        {
          success: true,
          appUrl,
          vault: {
            xocial_app_url: appSecretStatus,
            xocial_cron_secret: cronSecretStatus,
          },
          jobs: jobs.rows,
        },
        null,
        2
      )
    );

    if (smoke) {
      const smokeResult = await client.query<{ request_id: string }>(
        "SELECT public.xocial_scheduler_http_get('/api/cron/agent-tasks?limit=1', 55000) AS request_id"
      );
      console.log(
        JSON.stringify(
          {
            smoke: true,
            requestId: smokeResult.rows[0]?.request_id,
            note: 'pg_net queues requests asynchronously; check net._http_response and Xocial readiness for the HTTP result.',
          },
          null,
          2
        )
      );
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
