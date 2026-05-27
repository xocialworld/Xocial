import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

type SchedulerResponse = {
  success?: boolean;
  data?: {
    message?: string;
    processed?: number;
    succeeded?: number;
    failed?: number;
    retryScheduled?: number;
    dueScheduled?: number;
    duration?: number;
    results?: Array<{
      postId?: string;
      success?: boolean;
      platforms?: string[];
      errors?: string[];
      error?: string;
      retryScheduled?: boolean;
    }>;
  };
  error?: string;
};

function getArgValue(name: string) {
  const prefix = `${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

function shouldWatch() {
  return process.argv.includes('--watch');
}

function getIntervalMs() {
  const intervalArg = getArgValue('--interval');
  const seconds = intervalArg ? Number(intervalArg) : 60;
  return Math.max(15, Number.isFinite(seconds) ? seconds : 60) * 1000;
}

async function runOnce() {
  const appUrl =
    process.env.SCHEDULER_TARGET_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://www.xocial.world';
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    throw new Error('CRON_SECRET is required to run the scheduler.');
  }

  const baseUrl = appUrl.replace(/\/$/, '');
  const endpoints = [
    `${baseUrl}/api/cron/publish`,
    `${baseUrl}/api/cron/agent-tasks?limit=10`,
  ];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180_000);

  try {
    for (const endpoint of endpoints) {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          authorization: `Bearer ${secret}`,
        },
        signal: controller.signal,
      });

      const body = (await response.json().catch(() => ({}))) as SchedulerResponse;
      const data = body.data || {};

      console.log(
        JSON.stringify(
          {
            at: new Date().toISOString(),
            endpoint,
            status: response.status,
            ok: response.ok,
            message: data.message || body.error,
            dueScheduled: data.dueScheduled,
            processed: data.processed,
            succeeded: data.succeeded,
            failed: data.failed,
            retryScheduled: data.retryScheduled,
            duration: data.duration,
            results: data.results?.map((result) => ({
              postId: result.postId,
              success: result.success,
              platforms: result.platforms,
              errors: result.errors,
              error: result.error,
              retryScheduled: result.retryScheduled,
            })),
          },
          null,
          2
        )
      );

      if (!response.ok || body.success === false) {
        process.exitCode = 1;
      }
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  if (!shouldWatch()) {
    await runOnce();
    return;
  }

  const intervalMs = getIntervalMs();
  console.log(`Scheduler worker started. Polling every ${intervalMs / 1000}s.`);

  while (true) {
    await runOnce().catch((error) => {
      console.error(
        JSON.stringify(
          {
            at: new Date().toISOString(),
            error: error instanceof Error ? error.message : String(error),
          },
          null,
          2
        )
      );
    });
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
