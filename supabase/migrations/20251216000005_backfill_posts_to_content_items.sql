-- Backfill migration: Convert existing posts to content_items + content_variants
-- This migration preserves original posts rows for rollback capability
-- Run this AFTER the schema migrations have been applied

-- Step 1: Migrate posts to content_items
-- Only migrate posts that don't already have a corresponding content_item
INSERT INTO content_items (
  id,
  workspace_id,
  title,
  brief,
  status,
  scheduled_at,
  drafted_at,
  created_by,
  created_at,
  updated_at
)
SELECT
  p.id,
  p.workspace_id,
  -- Extract title from metadata or use first 100 chars of content
  COALESCE(
    (p.metadata->>'title')::TEXT,
    LEFT(
      COALESCE(
        (p.content->>'text')::TEXT,
        (p.content->>p.platforms[1])::TEXT,
        ''
      ),
      100
    )
  ) AS title,
  -- Brief from metadata
  (p.metadata->>'brief')::TEXT AS brief,
  -- Map status
  CASE p.status
    WHEN 'pending_approval' THEN 'in_review'
    WHEN 'approved' THEN 'approved'
    WHEN 'scheduled' THEN 'scheduled'
    WHEN 'published' THEN 'published'
    WHEN 'failed' THEN 'rejected'
    WHEN 'rejected' THEN 'rejected'
    ELSE 'draft'
  END AS status,
  p.scheduled_at,
  COALESCE(p.created_at, NOW()) AS drafted_at,
  COALESCE(
    p.created_by,
    (
      SELECT user_id 
      FROM workspace_members 
      WHERE workspace_id = p.workspace_id AND role = 'owner' 
      LIMIT 1
    )
  ) AS created_by,
  p.created_at,
  p.updated_at
FROM posts p
WHERE NOT EXISTS (
  SELECT 1 FROM content_items ci WHERE ci.id = p.id
)
-- Only migrate internal posts (not imported external posts)
AND (p.external_post_id IS NULL OR p.external_post_id = '');

-- Step 2: Create content_variants for each platform in the post
-- This creates one variant per platform per post
DO $$
DECLARE
  post_record RECORD;
  platform_name TEXT;
  platform_content JSONB;
  caption_text TEXT;
BEGIN
  -- Loop through posts that were migrated to content_items
  FOR post_record IN 
    SELECT p.* 
    FROM posts p
    INNER JOIN content_items ci ON ci.id = p.id
    WHERE (p.external_post_id IS NULL OR p.external_post_id = '')
  LOOP
    -- Loop through each platform
    IF post_record.platforms IS NOT NULL AND array_length(post_record.platforms, 1) > 0 THEN
      FOREACH platform_name IN ARRAY post_record.platforms
      LOOP
        -- Try to get platform-specific content, fall back to generic content
        platform_content := post_record.content->platform_name;
        IF platform_content IS NULL THEN
          platform_content := post_record.content;
        END IF;
        
        -- Extract caption
        caption_text := COALESCE(
          (platform_content->>'text')::TEXT,
          (platform_content->>'caption')::TEXT,
          (post_record.content->>'text')::TEXT,
          ''
        );
        
        -- Check if variant already exists
        IF NOT EXISTS (
          SELECT 1 FROM content_variants cv 
          WHERE cv.content_item_id = post_record.id 
          AND cv.platform = platform_name
        ) THEN
          -- Insert variant
          INSERT INTO content_variants (
            content_item_id,
            social_account_id,
            platform,
            caption,
            media_ids,
            hashtags,
            mentions,
            platform_specific,
            status,
            scheduled_at,
            published_at,
            created_at,
            updated_at
          ) VALUES (
            post_record.id,
            post_record.social_account_id,
            platform_name,
            caption_text,
            ARRAY[]::UUID[], -- media_ids would need separate migration
            COALESCE(
              (SELECT array_agg(h) FROM jsonb_array_elements_text(platform_content->'hashtags') h),
              ARRAY[]::TEXT[]
            ),
            COALESCE(
              (SELECT array_agg(m) FROM jsonb_array_elements_text(platform_content->'mentions') m),
              ARRAY[]::TEXT[]
            ),
            COALESCE(platform_content->'platform_specific', '{}'::JSONB),
            CASE post_record.status
              WHEN 'published' THEN 'published'
              WHEN 'scheduled' THEN 'scheduled'
              WHEN 'approved' THEN 'ready'
              WHEN 'failed' THEN 'failed'
              ELSE 'draft'
            END,
            post_record.scheduled_at,
            post_record.published_at,
            post_record.created_at,
            post_record.updated_at
          );
        END IF;
      END LOOP;
    ELSE
      -- Post has no platforms specified, create a single generic variant
      IF NOT EXISTS (
        SELECT 1 FROM content_variants cv 
        WHERE cv.content_item_id = post_record.id
      ) THEN
        INSERT INTO content_variants (
          content_item_id,
          social_account_id,
          platform,
          caption,
          media_ids,
          status,
          scheduled_at,
          published_at,
          created_at,
          updated_at
        ) VALUES (
          post_record.id,
          post_record.social_account_id,
          'generic',
          COALESCE((post_record.content->>'text')::TEXT, ''),
          ARRAY[]::UUID[],
          CASE post_record.status
            WHEN 'published' THEN 'published'
            WHEN 'scheduled' THEN 'scheduled'
            WHEN 'approved' THEN 'ready'
            WHEN 'failed' THEN 'failed'
            ELSE 'draft'
          END,
          post_record.scheduled_at,
          post_record.published_at,
          post_record.created_at,
          post_record.updated_at
        );
      END IF;
    END IF;
  END LOOP;
