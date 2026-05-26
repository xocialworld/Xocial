# Xocial Video Processing Worker

Dedicated FFmpeg worker for Instagram Reel crop jobs.

## Environment

```bash
PORT=8080
VIDEO_WORKER_SECRET=replace-with-shared-secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

The main Xocial app must set:

```bash
VIDEO_WORKER_URL=https://your-worker-host
VIDEO_WORKER_SECRET=replace-with-shared-secret
```

## Run

```bash
npm install
npm start
```

The host must have `ffmpeg` available on `PATH`. The included Dockerfile installs FFmpeg.
