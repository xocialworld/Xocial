import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseServiceClient } from '@supabase/supabase-js';
import { verifyWebhookSignature } from '@/lib/security';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Instagram webhook verification (GET)
 * Instagram uses Facebook's webhook verification
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || 'xocial_instagram_webhook_2025';

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('Instagram webhook verified');
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

/**
 * Instagram webhook event handler (POST)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // Verify webhook signature
    if (!verifySignature(body, signature)) {
      return new NextResponse('Invalid signature', { status: 403 });
    }

    const event = JSON.parse(body);

    const supabase = getServiceSupabaseClient();

    const { data: loggedEvent } = await supabase
      .from('webhook_events')
      .insert({
      platform: 'instagram',
      event_type: event.object || 'unknown',
      payload: event,
      processed: false,
      })
      .select('id')
      .single();

    // Process webhook events
    if (event.entry) {
      for (const entry of event.entry) {
        if (entry.changes) {
          for (const change of entry.changes) {
            await processChange(entry.id, change);
          }
        }
      }
    }

    if (loggedEvent?.id) {
      await supabase
        .from('webhook_events')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('id', loggedEvent.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Instagram webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

/**
 * Verify Instagram webhook signature (same as Facebook)
 * Now using centralized security utility
 */
function verifySignature(body: string, signature: string | null): boolean {
  if (!signature) return false;

  const appSecret = process.env.FACEBOOK_APP_SECRET; // Instagram uses Facebook app secret
  if (!appSecret) return false;

  return verifyWebhookSignature(body, signature, appSecret);
}

/**
 * Process Instagram webhook change event
 */
async function processChange(instagramAccountId: string, change: any) {
  const supabase = getServiceSupabaseClient();

  try {
    switch (change.field) {
      case 'comments':
        // New comment on media
        if (change.value?.media_id) {
          await handleNewComment(supabase, instagramAccountId, change.value);
        }
        break;

      case 'mentions':
        // User mentioned in a story or post
        if (change.value?.media_id) {
          await handleMention(instagramAccountId, change.value);
        }
        break;

      default:
        console.log('Unhandled Instagram webhook field:', change.field);
    }
  } catch (error) {
    console.error('Failed to process Instagram change:', error);
  }
}

/**
 * Handle new comment
 */
async function handleNewComment(
  supabase: ReturnType<typeof getServiceSupabaseClient>,
  instagramAccountId: string,
  value: any
) {
  console.log('New Instagram comment:', value);

  if (!value.comment_id) {
    return;
  }

  const { data: account } = await supabase
    .from('social_accounts')
    .select('id, access_token')
    .eq('platform', 'instagram')
    .eq('account_id', instagramAccountId)
    .maybeSingle();

  if (!account || !account.access_token) {
    logger.warn('Instagram webhook: account not found for comment event', { instagramAccountId });
    return;
  }

  const { data: platformPost } = await supabase
    .from('platform_posts')
    .select('id, post_id')
    .eq('platform', 'instagram')
    .eq('platform_post_id', value.media_id)
    .maybeSingle();

  if (!platformPost) {
    logger.warn('Instagram webhook: platform post not found for media', { media_id: value.media_id });
    return;
  }

  const authorName =
    value.from?.username || value.from?.full_name || value.from?.name || 'Instagram User';

  const commentPayload = {
    post_id: platformPost.post_id,
    external_comment_id: value.comment_id,
    platform: 'instagram',
    author_name: authorName,
    author_avatar: value.from?.profile_picture_url || null,
    author_id: value.from?.id || null,
    content: value.text || '',
    is_reply: Boolean(value.parent_id),
    likes: value.like_count ?? 0,
    reply_count: value.reply_count ?? 0,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from('comments')
    .select('id')
    .eq('external_comment_id', value.comment_id)
    .eq('platform', 'instagram')
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from('comments')
      .update(commentPayload)
      .eq('id', existing.id);
  } else {
    await supabase.from('comments').insert({
      ...commentPayload,
      created_at: new Date().toISOString(),
    });
  }
}

/**
 * Handle mention
 */
async function handleMention(instagramAccountId: string, value: any) {
  console.log('Instagram mention:', { instagramAccountId, value });
  // Future enhancement: fetch media details and notify workspace members
}

function getServiceSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration is missing for webhook processing');
  }

  return createSupabaseServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

