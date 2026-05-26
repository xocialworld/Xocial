import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const PORT = Number(process.env.PORT || 8080);
const WORKER_SECRET = process.env.VIDEO_WORKER_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!WORKER_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required worker environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function authorized(req) {
  const auth = req.headers.authorization || '';
  return auth === `Bearer ${WORKER_SECRET}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundedEven(value) {
  const rounded = Math.max(2, Math.round(value));
  return rounded % 2 === 0 ? rounded : rounded - 1;
}

function buildCrop(input) {
  const sourceWidth = Number(input.source?.width || 0);
  const sourceHeight = Number(input.source?.height || 0);
  const crop = input.crop || {};

  const width = roundedEven(clamp(Number(crop.width || sourceWidth), 2, sourceWidth || 99999));
  const height = roundedEven(clamp(Number(crop.height || sourceHeight), 2, sourceHeight || 99999));
  const x = roundedEven(clamp(Number(crop.x || 0), 0, Math.max(0, sourceWidth - width)));
  const y = roundedEven(clamp(Number(crop.y || 0), 0, Math.max(0, sourceHeight - height)));

  return { x, y, width, height };
}

async function updateJob(jobId, patch) {
  const { error } = await supabase
    .from('media_processing_jobs')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (error) {
    console.error('Failed to update job', jobId, error);
  }
}

async function downloadSource(job, dir) {
  const storagePath = job.input?.source?.storagePath;
  if (!storagePath) throw new Error('Source storage path missing');

  const { data, error } = await supabase.storage.from('media').download(storagePath);
  if (error || !data) {
    throw new Error(error?.message || 'Failed to download source media');
  }

  const sourceName = job.input?.source?.fileName || 'source-video';
  const ext = path.extname(sourceName) || '.mp4';
  const inputPath = path.join(dir, `source${ext}`);
  const bytes = Buffer.from(await data.arrayBuffer());
  await writeFile(inputPath, bytes);
  return inputPath;
}

function runFfmpeg({ inputPath, outputPath, crop, targetWidth, targetHeight }) {
  return new Promise((resolve, reject) => {
    const filter = [
      `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}`,
      `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase`,
      `crop=${targetWidth}:${targetHeight}`,
      'setsar=1',
    ].join(',');

    const args = [
      '-y',
      '-i',
      inputPath,
      '-map',
      '0:v:0',
      '-map',
      '0:a?',
      '-vf',
      filter,
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-profile:v',
      'high',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      outputPath,
    ];

    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0 && existsSync(outputPath)) {
        resolve();
      } else {
        reject(new Error(stderr || `ffmpeg exited with code ${code}`));
      }
    });
  });
}

async function processReelCrop(jobId) {
  const workDir = path.join(tmpdir(), `xocial-reel-${jobId}`);

  try {
    await updateJob(jobId, { status: 'processing', progress: 10 });
    await mkdir(workDir, { recursive: true });

    const { data: job, error } = await supabase
      .from('media_processing_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      throw new Error(error?.message || 'Job not found');
    }

    const inputPath = await downloadSource(job, workDir);
    await updateJob(jobId, { progress: 35 });

    const targetWidth = Number(job.input?.target?.width || 1080);
    const targetHeight = Number(job.input?.target?.height || 1920);
    const crop = buildCrop(job.input);
    const outputPath = path.join(workDir, 'instagram-reel-9x16.mp4');

    await runFfmpeg({ inputPath, outputPath, crop, targetWidth, targetHeight });
    await updateJob(jobId, { progress: 75 });

    const outputBuffer = await readFile(outputPath);
    const safeName = String(job.input?.source?.fileName || 'reel.mp4')
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '_');
    const storagePath = `${job.workspace_id}/processed/reels/${Date.now()}_${safeName}_9x16.mp4`;

    const { error: uploadError } = await supabase.storage.from('media').upload(storagePath, outputBuffer, {
      contentType: 'video/mp4',
      upsert: false,
    });
    if (uploadError) throw new Error(uploadError.message);

    const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(storagePath);
    const publicUrl = publicUrlData.publicUrl;

    const { data: mediaAsset, error: mediaError } = await supabase
      .from('media_assets')
      .insert({
        workspace_id: job.workspace_id,
        file_name: `${safeName}_9x16.mp4`,
        storage_path: storagePath,
        file_type: 'video',
        mime_type: 'video/mp4',
        size_bytes: outputBuffer.length,
        width: targetWidth,
        height: targetHeight,
        tags: ['processed', 'instagram-reel', '9:16'],
        uploaded_by: job.user_id,
        url: publicUrl,
      })
      .select('id, url, storage_path, file_name, size_bytes, width, height')
      .single();

    if (mediaError || !mediaAsset) {
      throw new Error(mediaError?.message || 'Failed to create processed media asset');
    }

    await updateJob(jobId, {
      status: 'completed',
      progress: 100,
      output_media_asset_id: mediaAsset.id,
      output: {
        mediaAsset,
        crop,
        target: { width: targetWidth, height: targetHeight, format: 'mp4' },
      },
      completed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Reel crop job failed', jobId, error);
    await updateJob(jobId, {
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Video crop failed',
    });
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      return sendJson(res, 200, { success: true, service: 'xocial-video-processing-worker' });
    }

    if (req.method === 'POST' && req.url === '/jobs/reel-crop') {
      if (!authorized(req)) {
        return sendJson(res, 401, { success: false, error: { message: 'Unauthorized' } });
      }

      const body = await readJson(req);
      if (!body.jobId) {
        return sendJson(res, 400, { success: false, error: { message: 'jobId is required' } });
      }

      sendJson(res, 202, { success: true, jobId: body.jobId });
      void processReelCrop(body.jobId);
      return;
    }

    sendJson(res, 404, { success: false, error: { message: 'Not found' } });
  } catch (error) {
    console.error('Worker request failed', error);
    sendJson(res, 500, {
      success: false,
      error: { message: error instanceof Error ? error.message : 'Worker request failed' },
    });
  }
});

server.listen(PORT, () => {
  console.log(`Xocial video processing worker listening on :${PORT}`);
});
