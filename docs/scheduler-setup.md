# Development Scheduler Setup

Vercel Hobby cron is not enough for exact-minute scheduled publishing. For the
development phase, run the protected scheduler from GitHub Actions or a local
worker.

## Option A: GitHub Actions Poller

1. Add repository secret `CRON_SECRET` with the same value as production Vercel.
2. Optional: add repository variable `APP_URL=https://www.xocial.world`.
3. Copy `docs/scheduled-publish-worker.yml.example` to
   `.github/workflows/scheduled-publish-worker.yml`.
4. Commit and push it using a GitHub token/user that has the `workflow` scope.

The workflow calls `/api/cron/publish` every 5 minutes and can also be run
manually with `workflow_dispatch`.

## Option B: Local Worker

Run this from the repo while testing schedules:

```bash
npm run scheduler:dev
```

For one manual scheduler tick:

```bash
npm run scheduler:once
```

The worker reads `CRON_SECRET` and `NEXT_PUBLIC_APP_URL` from `.env`, so it can
publish due posts on the deployed domain without Vercel Pro.
