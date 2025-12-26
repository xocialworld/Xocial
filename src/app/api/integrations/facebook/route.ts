import { NextRequest, NextResponse } from "next/server";
import {
  withErrorHandler,
  requireAuth,
  getWorkspaceFromRequest,
  checkWorkspaceAccess,
  APIError,
  successResponse
} from "@/lib/api-middleware";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user } = await requireAuth(request);

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/facebook/callback`;
  const facebookAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${redirectUri}&scope=pages_show_list,pages_read_engagement,pages_manage_posts,pages_read_user_content`;

  return NextResponse.redirect(facebookAuthUrl);
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { user, supabase } = await requireAuth(request);

  const body = await request.json();
  const { accessToken, accountId, accountName } = body;

  if (!accessToken || !accountId) {
    throw new APIError(400, "Missing access token or account ID", "VALIDATION_ERROR");
  }

  // Get workspace ensuring access
  const workspace = await getWorkspaceFromRequest(user.id, request, supabase);

  // Verify permission to manage accounts
  const role = await checkWorkspaceAccess(user.id, workspace.id);

  if (!['owner', 'admin'].includes(role)) {
    throw new APIError(403, "You do not have permission to connect accounts", "FORBIDDEN");
  }

  // Save social account
  const { data, error } = await supabase
    .from("social_accounts")
    .upsert({
      workspace_id: workspace.id,
      platform: "facebook",
      account_id: accountId,
      account_name: accountName,
      access_token: accessToken,
      is_active: true,
      assigned_user_id: user.id,
      updated_at: new Date().toISOString()
    }, { onConflict: 'workspace_id,platform,account_id' })
    .select()
    .single();

  if (error) {
    throw new APIError(500, error.message, "DATABASE_ERROR");
  }

  return successResponse({ data });
});
