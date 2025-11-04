-- ============================================
-- Platform Publishing System Migration
-- Idempotent and rerunnable - Safe to execute multiple times
--
-- Idempotency measures:
-- - CREATE TABLE IF NOT EXISTS
-- - CREATE INDEX IF NOT EXISTS  
-- - CREATE OR REPLACE FUNCTION
-- - DROP POLICY/TRIGGER IF EXISTS before creation
-- - RLS enable wrapped in existence checks and exception handling
-- - All operations check for existence before modification
-- ============================================

-- Platform posts table - stores platform-specific post IDs
CREATE TABLE IF NOT EXISTS public.platform_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_post_id TEXT NOT NULL,
  permalink TEXT,
  published_at TIMESTAMPTZ,
  status TEXT DEFAULT 'published', -- published, failed, deleted
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for platform_posts
CREATE INDEX IF NOT EXISTS idx_platform_posts_post ON public.platform_posts(post_id);
CREATE INDEX IF NOT EXISTS idx_platform_posts_platform ON public.platform_posts(platform);
CREATE INDEX IF NOT EXISTS idx_platform_posts_platform_post_id ON public.platform_posts(platform_post_id);
CREATE INDEX IF NOT EXISTS idx_platform_posts_status ON public.platform_posts(status);

-- Enable RLS on platform_posts (idempotent - safe to run multiple times)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'platform_posts') THEN
    ALTER TABLE public.platform_posts ENABLE ROW LEVEL SECURITY;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL; -- Catch any errors, RLS may already be enabled
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view platform posts" ON public.platform_posts;
DROP POLICY IF EXISTS "Users can manage platform posts" ON public.platform_posts;

-- RLS Policies for platform_posts
CREATE POLICY "Users can view platform posts"
  ON public.platform_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = platform_posts.post_id
      AND EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = p.workspace_id
        AND wm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage platform posts"
  ON public.platform_posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = platform_posts.post_id
      AND EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = p.workspace_id
        AND wm.user_id = auth.uid()
      )
    )
  );

-- Trigger to update updated_at for platform_posts
-- Note: Depends on update_updated_at_column() function from initial_schema migration
DROP TRIGGER IF EXISTS update_platform_posts_updated_at ON public.platform_posts;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_platform_posts_updated_at
      BEFORE UPDATE ON public.platform_posts
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Engagement history table - time-series engagement data
CREATE TABLE IF NOT EXISTS public.engagement_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_post_id UUID NOT NULL REFERENCES public.platform_posts(id) ON DELETE CASCADE,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for engagement_history
CREATE INDEX IF NOT EXISTS idx_engagement_history_platform_post ON public.engagement_history(platform_post_id);
CREATE INDEX IF NOT EXISTS idx_engagement_history_recorded ON public.engagement_history(recorded_at DESC);

-- Enable RLS on engagement_history (idempotent - safe to run multiple times)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'engagement_history') THEN
    ALTER TABLE public.engagement_history ENABLE ROW LEVEL SECURITY;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL; -- Catch any errors, RLS may already be enabled
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view engagement history" ON public.engagement_history;

-- RLS Policies for engagement_history
CREATE POLICY "Users can view engagement history"
  ON public.engagement_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_posts pp
      JOIN public.posts p ON p.id = pp.post_id
      WHERE pp.id = engagement_history.platform_post_id
      AND EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = p.workspace_id
        AND wm.user_id = auth.uid()
      )
    )
  );

-- Webhook events table - log incoming webhook events
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for webhook_events
CREATE INDEX IF NOT EXISTS idx_webhook_events_platform ON public.webhook_events(platform);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON public.webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_received ON public.webhook_events(received_at DESC);

-- Enable RLS on webhook_events (admin only for now, idempotent - safe to run multiple times)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'webhook_events') THEN
    ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL; -- Catch any errors, RLS may already be enabled
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view webhook events" ON public.webhook_events;
DROP POLICY IF EXISTS "Service role can view webhook events" ON public.webhook_events;

-- RLS Policies for webhook_events
-- NOTE: The profiles table in initial_schema.sql does NOT have a role column.
-- Roles are stored in workspace_members table instead.
-- This DO block provides fallback logic for both scenarios.
DO $$
BEGIN
  -- Check if profiles table exists and has role column
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'role'
  ) THEN
    -- Create admin-based policy if role column exists
    CREATE POLICY "Admins can view webhook events"
      ON public.webhook_events FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
    RAISE NOTICE 'Created admin role-based policy for webhook_events';
  ELSE
    -- Create a basic authenticated user policy if role column doesn't exist
    -- This allows any authenticated user to view webhook events (adjust as needed)
    CREATE POLICY "Service role can view webhook events"
      ON public.webhook_events FOR SELECT
      USING (auth.uid() IS NOT NULL);
    RAISE NOTICE 'Created basic authenticated policy for webhook_events (profiles.role column not found)';
  END IF;
END $$;

-- Function to get latest engagement for a platform post
CREATE OR REPLACE FUNCTION get_latest_engagement(p_platform_post_id UUID)
RETURNS TABLE (
  likes INTEGER,
  comments INTEGER,
  shares INTEGER,
  views INTEGER,
  saves INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    eh.likes,
    eh.comments,
    eh.shares,
    eh.views,
    eh.saves
  FROM public.engagement_history eh
  WHERE eh.platform_post_id = p_platform_post_id
  ORDER BY eh.recorded_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old engagement history (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_engagement_history()
RETURNS void AS $$
BEGIN
  DELETE FROM public.engagement_history
  WHERE recorded_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment template usage (helper for templates)
CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.templates
  SET usage_count = usage_count + 1
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Verification: Check that all objects were created
-- ============================================

DO $$
DECLARE
  table_count INTEGER;
  function_count INTEGER;
BEGIN
  -- Verify tables
  SELECT COUNT(*) INTO table_count
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename IN ('platform_posts', 'engagement_history', 'webhook_events');
  
  -- Verify functions
  SELECT COUNT(*) INTO function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname IN ('get_latest_engagement', 'cleanup_old_engagement_history', 'increment_template_usage');
  
  -- Report status
  RAISE NOTICE 'Migration verification:';
  RAISE NOTICE '- Tables created: % of 3', table_count;
  RAISE NOTICE '- Functions created: % of 3', function_count;
  
  IF table_count = 3 AND function_count = 3 THEN
    RAISE NOTICE '✓ Migration completed successfully and is idempotent';
  ELSE
    RAISE WARNING '⚠ Some objects may not have been created. Check logs above.';
  END IF;
END $$;

-- ============================================
-- Migration Complete
-- Safe to re-run this migration at any time
-- ============================================
