import { NextResponse } from 'next/server';

export type ApiErrorBody = {
  code: string;
  message: string;
  details?: unknown;
  hint?: string;
  correlationId?: string;
};

export type ApiMeta = {
  workspaceId?: string;
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    nextCursor?: string | null;
    hasMore?: boolean;
  };
  range?: { from?: string; to?: string };
  filters?: Record<string, unknown>;
  warnings?: string[];
};

export type ApiEnvelope<T, M = ApiMeta> =
  | { success: true; data: T; meta?: M }
  | { success: false; error: ApiErrorBody; meta?: M };

export function apiSuccess<T, M = ApiMeta>(
  data: T,
  meta?: M,
  init?: ResponseInit
): NextResponse<ApiEnvelope<T, M>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(meta ? { meta } : {}),
    } as ApiEnvelope<T, M>,
    init
  );
}

export function apiError(
  error: ApiErrorBody,
  status = 500,
  meta?: ApiMeta
): NextResponse<ApiEnvelope<never>> {
  return NextResponse.json(
    {
      success: false,
      error,
      ...(meta ? { meta } : {}),
    },
    { status }
  );
}

export function unwrapEnvelope<T = unknown>(payload: any): T {
  if (payload?.success === true && 'data' in payload) {
    return payload.data as T;
  }
  return payload as T;
}

export function getApiErrorMessage(payload: any, fallback = 'Request failed') {
  return payload?.error?.message || payload?.error || payload?.message || fallback;
}
