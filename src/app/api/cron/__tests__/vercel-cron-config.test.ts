import fs from 'fs';
import path from 'path';

describe('vercel cron configuration', () => {
  const config = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf8')
  );
  const supabaseCronMigration = fs.readFileSync(
    path.join(process.cwd(), 'supabase/migrations/20260527000001_supabase_cron_scheduler.sql'),
    'utf8'
  );
  const backupWorkflow = fs.readFileSync(
    path.join(process.cwd(), '.github/workflows/scheduler-backup.yml'),
    'utf8'
  );

  it('does not cache API responses that trigger side effects', () => {
    expect(config.headers).toContainEqual({
      source: '/api/(.*)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'no-store, max-age=0',
        },
      ],
    });
  });

  it('keeps Supabase Cron configured as the free scheduled worker trigger', () => {
    expect(supabaseCronMigration).toContain('CREATE EXTENSION IF NOT EXISTS pg_cron');
    expect(supabaseCronMigration).toContain('CREATE EXTENSION IF NOT EXISTS pg_net');
    expect(supabaseCronMigration).toContain('xocial-publish-scheduled-posts');
    expect(supabaseCronMigration).toContain('/api/cron/publish');
    expect(supabaseCronMigration).toContain('xocial-process-agent-tasks');
    expect(supabaseCronMigration).toContain('/api/cron/agent-tasks?limit=10');
  });

  it('keeps GitHub Actions as a best-effort no-cost scheduler backup', () => {
    expect(backupWorkflow).toContain("cron: '3/5 * * * *'");
    expect(backupWorkflow).toContain('/api/cron/publish');
    expect(backupWorkflow).toContain('/api/cron/agent-tasks?limit=10');
    expect(backupWorkflow).toContain('Authorization: Bearer');
  });
});
