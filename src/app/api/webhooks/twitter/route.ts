import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { verifyWebhookSignature } from '@/lib/security';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Twitter webhook CRC (Challenge Response Check)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const crcToken = searchParams.get('crc_token');

  if (!crcToken) {
    return new NextResponse('Missing crc_token', { status: 400 });
  }

  const consumerSecret = process.env.TWITTER_CLIENT_SECRET;
  if (!consumerSecret) {
    return new NextResponse('Server configuration error', { status: 500 });
  }

  // Generate response token
  const responseToken = createHmac('sha256', consumerSecret)
    .update(crcToken)
    .digest('base64');

  return NextResponse.json({
    response_token: `sha256=${responseToken}`,
  });
}

/**
 * Twitter webhook event handler (POST)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-twitter-webhooks-signature');

    // Verify webhook signature
    if (!verifySignature(body, signature)) {
      return new NextResponse('Invalid signature', { status: 403 });
    }

    const event = JSON.parse(body);

    // Log webhook event
    const supabase = await createClient();
    await supabase.from('webhook_events').insert({
      platform: 'twitter',
      event_type: determineEventType(event),
      payload: event,
      processed: false,
    });

    // Process events
    await processTwitterEvent(event);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Twitter webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

/**
 * Verify Twitter webhook signature
 */
function verifySignature(body: string, signature: string | null): boolean {
  if (!signature) return false;

  const consumerSecret = process.env.TWITTER_CLIENT_SECRET;
  if (!consumerSecret) return false;

  const expectedSignature = 'sha256=' + createHmac('sha256', consumerSecret)
    .update(body)
    .digest('base64');

  return signature === expectedSignature;
}

/**
 * Determine Twitter event type
 */
function determineEventType(event: any): string {
  if (event.tweet_create_events) return 'tweet_create';
  if (event.tweet_delete_events) return 'tweet_delete';
  if (event.favorite_events) return 'like';
  if (event.follow_events) return 'follow';
  if (event.direct_message_events) return 'direct_message';
  return 'unknown';
}

/**
 * Process Twitter webhook event
 */
async function processTwitterEvent(event: any) {
  const supabase = await createClient();

  try {
    // Handle favorite (like) events
    if (event.favorite_events) {
      for (const favorite of event.favorite_events) {
        await updateTweetEngagement(favorite.favorited_status);
      }
    }

    // Handle retweet events (in tweet_create_events)
    if (event.tweet_create_events) {
      for (const tweet of event.tweet_create_events) {
        if (tweet.retweeted_status) {
          await updateTweetEngagement(tweet.retweeted_status);
        }
      }
    }

    // Mark as processed
    await supabase
      .from('webhook_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('platform', 'twitter')
      .eq('processed', false)
      .limit(1);
  } catch (error) {
    console.error('Failed to process Twitter event:', error);
  }
}

/**
 * Update tweet engagement metrics
 */
async function updateTweetEngagement(tweet: any) {
  const supabase = await createClient();

  // Find platform post
  const { data: platformPost } = await supabase
    .from('platform_posts')
    .select('id')
    .eq('platform', 'twitter')
    .eq('platform_post_id', tweet.id_str)
    .single();

  if (!platformPost) {
    return;
  }

  // Insert engagement history
  await supabase.from('engagement_history').insert({
    platform_post_id: platformPost.id,
    likes: tweet.favorite_count || 0,
    comments: tweet.reply_count || 0,
    shares: tweet.retweet_count || 0,
    views: tweet.impression_count || 0,
  });
}

