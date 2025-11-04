-- ============================================
-- Strategy and Templates System Migration
-- Idempotent and rerunnable
-- ============================================

-- Templates table for saving reusable content
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  content JSONB NOT NULL, -- Platform-specific content
  category TEXT DEFAULT 'general', -- 'promotional', 'educational', 'engagement', etc.
  platforms TEXT[] NOT NULL, -- Array of platform names
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  tags TEXT[], -- For search/filtering
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for templates
CREATE INDEX IF NOT EXISTS idx_templates_workspace ON public.templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON public.templates(created_by);
CREATE INDEX IF NOT EXISTS idx_templates_category ON public.templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_tags ON public.templates USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON public.templates(created_at DESC);

-- Enable RLS on templates
DO $$ 
BEGIN
  ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view templates in their workspace" ON public.templates;
DROP POLICY IF EXISTS "Users can create templates" ON public.templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON public.templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON public.templates;

-- RLS Policies for templates
CREATE POLICY "Users can view templates in their workspace"
  ON public.templates FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    ) OR is_public = TRUE
  );

CREATE POLICY "Users can create templates"
  ON public.templates FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own templates"
  ON public.templates FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own templates"
  ON public.templates FOR DELETE
  USING (created_by = auth.uid());

-- Trigger to update updated_at for templates
DROP TRIGGER IF EXISTS update_templates_updated_at ON public.templates;
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Strategy cache table for AI recommendations
CREATE TABLE IF NOT EXISTS public.strategy_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL, -- 'weekly', 'best_times', 'content_ideas', 'insights'
  data JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

-- Create indexes for strategy_cache
CREATE INDEX IF NOT EXISTS idx_strategy_cache_workspace ON public.strategy_cache(workspace_id);
CREATE INDEX IF NOT EXISTS idx_strategy_cache_type ON public.strategy_cache(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_strategy_cache_expires ON public.strategy_cache(expires_at);

-- Enable RLS on strategy_cache
DO $$ 
BEGIN
  ALTER TABLE public.strategy_cache ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view strategy cache" ON public.strategy_cache;
DROP POLICY IF EXISTS "System can manage strategy cache" ON public.strategy_cache;

-- RLS Policies for strategy_cache
CREATE POLICY "Users can view strategy cache"
  ON public.strategy_cache FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage strategy cache"
  ON public.strategy_cache FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Function to clean up expired strategy cache
CREATE OR REPLACE FUNCTION cleanup_expired_strategy_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.strategy_cache
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Migration Complete
-- ============================================

