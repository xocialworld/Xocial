-- Add url column to media_assets table
-- This column stores the public URL for the media asset

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'media_assets'
        AND column_name = 'url'
    ) THEN
        ALTER TABLE media_assets ADD COLUMN url TEXT;
    END IF;
END $$;

-- Update existing records to have URL (if you have storage_path values)
-- This uses the Supabase storage URL pattern
UPDATE media_assets 
SET url = CONCAT(
    (SELECT current_setting('app.supabase_url', true)),
    '/storage/v1/object/public/media/',
    storage_path
)
WHERE url IS NULL AND storage_path IS NOT NULL;
