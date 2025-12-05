-- Add oauth_state to profiles if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'oauth_state'
    ) THEN
        ALTER TABLE profiles ADD COLUMN oauth_state JSONB;
    END IF;
END $$;

-- Ensure social_accounts has workspace_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'social_accounts'
        AND column_name = 'workspace_id'
    ) THEN
        ALTER TABLE social_accounts ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
    END IF;
END $$;
