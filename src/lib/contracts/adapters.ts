import { unwrapEnvelope } from './api';

export function normalizeAccountPostsResponse(payload: any) {
  const data = unwrapEnvelope<any>(payload);
  return {
    posts: data?.posts || payload?.posts || [],
    hasMore: Boolean(data?.hasMore ?? data?.has_more ?? payload?.hasMore ?? payload?.has_more),
    nextCursor:
      data?.nextCursor ?? data?.next_cursor ?? payload?.nextCursor ?? payload?.next_cursor ?? null,
  };
}

export function normalizeCalendarResponse(payload: any) {
  const data = unwrapEnvelope<any>(payload);
  return {
    entries: data?.entries || data?.posts || payload?.entries || payload?.posts || [],
    count: data?.count ?? data?.total ?? payload?.count ?? payload?.total ?? 0,
  };
}

export function normalizeCommentsResponse(payload: any) {
  const data = unwrapEnvelope<any>(payload);
  return {
    comments: data?.comments || payload?.comments || [],
    threads: data?.threads || payload?.threads || [],
    total: data?.total ?? payload?.total ?? 0,
  };
}
