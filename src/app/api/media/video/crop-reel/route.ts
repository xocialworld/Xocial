import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { z } from 'zod';
import { APIError, handleAPIError } from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const cropSchema = z.object({
  sourceMediaAssetId: z.string().uuid(),
  crop: z.object({
    x: z.number().min(0),
    y: z.number().min(0),
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  targetWidth: z.number().int().positive().default(1080),
  targetHeight: z.number().int().positive().default(1920),
});

type ServiceClient = Awaited<ReturnType<typeof requireWorkspaceContext>>['serviceClient'];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundedEven(value: number) {
  const rounded = Math.max(2, Math.round(value));
  return rounded % 2 === 0 ? rounded : rounded - 1;
}

function buildCrop(input: any) {
  const sourceWidth = Number(input.source?.width || 0);
  const sourceHeight = Number(input.source?.height || 0);
  const crop = input.crop || {};

  const width = roundedEven(clamp(Number(crop.width || sourceWidth), 2, sourceWidth || 99999));
  const height = roundedEven(clamp(Number(crop.height || sourceHeight), 2, sourceHeight || 99999));
  const x = roundedEven(clamp(Number(crop.x || 0), 0, Math.max(0, sourceWidth - width)));
  const y = roundedEven(clamp(Number(crop.y || 0), 0, Math.max(0, sourceHeight - height)));

  return { x, y, width, height };
}

async function updateJob(serviceClient: ServiceClient, jobId: string, patch: Record<string, unknown>) {
  const { error } = await serviceClient
    .from('media_processing_jobs')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (error) {
    throw new Error(error.message || 'Failed to update crop job');
  }
}

async function downloadSource(serviceClient: ServiceClient, job: any, dir: string) {
  const storagePath = job.input?.source?.storagePath;
  if (!storagePath) throw new Error('Source storage path missing');

  const { data, error } = await serviceClient.storage.from('media').download(storagePath);
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

function runFfmpeg({
  inputPath,
  outputPath,
  crop,
  targetWidth,
  targetHeight,
}: {
  inputPath: string;
  outputPath: string;
  crop: { x: number; y: number; width: number; height: number };
  targetWidth: number;
  targetHeight: number;
}) {
  const binaryPath = ffmpegPath;
  if (!binaryPath) {
    throw new Error('FFmpeg binary is not available in this deployment');
  }

  return new Promise<void>((resolve, reject) => {
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

    const child = spawn(binaryPath, args, { stdio: ['ignore', 'ignore', 'pipe'] as const });
    let stderr = '';

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code: number | null) => {
      if (code === 0 && existsSync(outputPath)) {
        resolve();
      } else {
        reject(new Error(stderr || `FFmpeg exited with code ${code}`));
      }
    });
  });
}

async function processReelCrop(serviceClient: ServiceClient, jobId: string) {
  const workDir = path.join(tmpdir(), `xocial-reel-${jobId}`);

  try {
    await updateJob(serviceClient, jobId, { status: 'processing', progress: 10 });
    await mkdir(workDir, { recursive: true });

    const { data: job, error } = await serviceClient
      .from('media_processing_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      throw new Error(error?.message || 'Job not found');
    }

    const inputPath = await downloadSource(serviceClient, job, workDir);
    await updateJob(serviceClient, jobId, { progress: 35 });

    const targetWidth = Number(job.input?.target?.width || 1080);
    const targetHeight = Number(job.input?.target?.height || 1920);
    const crop = buildCrop(job.input);
    const outputPath = path.join(workDir, 'instagram-reel-9x16.mp4');

    await runFfmpeg({ inputPath, outputPath, crop, targetWidth, targetHeight });
    await updateJob(serviceClient, jobId, { progress: 75 });

    const outputBuffer = await readFile(outputPath);
    const safeName = String(job.input?.source?.fileName || 'reel.mp4')
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '_');
    const storagePath = `${job.workspace_id}/processed/reels/${Date.now()}_${safeName}_9x16.mp4`;

    const { error: uploadError } = await serviceClient.storage.from('media').upload(storagePath, outputBuffer, {
      contentType: 'video/mp4',
      upsert: false,
    });
    if (uploadError) throw new Error(uploadError.message);

    const { data: publicUrlData } = serviceClient.storage.from('media').getPublicUrl(storagePath);
    const publicUrl = publicUrlData.publicUrl;

    const { data: mediaAsset, error: mediaError } = await serviceClient
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

    await updateJob(serviceClient, jobId, {
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

    const { data: completedJob, error: completedError } = await serviceClient
      .from('media_processing_jobs')
      .select('id, status, progress, input, output, error_message, output_media_asset_id, created_at, updated_at, completed_at')
      .eq('id', jobId)
      .single();

    if (completedError || !completedJob) {
      throw new Error(completedError?.message || 'Failed to read completed crop job');
    }

    return completedJob;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Video crop failed';
    await updateJob(serviceClient, jobId, {
      status: 'failed',
      progress: 100,
      error_message: message,
    }).catch(() => undefined);
    throw new Error(message);
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, serviceClient, workspace } = await requireWorkspaceContext(request, {
      roles: ['owner', 'admin', 'manager', 'creator'],
    });
    const body = cropSchema.parse(await request.json());

    const { data: sourceAsset, error: sourceError } = await serviceClient
      .from('media_assets')
      .select('id, workspace_id, storage_path, file_name, file_type, mime_type, size_bytes, url, width, height')
      .eq('id', body.sourceMediaAssetId)
      .eq('workspace_id', workspace.id)
      .maybeSingle();

    if (sourceError || !sourceAsset) {
      throw new APIError(404, 'Source video not found in this workspace', 'SOURCE_MEDIA_NOT_FOUND');
    }

    if (sourceAsset.file_type !== 'video') {
      throw new APIError(400, 'Reel crop source must be a video asset', 'SOURCE_MEDIA_NOT_VIDEO');
    }

    const input = {
      source: {
        mediaAssetId: sourceAsset.id,
        storagePath: sourceAsset.storage_path,
        fileName: sourceAsset.file_name,
        mimeType: sourceAsset.mime_type,
        sizeBytes: sourceAsset.size_bytes,
        url: sourceAsset.url,
        width: sourceAsset.width,
        height: sourceAsset.height,
      },
      crop: body.crop,
      target: {
        width: body.targetWidth,
        height: body.targetHeight,
        format: 'mp4',
      },
    };

    const { data: job, error: jobError } = await serviceClient
      .from('media_processing_jobs')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        source_media_asset_id: sourceAsset.id,
        job_type: 'instagram_reel_crop',
        status: 'queued',
        progress: 0,
        input,
      })
      .select('id, status, progress, input, output, error_message, output_media_asset_id, created_at, updated_at, completed_at')
      .single();

    if (jobError || !job) {
      throw new APIError(500, jobError?.message || 'Failed to create crop job', 'JOB_CREATE_FAILED');
    }

    const completedJob = await processReelCrop(serviceClient, job.id);

    return NextResponse.json({ success: true, job: completedJob });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleAPIError(new APIError(400, 'Invalid crop job request', 'VALIDATION_ERROR', error.flatten()));
    }
    return handleAPIError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const jobId = request.nextUrl.searchParams.get('jobId');
    if (!jobId) {
      throw new APIError(400, 'jobId is required', 'MISSING_JOB_ID');
    }

    const { serviceClient, workspace } = await requireWorkspaceContext(request);
    const { data: job, error } = await serviceClient
      .from('media_processing_jobs')
      .select(
        'id, status, progress, input, output, error_message, source_media_asset_id, output_media_asset_id, created_at, updated_at, completed_at'
      )
      .eq('id', jobId)
      .eq('workspace_id', workspace.id)
      .maybeSingle();

    if (error || !job) {
      throw new APIError(404, 'Crop job not found', 'JOB_NOT_FOUND');
    }

    return NextResponse.json({ success: true, job });
  } catch (error) {
    return handleAPIError(error);
  }
}
