/**
 * Health Check Endpoint
 * Used by monitoring services to verify app health
 * 
 * GET /api/health
 * Returns 200 OK if healthy, 503 if unhealthy
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Health check endpoint
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const checks: Record<string, { status: 'ok' | 'error'; message?: string; duration?: number }> = {};

  try {
    // Check 1: Database connectivity
    try {
      const dbCheckStart = Date.now();
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
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
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
      ];

      const missing = requiredEnvVars.filter((v) => !process.env[v]);

      checks.environment = {
        status: missing.length === 0 ? 'ok' : 'error',
        message: missing.length === 0 
          ? 'All required variables present' 
          : `Missing: ${missing.join(', ')}`,
      };
    } catch (error: any) {
      checks.environment = {
        status: 'error',
        message: error.message,
      };
    }

    // Check 3: OpenAI API (optional)
    if (process.env.OPENAI_API_KEY) {
      checks.openai = {
        status: 'ok',
        message: 'API key configured',
      };
    } else {
      checks.openai = {
        status: 'error',
        message: 'API key not configured',
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
      environment: process.env.NODE_ENV,
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
}

// Prevent caching
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

