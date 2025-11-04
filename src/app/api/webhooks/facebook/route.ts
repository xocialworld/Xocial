import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyWebhookSignature } from '@/lib/security';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Facebook webhook verification (GET)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN || 'xocial_webhook_token_2025';

  if (mode === 'subscribe' && token === verifyToken) {
    logger.info('Facebook webhook verified successfully');
    return new NextResponse(challenge, { status: 200 });
  }

  logger.warn('Facebook webhook verification failed', { mode, tokenMatch: token === verifyToken });
  return new NextResponse('Forbidden', { status: 403 });
}

/**
 * Facebook webhook event handler (POST)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // Verify webhook signature using security utility
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    if (!appSecret || !signature) {
      logger.warn('Facebook webhook missing credentials');
      return new NextResponse('Forbidden', { status: 403 });
    }

    if (!verifyWebhookSignature(body, signature, appSecret)) {
      logger.warn('Facebook webhook signature verification failed');
      return new NextResponse('Invalid signature', { status: 403 });
    }

    const event = JSON.parse(body);

    logger.info('Facebook webhook event received', {
      object: event.object,
      entryCount: event.entry?.length || 0,
    });

    // Log webhook event
    const supabase = await createClient();
    await supabase.from('webhook_events').insert({
      platform: 'facebook',
      event_type: event.object || 'unknown',
      payload: event,
      processed: false,
    });

    // Process webhook events
    if (event.entry) {
      for (const entry of event.entry) {
        if (entry.changes) {
          for (const change of entry.changes) {
            await processChange(change);
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Facebook webhook processing error', error as Error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

/**
 * Process Facebook webhook change event
 */
async function processChange(change: any) {
  const supabase = await createClient();

  try {
    switch (change.field) {
      case 'feed':
        // Post update (likes, comments, shares)
        if (change.value?.post_id) {
          await updatePostEngagement(change.value);
        }
        break;

      case 'comments':
        // New comment on post
        if (change.value?.post_id) {
          await handleNewComment(change.value);
        }
        break;

      case 'reactions':
        // New reaction on post
        if (change.value?.post_id) {
          await updatePostEngagement(change.value);
        }
        break;

      default:
        console.log('Unhandled Facebook webhook field:', change.field);
    }

    // Mark webhook as processed
    await supabase
      .from('webhook_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('payload->entry->0->id', change.value?.post_id);
  } catch (error) {
    console.error('Failed to process Facebook change:', error);
  }
}

/**
 * Update post engagement metrics
 */
async function updatePostEngagement(value: any) {
  const supabase = await createClient();

  // Find platform post
  const { data: platformPost } = await supabase
    .from('platform_posts')
    .select('id')
    .eq('platform', 'facebook')
    .eq('platform_post_id', value.post_id)
    .single();

  if (!platformPost) {
    console.log('Platform post not found for ID:', value.post_id);
    return;
  }

  // Insert engagement history record
  await supabase.from('engagement_history').insert({
    platform_post_id: platformPost.id,
    likes: value.reactions?.summary?.total_count || 0,
    comments: value.comments?.summary?.total_count || 0,
    shares: value.shares?.count || 0,
    views: value.impressions || 0,
  });
}

/**
 * Handle new comment notification
 */
async function handleNewComment(value: any) {
  // This would trigger real-time notifications to the user
  console.log('New comment received:', value);
}

