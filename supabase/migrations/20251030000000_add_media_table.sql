-- ============================================
-- Media Management System Migration
-- Idempotent and rerunnable
-- ============================================

-- Media table for storing uploaded files
CREATE TABLE IF NOT EXISTS public.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image', 'video'
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL, -- in bytes
  storage_path TEXT NOT NULL, -- Supabase storage path
  url TEXT NOT NULL, -- Public URL
  thumbnail_url TEXT, -- Thumbnail for videos
  width INTEGER,
  height INTEGER,
  duration INTEGER, -- For videos (in seconds)
  alt_text TEXT,
  title TEXT,
  tags TEXT[], -- Array of tags for search
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for media (idempotent)
CREATE INDEX IF NOT EXISTS idx_media_workspace ON public.media(workspace_id);
CREATE INDEX IF NOT EXISTS idx_media_uploaded_by ON public.media(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_media_file_type ON public.media(file_type);
CREATE INDEX IF NOT EXISTS idx_media_created_at ON public.media(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_tags ON public.media USING GIN(tags);

-- Enable RLS on media (idempotent - no error if already enabled)
DO $$ 
BEGIN
  ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view media in their workspace" ON public.media;
DROP POLICY IF EXISTS "Users can upload media to their workspace" ON public.media;
DROP POLICY IF EXISTS "Users can update their own media" ON public.media;
DROP POLICY IF EXISTS "Users can delete their own media" ON public.media;

-- RLS Policies for media
CREATE POLICY "Users can view media in their workspace"
  ON public.media FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload media to their workspace"
  ON public.media FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own media"
  ON public.media FOR UPDATE
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users can delete their own media"
  ON public.media FOR DELETE
  USING (uploaded_by = auth.uid());

-- Create or replace the trigger function (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at (idempotent)
DROP TRIGGER IF EXISTS update_media_updated_at ON public.media;
CREATE TRIGGER update_media_updated_at
  BEFORE UPDATE ON public.media
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Post media junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0, -- Order of media in post
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, media_id)
);

-- Create indexes for post_media
CREATE INDEX IF NOT EXISTS idx_post_media_post ON public.post_media(post_id);
CREATE INDEX IF NOT EXISTS idx_post_media_media ON public.post_media(media_id);

-- Enable RLS on post_media (idempotent)
DO $$ 
BEGIN
  ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can view post media" ON public.post_media;
DROP POLICY IF EXISTS "Users can manage post media" ON public.post_media;

-- RLS Policies for post_media
CREATE POLICY "Users can view post media"
  ON public.post_media FOR SELECT
  USING (
    post_id IN (
      SELECT id FROM public.posts
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage post media"
  ON public.post_media FOR ALL
  USING (
    post_id IN (
      SELECT id FROM public.posts
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================
-- Migration Complete
-- This migration is now idempotent and can be safely rerun
-- ============================================