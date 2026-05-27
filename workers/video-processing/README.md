# Xocial Video Processing Worker

Legacy dedicated FFmpeg worker for Instagram Reel crop jobs.

The main Xocial app now crops Reels inside `/api/media/video/crop-reel` with bundled FFmpeg, so Railway or a separate worker is not required for the standard deployment. Keep this worker only as an optional future escape hatch for very large production videos.

## Environment

```bash
PORT=8080
VIDEO_WORKER_SECRET=replace-with-shared-secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Run

```bash
npm install
npm start
```

The host must have `ffmpeg` available on `PATH`. The included Dockerfile installs FFmpeg.
