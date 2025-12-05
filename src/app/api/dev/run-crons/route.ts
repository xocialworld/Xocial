import { NextRequest, NextResponse } from 'next/server';
import { isDevelopment } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function call(path: string) {
  const headers: Record<string, string> = {};
  const secret = process.env.CRON_SECRET;
  if (secret) headers['authorization'] = `Bearer ${secret}`;
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${path}`, { headers, method: 'GET' });
  const json = await res.json().catch(() => ({ status: res.status }));
  return { path, status: res.status, body: json };
}

export async function GET(request: NextRequest) {
  if (!isDevelopment()) {
    return NextResponse.json({ error: 'Forbidden in production' }, { status: 403 });
  }

  const results = await Promise.all([
    call('/api/cron/publish'),
    call('/api/cron/sync-metrics'),
    call('/api/cron/refresh-youtube-tokens'),
    call('/api/cron/sync-youtube-analytics'),
    call('/api/cron/refresh-tokens'),
  ]);

  return NextResponse.json({ success: true, results, timestamp: new Date().toISOString() });
}

