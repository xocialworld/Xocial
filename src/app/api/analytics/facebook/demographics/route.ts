import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/api-middleware';
import { requireWorkspaceContext } from '@/lib/workspace-context';
import { createFacebookClient } from '@/lib/platforms/facebook';

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics/facebook/demographics
 * Fetch Facebook page demographics (age, gender, location)
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { userClient: supabase, workspace } = await requireWorkspaceContext(request);
  
  // Get Facebook account
  const { data: account } = await supabase
    .from('social_accounts')
    .select('id')
    .eq('workspace_id', workspace.id)
    .eq('platform', 'facebook')
    .eq('is_active', true)
    .single();
  
  if (!account) {
    return successResponse({ demographics: null, message: 'No Facebook account connected' });
  }
  
  const client = await createFacebookClient(account.id);
  const demographics = await client.getPageDemographics();
  
  return successResponse({ demographics });
});
