/**
 * Strategy Generation API
 * Generate AI-powered strategy recommendations
 * POST /api/strategy/generate
 */

import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  requireAuth,
  successResponse,
  getUserWorkspace,
  APIError,
} from '@/lib/api-middleware';
import { runStrategyAnalysis } from '@/lib/ai/strategy-engine';
import { logger } from '@/lib/logger';

/**
 * POST /api/strategy/generate
 * Generate new strategy recommendations for the workspace
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const { user } = await requireAuth(request);
  
  // Get user's workspace
  const workspace = await getUserWorkspace(user.id);

  logger.info('Generating strategy recommendations', {
    userId: user.id,
    workspaceId: workspace.id,
  });

  // Run strategy analysis
  const { performanceData, recommendations } = await runStrategyAnalysis(workspace.id);

  if (!performanceData) {
    throw new APIError(500, 'Failed to analyze performance data', 'ANALYSIS_FAILED');
  }

  logger.info('Strategy recommendations generated', {
    userId: user.id,
    workspaceId: workspace.id,
    recommendationCount: recommendations.length,
  });

  return successResponse({
    performanceData,
    recommendations,
    generatedAt: new Date().toISOString(),
  });
});

