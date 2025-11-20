-- Add post_type column to posts table
-- This migration is idempotent and can be run multiple times safely

DO $$ 
BEGIN
    -- Add post_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'posts' 
        AND column_name = 'post_type'
    ) THEN
        ALTER TABLE public.posts 
        ADD COLUMN post_type TEXT 
        CHECK (post_type IN ('feed', 'story', 'reel', 'video', 'carousel', 'tweet', 'article', 'short'));
        
        RAISE NOTICE 'Added post_type column to posts table';
    ELSE
        RAISE NOTICE 'post_type column already exists in posts table';
    END IF;
END $$;

-- Create index for post_type for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_post_type ON public.posts(post_type);

RAISE NOTICE 'Migration completed successfully';