END $$;

-- Step 3: Migrate external posts to external_posts table
-- Only if they don't already exist there
INSERT INTO external_posts (
  workspace_id,
  social_account_id,
  platform,
  external_post_id,
  permalink,
  content,
  media,
  post_type,
  published_at,
  metrics,
  created_at,
  updated_at
)
SELECT DISTINCT ON (p.social_account_id, p.platforms[1], p.external_post_id)
  p.workspace_id,
  p.social_account_id,
  p.platforms[1] AS platform, -- Use first platform
  p.external_post_id,
  -- Try to construct permalink
  COALESCE(
    (p.metadata->>'permalink')::TEXT,
    CASE p.platforms[1]
      WHEN 'youtube' THEN 'https://youtube.com/watch?v=' || p.external_post_id
      WHEN 'twitter' THEN 'https://twitter.com/i/status/' || p.external_post_id
      ELSE NULL
    END
  ) AS permalink,
  jsonb_build_object(
    'text', COALESCE((p.content->>'text')::TEXT, ''),
    'caption', COALESCE((p.content->>'text')::TEXT, '')
  ) AS content,
  COALESCE(to_jsonb(p.media), '[]'::JSONB) AS media,
  (p.metadata->>'post_type')::TEXT AS post_type,
  p.published_at,
  COALESCE(p.metadata->'metrics', '{}'::JSONB) AS metrics,
  p.created_at,
  p.updated_at
FROM posts p
WHERE p.external_post_id IS NOT NULL 
  AND p.external_post_id != ''
  AND p.social_account_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM external_posts ep 
    WHERE ep.social_account_id = p.social_account_id 
      AND ep.external_post_id = p.external_post_id
      -- Note: verification of platform would be ideal but relying on ID + account is stronger
  )
ORDER BY p.social_account_id, p.platforms[1], p.external_post_id, p.updated_at DESC
ON CONFLICT (social_account_id, platform, external_post_id) DO NOTHING;

-- Step 4: Log migration results
DO $$
DECLARE
  items_count INTEGER;
  variants_count INTEGER;
  external_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO items_count FROM content_items;
  SELECT COUNT(*) INTO variants_count FROM content_variants;
  SELECT COUNT(*) INTO external_count FROM external_posts;
  
  RAISE NOTICE 'Migration complete: % content_items, % content_variants, % external_posts',
    items_count, variants_count, external_count;
END $$;

