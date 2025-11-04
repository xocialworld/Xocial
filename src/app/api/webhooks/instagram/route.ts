import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

    // Log webhook event
    const supabase = await createClient();
    await supabase.from('webhook_events').insert({
      platform: 'instagram',
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
async function processChange(change: any) {
  const supabase = await createClient();

  try {
    switch (change.field) {
      case 'comments':
        // New comment on media
        if (change.value?.media_id) {
          await handleNewComment(change.value);
        }
        break;

      case 'mentions':
        // User mentioned in a story or post
        if (change.value?.media_id) {
          await handleMention(change.value);
        }
        break;

      default:
        console.log('Unhandled Instagram webhook field:', change.field);
    }

    // Mark as processed
    await supabase
      .from('webhook_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('payload->entry->0->id', change.value?.media_id);
  } catch (error) {
    console.error('Failed to process Instagram change:', error);
  }
}

/**
 * Handle new comment
 */
async function handleNewComment(value: any) {
  console.log('New Instagram comment:', value);
  // Trigger real-time notification
}

/**
 * Handle mention
 */
async function handleMention(value: any) {
  console.log('Instagram mention:', value);
  // Trigger real-time notification
}

