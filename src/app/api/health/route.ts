/**
 * Health Check Endpoint
 * Used by monitoring services to verify app health
 * 
 * GET /api/health
 * Returns 200 OK if healthy, 503 if unhealthy
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withErrorHandler } from '@/lib/api-middleware';
import { env } from '@/lib/env';
import { hasAIGatewayAuth } from '@/lib/ai/gateway';

/**
 * Health check endpoint
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const startTime = Date.now();
  const checks: Record<string, { status: 'ok' | 'error'; message?: string; duration?: number }> = {};

  try {
    // Check 1: Database connectivity
    try {
      const dbCheckStart = Date.now();
      const supabase = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: { autoRefreshToken: false, persistSession: false },
        }
      );

      const { error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .single();

      checks.database = {
        status: error && error.code !== 'PGRST116' ? 'error' : 'ok',
        message: error && error.code !== 'PGRST116' ? error.message : 'Connected',
        duration: Date.now() - dbCheckStart,
      };
    } catch (error: any) {
      checks.database = {
        status: 'error',
        message: error.message || 'Connection failed',
      };
    }

    // Check 2: Environment variables
    try {
      const requiredEnvVars = [
        !!env.NEXT_PUBLIC_SUPABASE_URL,
        !!env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        !!env.SUPABASE_SERVICE_ROLE_KEY,
      ];

      const missingCount = requiredEnvVars.filter((v) => !v).length;

      checks.environment = {
        status: missingCount === 0 ? 'ok' : 'error',
        message: missingCount === 0 ? 'All required variables present' : 'Missing required environment variables',
      };
    } catch (error: any) {
      checks.environment = {
        status: 'error',
        message: error.message,
      };
    }

    // Check 3: Vercel AI Gateway
    try {
      if (hasAIGatewayAuth() || env.OPENAI_API_KEY) {
        const aiStart = Date.now();
        const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai/models`);
        const json = await res.json().catch(() => null);
        checks.aiGateway = {
          status: res.ok && json ? 'ok' : 'error',
          message: res.ok && json ? `Models: ${Array.isArray(json?.data?.models) ? json.data.models.length : 'unknown'}` : 'AI models endpoint unreachable',
          duration: Date.now() - aiStart,
        };
      } else {
        checks.aiGateway = {
          status: 'error',
          message: 'AI credentials missing',
        };
      }
    } catch (e: any) {
      checks.aiGateway = {
        status: 'error',
        message: e.message || 'Gateway check failed',
      };
    }

    // Check 4: Memory usage (Node.js)
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memory = process.memoryUsage();
      const usedMemoryMB = Math.round(memory.heapUsed / 1024 / 1024);
      const totalMemoryMB = Math.round(memory.heapTotal / 1024 / 1024);

      checks.memory = {
        status: usedMemoryMB < 400 ? 'ok' : 'error',
        message: `${usedMemoryMB}MB / ${totalMemoryMB}MB`,
      };
    }

    // Determine overall health
    const isHealthy = Object.values(checks).every(
      (check) => check.status === 'ok'
    );

    const totalDuration = Date.now() - startTime;

    const response = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: typeof process !== 'undefined' ? process.uptime() : undefined,
      environment: env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      checks,
      duration: totalDuration,
    };

    return NextResponse.json(response, {
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    console.error('[Health Check] Fatal error:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
        checks,
      },
      { status: 503 }
    );
  }
});

// Prevent caching
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
