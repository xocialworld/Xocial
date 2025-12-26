-- Add content_item_id and content_variant_id to platform_posts
-- This links publishing results to the planner model

-- First, check if platform_posts table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'platform_posts'
  ) THEN
    -- Add content_item_id column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'platform_posts' 
        AND column_name = 'content_item_id'
    ) THEN
      ALTER TABLE platform_posts 
      ADD COLUMN content_item_id UUID REFERENCES content_items(id) ON DELETE SET NULL;
    END IF;

    -- Add content_variant_id column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'platform_posts' 
        AND column_name = 'content_variant_id'
    ) THEN
      ALTER TABLE platform_posts 
      ADD COLUMN content_variant_id UUID REFERENCES content_variants(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_platform_posts_content_item 
  ON platform_posts(content_item_id) WHERE content_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_platform_posts_content_variant 
  ON platform_posts(content_variant_id) WHERE content_variant_id IS NOT NULL;

-- Add unique constraint for content_variant_id + platform (for upsert)
-- Only add if platform_posts exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'platform_posts'
  ) THEN
    -- Drop existing constraint if it exists (to avoid errors)
    ALTER TABLE platform_posts 
    DROP CONSTRAINT IF EXISTS platform_posts_variant_platform_unique;
    
    -- Add the constraint
    ALTER TABLE platform_posts 
    ADD CONSTRAINT platform_posts_variant_platform_unique 
    UNIQUE (content_variant_id, platform);
  END IF;
EXCEPTION
  WHEN others THEN
    -- Ignore errors (constraint might already exist differently)
    RAISE NOTICE 'Could not add unique constraint: %', SQLERRM;
END $$;

