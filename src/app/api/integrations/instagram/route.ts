import { NextRequest, NextResponse } from "next/server";
import {
  withErrorHandler,
  APIError,
  successResponse
} from "@/lib/api-middleware";
import { requireWorkspaceContext } from "@/lib/workspace-context";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { workspace } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager'],
  });
  const connectUrl = new URL('/api/auth/connect', request.nextUrl.origin);
  connectUrl.searchParams.set('platform', 'instagram');
  connectUrl.searchParams.set('workspaceId', workspace.id);
  connectUrl.searchParams.set('redirect', '/x');

  return NextResponse.redirect(connectUrl);
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { user, userClient: supabase, workspace } = await requireWorkspaceContext(request, {
    roles: ['owner', 'admin', 'manager'],
  });

  const body = await request.json();
  const { accessToken, accountId, accountName } = body;

  if (!accessToken || !accountId) {
    throw new APIError(400, "Missing access token or account ID", "VALIDATION_ERROR");
  }

  // Save social account
  const { data, error } = await supabase
    .from("social_accounts")
    .upsert({
      workspace_id: workspace.id,
      platform: "instagram",
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
